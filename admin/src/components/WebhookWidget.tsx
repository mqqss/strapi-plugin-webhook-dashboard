import * as React from 'react';
import { useFetchClient, useRBAC } from '@strapi/strapi/admin';
import { Alert, Box, Button, Flex, Loader, Typography } from '@strapi/design-system';
import { PLUGIN_ID } from '../pluginId';
import { PERMISSIONS } from '../permissions';
import type { WebhookDashboard, WebhookDashboardButton, WebhookRun } from '../types';
import { getErrorMessage } from '../utils/getErrorMessage';

type StatusState = {
  type: 'loading' | 'success' | 'error';
  message: string;
};

const WIDGET_PERMISSIONS = [...PERMISSIONS.read, ...PERMISSIONS.trigger];

const getStatusColor = (status: StatusState['type']) => {
  if (status === 'success') {
    return 'success600';
  }

  if (status === 'error') {
    return 'danger600';
  }

  return 'neutral500';
};

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

const groupButtons = (buttons: WebhookDashboardButton[]) =>
  buttons.reduce<Record<string, WebhookDashboardButton[]>>((acc, button) => {
    const group = button.group || '未分组';
    acc[group] = [...(acc[group] ?? []), button];
    return acc;
  }, {});

const getConfirmation = (button: WebhookDashboardButton) => {
  if (!button.confirmRequired) {
    return true;
  }

  if (button.confirmText) {
    const value = window.prompt(`请输入 "${button.confirmText}" 确认触发 "${button.title}"`);
    return value === button.confirmText;
  }

  return window.confirm(`确认触发 "${button.title}"？`);
};

const WebhookWidget = () => {
  const { get, post } = useFetchClient();
  const { allowedActions, isLoading: permissionsLoading, error: permissionsError } =
    useRBAC(WIDGET_PERMISSIONS);
  const canRead = Boolean(allowedActions.canRead);
  const canTrigger = Boolean(allowedActions.canTrigger);
  const [loading, setLoading] = React.useState(true);
  const [buttons, setButtons] = React.useState<WebhookDashboardButton[]>([]);
  const [history, setHistory] = React.useState<WebhookRun[]>([]);
  const [error, setError] = React.useState<Error | null>(null);
  const [statusMap, setStatusMap] = React.useState<Record<string, StatusState>>({});

  React.useEffect(() => {
    let active = true;

    const fetchDashboard = async () => {
      if (permissionsLoading) {
        return;
      }

      if (!canRead) {
        setLoading(false);
        return;
      }

      try {
        const response = await get(`/${PLUGIN_ID}/dashboard`, { params: { limit: 50 } });

        if (!active) {
          return;
        }

        const data = response.data as WebhookDashboard;
        setButtons(data.buttons ?? []);
        setHistory(data.history ?? []);
      } catch (err) {
        if (!active) {
          return;
        }
        setError(err instanceof Error ? err : new Error('加载失败'));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchDashboard();

    return () => {
      active = false;
    };
  }, [canRead, get, permissionsLoading]);

  const lastRunByButton = React.useMemo(
    () =>
      history.reduce<Record<string, WebhookRun>>((acc, run) => {
        if (!acc[run.buttonId]) {
          acc[run.buttonId] = run;
        }

        return acc;
      }, {}),
    [history]
  );

  const handleTrigger = async (button: WebhookDashboardButton) => {
    if (!canTrigger) {
      setStatusMap((prev) => ({
        ...prev,
        [button.id]: { type: 'error', message: '没有触发权限' },
      }));
      return;
    }

    if (!getConfirmation(button)) {
      return;
    }

    setStatusMap((prev) => ({
      ...prev,
      [button.id]: { type: 'loading', message: '触发中...' },
    }));

    try {
      const result = await post(`/${PLUGIN_ID}/trigger`, {
        id: button.id,
        confirmed: button.confirmRequired,
      });
      const run = result.data as WebhookRun;

      setHistory((prev) => [run, ...prev.filter((item) => item.id !== run.id)].slice(0, 50));
      setStatusMap((prev) => ({
        ...prev,
        [button.id]: {
          type: run.status === 'success' ? 'success' : 'error',
          message: formatRunSummary(run),
        },
      }));
    } catch (err) {
      setStatusMap((prev) => ({
        ...prev,
        [button.id]: { type: 'error', message: getErrorMessage(err) },
      }));
    }
  };

  if (permissionsLoading || loading) {
    return (
      <Flex justifyContent="center" alignItems="center" height="100%" minHeight="100px">
        <Loader>加载中...</Loader>
      </Flex>
    );
  }

  if (permissionsError || error) {
    return (
      <Box padding={4}>
        <Alert closeLabel="关闭" title="错误" variant="danger">
          {permissionsError ? '权限加载失败' : error?.message}
        </Alert>
      </Box>
    );
  }

  if (!canRead) {
    return (
      <Box padding={4}>
        <Typography variant="pi" textColor="neutral600">
          当前角色没有查看 Webhook Dashboard 的权限。
        </Typography>
      </Box>
    );
  }

  const enabledButtons = buttons.filter((button) => button.enabled);

  if (!enabledButtons.length) {
    return (
      <Box padding={4}>
        <Typography variant="pi" textColor="neutral600">
          未配置可用的 Webhook 按钮，请前往设置页添加。
        </Typography>
      </Box>
    );
  }

  return (
    <Box padding={4}>
      <Flex direction="column" gap={4} alignItems="stretch">
        {Object.entries(groupButtons(enabledButtons)).map(([group, groupItems]) => (
          <Flex key={group} direction="column" gap={2} alignItems="stretch">
            <Typography variant="pi" fontWeight="bold" textColor="neutral700">
              {group}
            </Typography>

            {groupItems.map((button) => {
              const status = statusMap[button.id];
              const lastRun = lastRunByButton[button.id];
              const isLoading = status?.type === 'loading';

              return (
                <Box
                  key={button.id}
                  padding={3}
                  background="neutral100"
                  hasRadius
                  borderColor="neutral200"
                  borderStyle="solid"
                  borderWidth="1px"
                >
                  <Flex direction="column" gap={2} alignItems="stretch">
                    <Flex justifyContent="space-between" alignItems="center" gap={3} wrap="wrap">
                      <Button
                        size="S"
                        variant={button.confirmRequired ? 'danger-light' : 'secondary'}
                        loading={isLoading}
                        disabled={isLoading || !canTrigger}
                        onClick={() => handleTrigger(button)}
                      >
                        {button.title}
                      </Button>

                      {status ? (
                        <Typography variant="pi" textColor={getStatusColor(status.type)}>
                          {status.message}
                        </Typography>
                      ) : null}
                    </Flex>

                    {button.description ? (
                      <Typography variant="pi" textColor="neutral600">
                        {button.description}
                      </Typography>
                    ) : null}

                    {lastRun ? (
                      <Typography variant="pi" textColor="neutral500">
                        最近一次：{formatRunSummary(lastRun)}
                        {lastRun.triggeredAt ? ` · ${formatDateTime(lastRun.triggeredAt)}` : ''}
                      </Typography>
                    ) : null}
                  </Flex>
                </Box>
              );
            })}
          </Flex>
        ))}
      </Flex>
    </Box>
  );
};

export default WebhookWidget;
