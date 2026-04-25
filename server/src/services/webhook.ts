import type { Core } from '@strapi/strapi';
import { PLUGIN_ID } from '../pluginId';

type WebhookButton = {
  id: string;
  title: string;
  url: string;
};

type WebhookSettings = {
  buttons: WebhookButton[];
};

const SETTINGS_KEY = 'settings';
const DEFAULT_SETTINGS: WebhookSettings = { buttons: [] };

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const normalizeButton = (input: unknown): WebhookButton => {
  const value = input as Partial<WebhookButton>;

  return {
    id: String(value?.id ?? '').trim(),
    title: String(value?.title ?? '').trim(),
    url: String(value?.url ?? '').trim(),
  };
};

const normalizeSettings = (input: unknown): WebhookSettings => {
  const value = input as Partial<WebhookSettings>;
  const buttons = Array.isArray(value?.buttons) ? value.buttons.map(normalizeButton) : [];

  return { buttons };
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
  });
};

const webhookService = ({ strapi }: { strapi: Core.Strapi }) => {
  const store = strapi.store({ type: 'plugin', name: PLUGIN_ID });

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

  const trigger = async (buttonId: string) => {
    const settings = await getSettings();
    const button = settings.buttons.find((item) => item.id === buttonId);

    if (!button) {
      throw new Error('按钮不存在');
    }

    const response = await fetch(button.url, { method: 'POST' });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    return {
      ok: true,
      status: response.status,
    };
  };

  return {
    getSettings,
    updateSettings,
    trigger,
  };
};

export default webhookService;
