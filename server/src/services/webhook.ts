import type { Core } from '@strapi/strapi';
import { PLUGIN_ID } from '../pluginId';

type WebhookAuthType = 'none' | 'bearer' | 'basic';
type WebhookRunStatus = 'success' | 'error';

type AdminRole = {
  id: string;
  name: string;
  code: string;
  description?: string;
};

type WebhookButton = {
  id: string;
  title: string;
  url: string;
  enabled: boolean;
  group: string;
  description: string;
  headers: string;
  body: string;
  authType: WebhookAuthType;
  authToken: string;
  authUsername: string;
  authPassword: string;
  confirmRequired: boolean;
  confirmText: string;
  allowedRoleIds: string[];
};

type WebhookSettings = {
  buttons: WebhookButton[];
};

type WebhookDashboardButton = Pick<
  WebhookButton,
  'id' | 'title' | 'enabled' | 'group' | 'description' | 'confirmRequired' | 'confirmText'
>;

type TriggerUser = {
  id?: number | string;
  firstname?: string;
  lastname?: string;
  username?: string;
  email?: string;
  roles?: AdminRole[];
};

type WebhookRun = {
  id: string;
  buttonId: string;
  buttonTitle: string;
  group: string;
  status: WebhookRunStatus;
  statusCode?: number;
  statusText?: string;
  durationMs: number;
  triggeredAt: string;
  triggeredBy: string;
  error?: string;
  responsePreview?: string;
};

type TriggerOptions = {
  confirmed?: boolean;
  user?: TriggerUser;
};

type WebhookDashboard = {
  buttons: WebhookDashboardButton[];
  history: WebhookRun[];
};

const SETTINGS_KEY = 'settings';
const HISTORY_KEY = 'history';
const HISTORY_LIMIT = 50;
const RESPONSE_PREVIEW_LIMIT = 1200;
const DEFAULT_SETTINGS: WebhookSettings = { buttons: [] };
const VALID_AUTH_TYPES = new Set<WebhookAuthType>(['none', 'bearer', 'basic']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const toStringValue = (value: unknown) => String(value ?? '').trim();

const toBooleanValue = (value: unknown, fallback: boolean) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }
  }

  return fallback;
};

const normalizeAuthType = (value: unknown): WebhookAuthType => {
  const authType = toStringValue(value).toLowerCase() as WebhookAuthType;
  return VALID_AUTH_TYPES.has(authType) ? authType : 'none';
};

const normalizeRoleIds = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map(toStringValue).filter(Boolean))];
};

const normalizeAdminRole = (input: unknown): AdminRole | null => {
  if (!isRecord(input)) {
    return null;
  }

  const id = toStringValue(input.id);
  const name = toStringValue(input.name);
  const code = toStringValue(input.code);

  if (!id || !name || !code) {
    return null;
  }

  return {
    id,
    name,
    code,
    description: toStringValue(input.description) || undefined,
  };
};

const normalizeButton = (input: unknown): WebhookButton => {
  const value = isRecord(input) ? input : {};

  return {
    id: toStringValue(value.id),
    title: toStringValue(value.title),
    url: toStringValue(value.url),
    enabled: toBooleanValue(value.enabled, true),
    group: toStringValue(value.group),
    description: toStringValue(value.description),
    headers: toStringValue(value.headers),
    body: typeof value.body === 'string' ? value.body : '',
    authType: normalizeAuthType(value.authType),
    authToken: toStringValue(value.authToken),
    authUsername: toStringValue(value.authUsername),
    authPassword: toStringValue(value.authPassword),
    confirmRequired: toBooleanValue(value.confirmRequired, false),
    confirmText: toStringValue(value.confirmText),
    allowedRoleIds: normalizeRoleIds(value.allowedRoleIds),
  };
};

const normalizeSettings = (input: unknown): WebhookSettings => {
  const value = isRecord(input) ? input : {};
  const buttons = Array.isArray(value.buttons) ? value.buttons.map(normalizeButton) : [];

  return { buttons };
};

const parseHeaders = (headersInput: string): Record<string, string> => {
  const trimmed = headersInput.trim();

  if (!trimmed) {
    return {};
  }

  if (trimmed.startsWith('{')) {
    const parsed = JSON.parse(trimmed) as unknown;

    if (!isRecord(parsed)) {
      throw new Error('Headers JSON 必须是对象');
    }

    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([key]) => key.trim())
        .map(([key, value]) => [key.trim(), String(value)])
    );
  }

  return trimmed.split(/\r?\n/).reduce<Record<string, string>>((acc, line, index) => {
    const item = line.trim();

    if (!item || item.startsWith('#')) {
      return acc;
    }

    const separatorIndex = item.indexOf(':');

    if (separatorIndex <= 0) {
      throw new Error(`Headers 第 ${index + 1} 行格式应为 "Name: Value"`);
    }

    const name = item.slice(0, separatorIndex).trim();
    const value = item.slice(separatorIndex + 1).trim();

    if (!name) {
      throw new Error(`Headers 第 ${index + 1} 行缺少名称`);
    }

    acc[name] = value;
    return acc;
  }, {});
};

const validateSettings = (settings: WebhookSettings) => {
  const ids = new Set<string>();

  settings.buttons.forEach((button, index) => {
    const label = `按钮 ${index + 1}`;

    if (!button.id) {
      throw new Error(`${label} 缺少 ID`);
    }

    if (ids.has(button.id)) {
      throw new Error(`按钮 ID 重复: ${button.id}`);
    }

    ids.add(button.id);

    if (!button.title) {
      throw new Error(`${label} 标题不能为空`);
    }

    if (!button.url) {
      throw new Error(`${label} URL 不能为空`);
    }

    if (!isHttpUrl(button.url)) {
      throw new Error(`${label} URL 无效: ${button.url}`);
    }

    try {
      parseHeaders(button.headers);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Headers 无效';
      throw new Error(`${label} ${message}`);
    }

    if (button.authType === 'bearer' && !button.authToken) {
      throw new Error(`${label} Bearer Token 不能为空`);
    }

    if (button.authType === 'basic' && (!button.authUsername || !button.authPassword)) {
      throw new Error(`${label} Basic Auth 用户名和密码不能为空`);
    }
  });
};

const createRunId = () => `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const createActorName = (user?: TriggerUser) => {
  if (!user) {
    return 'Unknown user';
  }

  const fullName = [user.firstname, user.lastname].filter(Boolean).join(' ').trim();
  return fullName || user.username || user.email || String(user.id ?? 'Unknown user');
};

const createPreview = (value: string) =>
  value.length > RESPONSE_PREVIEW_LIMIT
    ? `${value.slice(0, RESPONSE_PREVIEW_LIMIT)}...`
    : value;

const sanitizeDashboardButton = (button: WebhookButton): WebhookDashboardButton => ({
  id: button.id,
  title: button.title,
  enabled: button.enabled,
  group: button.group,
  description: button.description,
  confirmRequired: button.confirmRequired,
  confirmText: button.confirmText,
});

const buildRequestHeaders = (button: WebhookButton) => {
  const headers = parseHeaders(button.headers);

  if (button.authType === 'bearer') {
    headers.Authorization = `Bearer ${button.authToken}`;
  }

  if (button.authType === 'basic') {
    const token = Buffer.from(`${button.authUsername}:${button.authPassword}`).toString('base64');
    headers.Authorization = `Basic ${token}`;
  }

  if (button.body && !Object.keys(headers).some((key) => key.toLowerCase() === 'content-type')) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
};

const normalizeRun = (input: unknown): WebhookRun | null => {
  if (!isRecord(input)) {
    return null;
  }

  const status = input.status === 'success' ? 'success' : 'error';
  const statusCode =
    typeof input.statusCode === 'number' && Number.isFinite(input.statusCode)
      ? input.statusCode
      : undefined;

  return {
    id: toStringValue(input.id),
    buttonId: toStringValue(input.buttonId),
    buttonTitle: toStringValue(input.buttonTitle),
    group: toStringValue(input.group),
    status,
    statusCode,
    statusText: toStringValue(input.statusText) || undefined,
    durationMs:
      typeof input.durationMs === 'number' && Number.isFinite(input.durationMs)
        ? input.durationMs
        : 0,
    triggeredAt: toStringValue(input.triggeredAt),
    triggeredBy: toStringValue(input.triggeredBy) || 'Unknown user',
    error: toStringValue(input.error) || undefined,
    responsePreview: toStringValue(input.responsePreview) || undefined,
  };
};

const webhookService = ({ strapi }: { strapi: Core.Strapi }) => {
  const store = strapi.store({ type: 'plugin', name: PLUGIN_ID });
  const roleQuery = strapi.db.query('admin::role');
  const userQuery = strapi.db.query('admin::user');

  const getRoles = async (): Promise<AdminRole[]> => {
    const roles = (await roleQuery.findMany({
      orderBy: { name: 'asc' },
    } as never)) as unknown[];

    return roles
      .map(normalizeAdminRole)
      .filter((role): role is AdminRole => Boolean(role));
  };

  const getUserRoles = async (user?: TriggerUser): Promise<AdminRole[]> => {
    if (!user) {
      return [];
    }

    if (Array.isArray(user.roles)) {
      return user.roles
        .map(normalizeAdminRole)
        .filter((role): role is AdminRole => Boolean(role));
    }

    if (!user.id) {
      return [];
    }

    const dbUser = (await userQuery.findOne({
      where: { id: user.id },
      populate: ['roles'],
    } as never)) as { roles?: unknown[] } | null;

    return (dbUser?.roles ?? [])
      .map(normalizeAdminRole)
      .filter((role): role is AdminRole => Boolean(role));
  };

  const canAccessButton = async (button: WebhookButton, user?: TriggerUser) => {
    if (!button.allowedRoleIds.length) {
      return true;
    }

    const userRoleIds = new Set((await getUserRoles(user)).map((role) => role.id));
    return button.allowedRoleIds.some((roleId) => userRoleIds.has(roleId));
  };

  const filterButtonsForUser = async (buttons: WebhookButton[], user?: TriggerUser) => {
    const checks = await Promise.all(buttons.map((button) => canAccessButton(button, user)));
    return buttons.filter((_, index) => checks[index]);
  };

  const getSettings = async (): Promise<WebhookSettings> => {
    const stored = (await store.get({ key: SETTINGS_KEY })) as WebhookSettings | undefined;
    const normalized = normalizeSettings(stored);

    if (!normalized.buttons.length) {
      return DEFAULT_SETTINGS;
    }

    return {
      buttons: normalized.buttons.filter((button) =>
        Boolean(button.id && button.title && button.url && isHttpUrl(button.url))
      ),
    };
  };

  const updateSettings = async (input: unknown): Promise<WebhookSettings> => {
    const normalized = normalizeSettings(input);
    validateSettings(normalized);

    await store.set({ key: SETTINGS_KEY, value: normalized });

    return normalized;
  };

  const getHistory = async (limit = HISTORY_LIMIT): Promise<WebhookRun[]> => {
    const stored = (await store.get({ key: HISTORY_KEY })) as unknown;
    const history = Array.isArray(stored)
      ? stored.map(normalizeRun).filter((run): run is WebhookRun => Boolean(run?.id))
      : [];

    return history.slice(0, Math.max(0, Math.min(limit, HISTORY_LIMIT)));
  };

  const getDashboard = async (
    user?: TriggerUser,
    limit = HISTORY_LIMIT
  ): Promise<WebhookDashboard> => {
    const settings = await getSettings();
    const buttons = await filterButtonsForUser(
      settings.buttons.filter((button) => button.enabled),
      user
    );
    const visibleButtonIds = new Set(buttons.map((button) => button.id));
    const history = (await getHistory(limit)).filter((run) => visibleButtonIds.has(run.buttonId));

    return {
      buttons: buttons.map(sanitizeDashboardButton),
      history,
    };
  };

  const appendHistory = async (run: WebhookRun) => {
    const history = await getHistory(HISTORY_LIMIT);
    await store.set({ key: HISTORY_KEY, value: [run, ...history].slice(0, HISTORY_LIMIT) });
  };

  const clearHistory = async () => {
    await store.set({ key: HISTORY_KEY, value: [] });
    return [];
  };

  const trigger = async (buttonId: string, options: TriggerOptions = {}): Promise<WebhookRun> => {
    const settings = await getSettings();
    const button = settings.buttons.find((item) => item.id === buttonId);

    if (!button) {
      throw new Error('按钮不存在');
    }

    if (!button.enabled) {
      throw new Error('按钮已停用');
    }

    if (!(await canAccessButton(button, options.user))) {
      throw new Error('当前角色没有触发该按钮的权限');
    }

    if (button.confirmRequired && !options.confirmed) {
      throw new Error('该按钮需要确认后才能触发');
    }

    const startedAt = Date.now();
    const triggeredAt = new Date(startedAt).toISOString();
    const headers = buildRequestHeaders(button);
    let run: WebhookRun;

    try {
      const response = await fetch(button.url, {
        method: 'POST',
        headers,
        body: button.body ? button.body : undefined,
      });
      const durationMs = Date.now() - startedAt;
      const responseText = await response.text().catch(() => '');

      run = {
        id: createRunId(),
        buttonId: button.id,
        buttonTitle: button.title,
        group: button.group,
        status: response.ok ? 'success' : 'error',
        statusCode: response.status,
        statusText: response.statusText,
        durationMs,
        triggeredAt,
        triggeredBy: createActorName(options.user),
        error: response.ok ? undefined : `HTTP ${response.status} ${response.statusText}`,
        responsePreview: responseText ? createPreview(responseText) : undefined,
      };
    } catch (error) {
      run = {
        id: createRunId(),
        buttonId: button.id,
        buttonTitle: button.title,
        group: button.group,
        status: 'error',
        durationMs: Date.now() - startedAt,
        triggeredAt,
        triggeredBy: createActorName(options.user),
        error: error instanceof Error ? error.message : '触发失败',
      };
    }

    await appendHistory(run);
    return run;
  };

  return {
    getDashboard,
    getRoles,
    getSettings,
    updateSettings,
    getHistory,
    clearHistory,
    trigger,
  };
};

export default webhookService;
