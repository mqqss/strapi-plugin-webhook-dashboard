import * as React from 'react';
import { Page, useFetchClient, useRBAC } from '@strapi/strapi/admin';
import { PLUGIN_ID } from '../pluginId';
import { PERMISSIONS } from '../permissions';
import type {
  AdminRole,
  WebhookButton,
  WebhookDashboard,
  WebhookDashboardButton,
  WebhookRun,
  WebhookSettings,
} from '../types';
import { getErrorMessage } from '../utils/getErrorMessage';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Field,
  Flex,
  Loader,
  Main,
  SingleSelect,
  SingleSelectOption,
  Textarea,
  TextInput,
  Toggle,
  Typography,
} from '@strapi/design-system';
import { CaretDown, CaretUp, Check, Pencil, Plus, Trash } from '@strapi/icons';

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `btn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
};

const createEmptyButton = (): WebhookButton => ({
  id: createId(),
  title: '',
  url: '',
  enabled: true,
  group: '',
  description: '',
  headers: '',
  body: '',
  authType: 'none',
  authToken: '',
  authUsername: '',
  authPassword: '',
  confirmRequired: false,
  confirmText: '',
  allowedRoleIds: [],
});

const templates: Array<{ label: string; patch: Partial<WebhookButton> }> = [
  {
    label: 'Vercel',
    patch: {
      title: '触发 Vercel 部署',
      group: '部署',
      description: '调用 Vercel Deploy Hook',
    },
  },
  {
    label: 'GitHub Actions',
    patch: {
      title: '触发 GitHub Workflow',
      group: '部署',
      description: '调用 GitHub workflow_dispatch API',
      headers: 'Accept: application/vnd.github+json\nX-GitHub-Api-Version: 2022-11-28',
      body: '{\n  "ref": "main"\n}',
      authType: 'bearer',
    },
  },
  {
    label: 'Cloudflare',
    patch: {
      title: '清理 Cloudflare 缓存',
      group: '缓存',
      description: '调用 Cloudflare Purge Cache API',
      headers: 'Content-Type: application/json',
      body: '{\n  "purge_everything": true\n}',
      authType: 'bearer',
      confirmRequired: true,
      confirmText: 'PURGE',
    },
  },
  {
    label: 'Slack',
    patch: {
      title: '发送 Slack 通知',
      group: '通知',
      description: '调用 Slack Incoming Webhook',
      headers: 'Content-Type: application/json',
      body: '{\n  "text": "Strapi webhook triggered"\n}',
    },
  },
];

const formatRunSummary = (run: WebhookRun) => {
  const status = run.status === 'success' ? '成功' : '失败';
  const code = run.statusCode ? ` ${run.statusCode}` : '';
  return `${status}${code} · ${run.durationMs}ms`;
};

const formatDateTime = (value: string) => {
  if (!value) {
    return '';
  }

  return new Date(value).toLocaleString();
};

const getConfirmation = (button: WebhookButton) => {
  if (!button.confirmRequired) {
    return true;
  }

  if (button.confirmText) {
    const value = window.prompt(`请输入 "${button.confirmText}" 确认触发 "${button.title}"`);
    return value === button.confirmText;
  }

  return window.confirm(`确认触发 "${button.title}"？`);
};

const getButtonSummary = (button: WebhookButton) => {
  const markers = [button.group || '未分组', button.enabled ? '启用' : '停用'];

  if (button.authType !== 'none') {
    markers.push(button.authType === 'bearer' ? 'Bearer' : 'Basic Auth');
  }

  if (button.confirmRequired) {
    markers.push('需确认');
  }

  if (button.allowedRoleIds.length) {
    markers.push(`限制 ${button.allowedRoleIds.length} 个角色`);
  }

  return markers.join(' · ');
};

const toReadonlyButton = (button: WebhookDashboardButton): WebhookButton => ({
  id: button.id,
  title: button.title,
  url: '',
  enabled: button.enabled,
  group: button.group,
  description: button.description,
  headers: '',
  body: '',
  authType: 'none',
  authToken: '',
  authUsername: '',
  authPassword: '',
  confirmRequired: button.confirmRequired,
  confirmText: button.confirmText,
  allowedRoleIds: [],
});

const SettingsPage = () => {
  const { get, put, post, del } = useFetchClient();
  const { allowedActions, isLoading: permissionsLoading, error: permissionsError } = useRBAC(
    PERMISSIONS.all
  );
  const canRead = Boolean(allowedActions.canRead);
  const canTrigger = Boolean(allowedActions.canTrigger);
  const canUpdateSettings = Boolean(allowedActions.canUpdate);
  const canClearHistory = Boolean(allowedActions.canClear);
  const [settings, setSettings] = React.useState<WebhookSettings>({ buttons: [] });
  const [roles, setRoles] = React.useState<AdminRole[]>([]);
  const [history, setHistory] = React.useState<WebhookRun[]>([]);
  const [expandedButtonId, setExpandedButtonId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [testingId, setTestingId] = React.useState<string | null>(null);
  const [clearingHistory, setClearingHistory] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const rolesById = React.useMemo(
    () => new Map(roles.map((role) => [role.id, role])),
    [roles]
  );

  const getRoleNames = React.useCallback(
    (roleIds: string[]) =>
      roleIds.map((roleId) => rolesById.get(roleId)?.name ?? roleId).join(', '),
    [rolesById]
  );

  const fetchHistory = React.useCallback(async () => {
    if (!canRead) {
      return;
    }

    if (canUpdateSettings) {
      const response = await get(`/${PLUGIN_ID}/history`, { params: { limit: 50 } });
      const data = response.data as { history?: WebhookRun[] };
      setHistory(data.history ?? []);
      return;
    }

    const response = await get(`/${PLUGIN_ID}/dashboard`, { params: { limit: 50 } });
    const data = response.data as WebhookDashboard;
    setHistory(data.history ?? []);
  }, [canRead, canUpdateSettings, get]);

  React.useEffect(() => {
    let active = true;

    const fetchSettings = async () => {
      if (permissionsLoading) {
        return;
      }

      if (!canRead) {
        setLoading(false);
        return;
      }

      try {
        if (!canUpdateSettings) {
          const dashboardResponse = await get(`/${PLUGIN_ID}/dashboard`, { params: { limit: 50 } });

          if (!active) {
            return;
          }

          const dashboard = dashboardResponse.data as WebhookDashboard;
          setSettings({ buttons: (dashboard.buttons ?? []).map(toReadonlyButton) });
          setHistory(dashboard.history ?? []);
          setRoles([]);
          return;
        }

        const [settingsResponse, historyResponse, rolesResponse] = await Promise.all([
          get(`/${PLUGIN_ID}/settings`),
          get(`/${PLUGIN_ID}/history`, { params: { limit: 50 } }),
          get(`/${PLUGIN_ID}/roles`),
        ]);

        if (!active) {
          return;
        }

        const historyData = historyResponse.data as { history?: WebhookRun[] };
        const rolesData = rolesResponse.data as { roles?: AdminRole[] };
        setSettings(settingsResponse.data as WebhookSettings);
        setHistory(historyData.history ?? []);
        setRoles(rolesData.roles ?? []);
      } catch (err) {
        if (!active) {
          return;
        }
        setError(getErrorMessage(err, '加载失败'));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchSettings();

    return () => {
      active = false;
    };
  }, [canRead, canUpdateSettings, get, permissionsLoading]);

  const updateButton = (id: string, patch: Partial<WebhookButton>) => {
    if (!canUpdateSettings) {
      return;
    }

    setSettings((prev) => ({
      buttons: prev.buttons.map((button) =>
        button.id === id ? { ...button, ...patch } : button
      ),
    }));
  };

  const handleAdd = (patch: Partial<WebhookButton> = {}) => {
    if (!canUpdateSettings) {
      return;
    }

    const button = { ...createEmptyButton(), ...patch };

    setSettings((prev) => ({
      buttons: [...prev.buttons, button],
    }));
    setExpandedButtonId(button.id);
  };

  const handleRemove = (id: string) => {
    if (!canUpdateSettings) {
      return;
    }

    setSettings((prev) => ({
      buttons: prev.buttons.filter((button) => button.id !== id),
    }));
    setExpandedButtonId((prev) => (prev === id ? null : prev));
  };

  const toggleButtonRole = (button: WebhookButton, roleId: string, checked: boolean) => {
    const nextRoleIds = checked
      ? [...new Set([...button.allowedRoleIds, roleId])]
      : button.allowedRoleIds.filter((item) => item !== roleId);

    updateButton(button.id, { allowedRoleIds: nextRoleIds });
  };

  const saveSettings = async (message = '已保存') => {
    if (!canUpdateSettings) {
      setError('当前角色没有修改 Webhook 设置的权限');
      return null;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await put(`/${PLUGIN_ID}/settings`, settings);
      const data = response.data as WebhookSettings;
      setSettings(data);
      setSuccess(message);
      return data;
    } catch (err) {
      setError(getErrorMessage(err));
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    await saveSettings();
  };

  const handleTest = async (button: WebhookButton) => {
    if (!canUpdateSettings || !canTrigger) {
      setError('当前角色没有保存并测试 Webhook 的权限');
      return;
    }

    if (!getConfirmation(button)) {
      return;
    }

    setTestingId(button.id);
    setError(null);
    setSuccess(null);

    try {
      const savedSettings = await saveSettings('已保存，正在测试');

      if (!savedSettings) {
        return;
      }

      const savedButton = savedSettings.buttons.find((item) => item.id === button.id);

      if (!savedButton) {
        setError('按钮保存后不存在，无法测试');
        return;
      }

      const result = await post(`/${PLUGIN_ID}/trigger`, {
        id: savedButton.id,
        confirmed: savedButton.confirmRequired,
      });
      const run = result.data as WebhookRun;

      setHistory((prev) => [run, ...prev.filter((item) => item.id !== run.id)].slice(0, 50));
      setSuccess(`测试完成：${formatRunSummary(run)}`);
    } catch (err) {
      setError(getErrorMessage(err, '测试失败'));
    } finally {
      setTestingId(null);
    }
  };

  const handleClearHistory = async () => {
    if (!canClearHistory) {
      setError('当前角色没有清空执行历史的权限');
      return;
    }

    if (!window.confirm('确认清空 Webhook 执行历史？')) {
      return;
    }

    setClearingHistory(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await del(`/${PLUGIN_ID}/history`);
      const data = response.data as { history?: WebhookRun[] };
      setHistory(data.history ?? []);
      setSuccess('执行历史已清空');
    } catch (err) {
      setError(getErrorMessage(err, '清空历史失败'));
    } finally {
      setClearingHistory(false);
    }
  };

  if (permissionsLoading) {
    return <Page.Loading>加载权限中...</Page.Loading>;
  }

  if (permissionsError) {
    return <Page.Error />;
  }

  if (!canRead) {
    return <Page.NoPermissions />;
  }

  if (loading) {
    return (
      <Main>
        <Flex justifyContent="center" alignItems="center" height="100vh">
          <Loader>加载中...</Loader>
        </Flex>
      </Main>
    );
  }

  return (
    <Main>
      <Box background="neutral100" padding={8} paddingBottom={0}>
        <Flex justifyContent="space-between" alignItems="center" gap={4} wrap="wrap">
          <Flex direction="column" alignItems="flex-start" gap={1}>
            <Typography variant="alpha" fontWeight="bold">
              Webhook Dashboard
            </Typography>
            <Typography variant="epsilon" textColor="neutral600">
              配置首页 Widget 的按钮、请求内容、认证方式和危险操作确认
            </Typography>
          </Flex>
          <Button
            onClick={handleSave}
            startIcon={<Check />}
            loading={saving}
            disabled={saving || !canUpdateSettings}
          >
            保存
          </Button>
        </Flex>
      </Box>

      <Box padding={8}>
        <Flex direction="column" alignItems="stretch" gap={4}>
          {error && (
            <Alert closeLabel="关闭" title="错误" variant="danger" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert closeLabel="关闭" title="成功" variant="success" onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}

          {!canUpdateSettings ? (
            <Alert closeLabel="关闭" title="只读模式" variant="default">
              当前角色只能查看允许访问的按钮和执行历史，完整配置需要 Update settings 权限。
            </Alert>
          ) : null}

          <Box background="neutral0" padding={6} shadow="filterShadow" hasRadius>
            <Flex direction="column" alignItems="stretch" gap={4}>
              <Flex justifyContent="space-between" alignItems="center" gap={4} wrap="wrap">
                <Flex direction="column" alignItems="flex-start" gap={1}>
                  <Typography variant="delta" fontWeight="bold">
                    Webhook 按钮
                  </Typography>
                  <Typography variant="pi" textColor="neutral600">
                    Headers 支持 JSON 对象，或每行一个 "Name: Value"。
                  </Typography>
                </Flex>

                <Flex gap={2} wrap="wrap">
                  {templates.map((template) => (
                    <Button
                      key={template.label}
                      onClick={() => handleAdd(template.patch)}
                      size="S"
                      variant="tertiary"
                      disabled={!canUpdateSettings}
                    >
                      {template.label}
                    </Button>
                  ))}
                  <Button
                    onClick={() => handleAdd()}
                    startIcon={<Plus />}
                    variant="secondary"
                    size="S"
                    disabled={!canUpdateSettings}
                  >
                    新增按钮
                  </Button>
                </Flex>
              </Flex>

              {settings.buttons.length > 0 ? (
                settings.buttons.map((button, index) => {
                  const isExpanded = expandedButtonId === button.id;

                  return (
                  <Box
                    key={button.id}
                    padding={4}
                    background="neutral100"
                    hasRadius
                    borderColor="neutral200"
                    borderStyle="solid"
                    borderWidth="1px"
                  >
                    <Flex direction="column" alignItems="stretch" gap={4}>
                      <Flex justifyContent="space-between" alignItems="center" gap={4} wrap="wrap">
                        <Flex direction="column" alignItems="flex-start" gap={1}>
                          <Typography variant="delta" fontWeight="bold">
                            {button.title || `按钮 ${index + 1}`}
                          </Typography>
                          <Typography variant="pi" textColor="neutral600">
                            {getButtonSummary(button)}
                          </Typography>
                          {button.url ? (
                            <Typography variant="pi" textColor="neutral500">
                              {button.url}
                            </Typography>
                          ) : null}
                        </Flex>

                        <Flex gap={2} wrap="wrap">
                          {canUpdateSettings ? (
                            <>
                              <Button
                                onClick={() =>
                                  setExpandedButtonId((prev) =>
                                    prev === button.id ? null : button.id
                                  )
                                }
                                startIcon={isExpanded ? <CaretUp /> : <Pencil />}
                                endIcon={isExpanded ? undefined : <CaretDown />}
                                variant={isExpanded ? 'tertiary' : 'secondary'}
                                size="S"
                              >
                                {isExpanded ? '收起' : '编辑'}
                              </Button>
                              <Button
                                onClick={() => handleTest(button)}
                                variant="secondary"
                                size="S"
                                loading={testingId === button.id}
                                disabled={saving || testingId === button.id || !canTrigger}
                              >
                                保存并测试
                              </Button>
                              <Button
                                onClick={() => handleRemove(button.id)}
                                startIcon={<Trash />}
                                variant="danger-light"
                                size="S"
                              >
                                删除
                              </Button>
                            </>
                          ) : null}
                        </Flex>
                      </Flex>

                      {isExpanded ? (
                        <>
                      <Flex gap={4} wrap="wrap" alignItems="flex-start">
                        <Box flex="1" minWidth="240px">
                          <Field.Root name={`button-title-${button.id}`}>
                            <Field.Label>按钮标题</Field.Label>
                            <TextInput
                              placeholder="例如：触发部署"
                              value={button.title}
                              disabled={!canUpdateSettings}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                updateButton(button.id, { title: e.target.value })
                              }
                            />
                          </Field.Root>
                        </Box>

                        <Box flex="1" minWidth="180px">
                          <Field.Root name={`button-group-${button.id}`}>
                            <Field.Label>分组</Field.Label>
                            <TextInput
                              placeholder="部署、缓存、通知"
                              value={button.group}
                              disabled={!canUpdateSettings}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                updateButton(button.id, { group: e.target.value })
                              }
                            />
                          </Field.Root>
                        </Box>
                      </Flex>

                      <Field.Root name={`button-url-${button.id}`}>
                        <Field.Label>Webhook 地址</Field.Label>
                        <TextInput
                          placeholder="https://example.com/webhook"
                          value={button.url}
                          disabled={!canUpdateSettings}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            updateButton(button.id, { url: e.target.value })
                          }
                        />
                      </Field.Root>

                      <Field.Root name={`button-description-${button.id}`}>
                        <Field.Label>描述</Field.Label>
                        <TextInput
                          placeholder="显示在首页按钮下方，便于解释这个操作"
                          value={button.description}
                          disabled={!canUpdateSettings}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            updateButton(button.id, { description: e.target.value })
                          }
                        />
                      </Field.Root>

                      <Flex gap={4} wrap="wrap" alignItems="flex-start">
                        <Box minWidth="160px">
                          <Field.Root name={`button-enabled-${button.id}`}>
                            <Field.Label>状态</Field.Label>
                            <Toggle
                              onLabel="启用"
                              offLabel="停用"
                              checked={button.enabled}
                              disabled={!canUpdateSettings}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                updateButton(button.id, { enabled: e.target.checked })
                              }
                            />
                          </Field.Root>
                        </Box>

                        <Box minWidth="200px">
                          <Field.Root name={`button-confirm-${button.id}`}>
                            <Field.Label>危险操作确认</Field.Label>
                            <Toggle
                              onLabel="需要"
                              offLabel="不需要"
                              checked={button.confirmRequired}
                              disabled={!canUpdateSettings}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                updateButton(button.id, { confirmRequired: e.target.checked })
                              }
                            />
                          </Field.Root>
                        </Box>

                        <Box flex="1" minWidth="240px">
                          <Field.Root name={`button-confirm-text-${button.id}`}>
                            <Field.Label>确认文本</Field.Label>
                            <TextInput
                              placeholder="例如：DEPLOY 或 PURGE"
                              value={button.confirmText}
                              disabled={!canUpdateSettings || !button.confirmRequired}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                updateButton(button.id, { confirmText: e.target.value })
                              }
                            />
                          </Field.Root>
                        </Box>
                      </Flex>

                      <Field.Root
                        name={`button-roles-${button.id}`}
                        hint="不选择角色时，任何拥有 Trigger webhooks 权限的后台角色都可以触发。"
                      >
                        <Field.Label>允许触发的角色</Field.Label>
                        <Flex
                          direction="column"
                          alignItems="stretch"
                          gap={2}
                          background="neutral0"
                          borderColor="neutral200"
                          borderStyle="solid"
                          borderWidth="1px"
                          hasRadius
                          padding={3}
                        >
                          {roles.length ? (
                            roles.map((role) => {
                              const checked = button.allowedRoleIds.includes(role.id);

                              return (
                                <Flex key={role.id} alignItems="center" gap={2}>
                                  <Checkbox
                                    aria-label={`允许 ${role.name} 触发`}
                                    checked={checked}
                                    disabled={!canUpdateSettings}
                                    onCheckedChange={(value) =>
                                      toggleButtonRole(button, role.id, value === true)
                                    }
                                  />
                                  <Typography variant="omega" textColor="neutral800">
                                    {role.name}
                                  </Typography>
                                </Flex>
                              );
                            })
                          ) : (
                            <Typography variant="pi" textColor="neutral600">
                              未读取到后台角色。
                            </Typography>
                          )}

                          {button.allowedRoleIds.length ? (
                            <Flex justifyContent="space-between" alignItems="center" gap={3}>
                              <Typography variant="pi" textColor="neutral600">
                                已限制：{getRoleNames(button.allowedRoleIds)}
                              </Typography>
                              <Button
                                size="S"
                                variant="tertiary"
                                disabled={!canUpdateSettings}
                                onClick={() => updateButton(button.id, { allowedRoleIds: [] })}
                              >
                                清空
                              </Button>
                            </Flex>
                          ) : (
                            <Typography variant="pi" textColor="neutral600">
                              当前允许所有有触发权限的角色。
                            </Typography>
                          )}
                        </Flex>
                        <Field.Hint />
                      </Field.Root>

                      <Flex gap={4} wrap="wrap" alignItems="flex-start">
                        <Box minWidth="220px">
                          <Field.Root name={`button-auth-${button.id}`}>
                            <Field.Label>认证方式</Field.Label>
                            <SingleSelect
                              aria-label="认证方式"
                              value={button.authType}
                              disabled={!canUpdateSettings}
                              onChange={(value) =>
                                updateButton(button.id, {
                                  authType: value as WebhookButton['authType'],
                                })
                              }
                            >
                              <SingleSelectOption value="none">无</SingleSelectOption>
                              <SingleSelectOption value="bearer">Bearer Token</SingleSelectOption>
                              <SingleSelectOption value="basic">Basic Auth</SingleSelectOption>
                            </SingleSelect>
                          </Field.Root>
                        </Box>

                        {button.authType === 'bearer' ? (
                          <Box flex="1" minWidth="260px">
                            <Field.Root name={`button-token-${button.id}`}>
                              <Field.Label>Bearer Token</Field.Label>
                              <TextInput
                                type="password"
                                placeholder="Token"
                                value={button.authToken}
                                disabled={!canUpdateSettings}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                  updateButton(button.id, { authToken: e.target.value })
                                }
                              />
                            </Field.Root>
                          </Box>
                        ) : null}

                        {button.authType === 'basic' ? (
                          <>
                            <Box flex="1" minWidth="220px">
                              <Field.Root name={`button-username-${button.id}`}>
                                <Field.Label>用户名</Field.Label>
                                <TextInput
                                  value={button.authUsername}
                                  disabled={!canUpdateSettings}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    updateButton(button.id, { authUsername: e.target.value })
                                  }
                                />
                              </Field.Root>
                            </Box>

                            <Box flex="1" minWidth="220px">
                              <Field.Root name={`button-password-${button.id}`}>
                                <Field.Label>密码</Field.Label>
                                <TextInput
                                  type="password"
                                  value={button.authPassword}
                                  disabled={!canUpdateSettings}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    updateButton(button.id, { authPassword: e.target.value })
                                  }
                                />
                              </Field.Root>
                            </Box>
                          </>
                        ) : null}
                      </Flex>

                      <Field.Root name={`button-headers-${button.id}`}>
                        <Field.Label>Headers</Field.Label>
                        <Textarea
                          placeholder={'Content-Type: application/json\nX-Custom-Token: xxx'}
                          value={button.headers}
                          disabled={!canUpdateSettings}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            updateButton(button.id, { headers: e.target.value })
                          }
                        />
                      </Field.Root>

                      <Field.Root name={`button-body-${button.id}`}>
                        <Field.Label>Body</Field.Label>
                        <Textarea
                          placeholder={'{\n  "event": "manual_trigger"\n}'}
                          value={button.body}
                          disabled={!canUpdateSettings}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            updateButton(button.id, { body: e.target.value })
                          }
                        />
                      </Field.Root>
                        </>
                      ) : null}
                    </Flex>
                  </Box>
                  );
                })
              ) : (
                <Box
                  padding={8}
                  background="neutral100"
                  hasRadius
                  borderColor="neutral200"
                  borderStyle="dashed"
                  borderWidth="1px"
                >
                  <Flex justifyContent="center">
                    <Typography variant="omega" textColor="neutral600">
                      还没有按钮，请先新增一个。
                    </Typography>
                  </Flex>
                </Box>
              )}
            </Flex>
          </Box>

          <Box background="neutral0" padding={6} shadow="filterShadow" hasRadius>
            <Flex direction="column" alignItems="stretch" gap={4}>
              <Flex justifyContent="space-between" alignItems="center" gap={4} wrap="wrap">
                <Flex direction="column" alignItems="flex-start" gap={1}>
                  <Typography variant="delta" fontWeight="bold">
                    最近执行历史
                  </Typography>
                  <Typography variant="pi" textColor="neutral600">
                    保存最近 50 条记录，包含触发人、状态码、耗时和响应摘要。
                  </Typography>
                </Flex>

                <Flex gap={2} wrap="wrap">
                  <Button onClick={fetchHistory} size="S" variant="secondary">
                    刷新
                  </Button>
                  <Button
                    onClick={handleClearHistory}
                    size="S"
                    variant="danger-light"
                    loading={clearingHistory}
                    disabled={clearingHistory || history.length === 0 || !canClearHistory}
                  >
                    清空
                  </Button>
                </Flex>
              </Flex>

              {history.length ? (
                <Flex direction="column" gap={3} alignItems="stretch">
                  {history.slice(0, 10).map((run) => (
                    <Box
                      key={run.id}
                      padding={3}
                      background="neutral100"
                      hasRadius
                      borderColor="neutral200"
                      borderStyle="solid"
                      borderWidth="1px"
                    >
                      <Flex direction="column" gap={1} alignItems="stretch">
                        <Flex justifyContent="space-between" alignItems="center" gap={3} wrap="wrap">
                          <Typography variant="omega" fontWeight="bold">
                            {run.buttonTitle}
                          </Typography>
                          <Typography
                            variant="pi"
                            textColor={run.status === 'success' ? 'success600' : 'danger600'}
                          >
                            {formatRunSummary(run)}
                          </Typography>
                        </Flex>

                        <Typography variant="pi" textColor="neutral600">
                          {run.group || '未分组'} · {run.triggeredBy} · {formatDateTime(run.triggeredAt)}
                        </Typography>

                        {run.error ? (
                          <Typography variant="pi" textColor="danger600">
                            {run.error}
                          </Typography>
                        ) : null}

                        {run.responsePreview ? (
                          <Typography variant="pi" textColor="neutral600">
                            {run.responsePreview}
                          </Typography>
                        ) : null}
                      </Flex>
                    </Box>
                  ))}
                </Flex>
              ) : (
                <Box padding={6} background="neutral100" hasRadius>
                  <Typography variant="omega" textColor="neutral600">
                    还没有执行记录。
                  </Typography>
                </Box>
              )}
            </Flex>
          </Box>
        </Flex>
      </Box>
    </Main>
  );
};

export default SettingsPage;
