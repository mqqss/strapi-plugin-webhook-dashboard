import * as React from 'react';
import { useFetchClient } from '@strapi/strapi/admin';
import { Box, Button, Flex, Typography, Loader, Alert } from '@strapi/design-system';
import { PLUGIN_ID } from '../pluginId';
import type { WebhookSettings } from '../types';
import { getErrorMessage } from '../utils/getErrorMessage';

type StatusState = {
  type: 'loading' | 'success' | 'error';
  message: string;
};

const getStatusColor = (status: StatusState['type']) => {
  if (status === 'success') {
    return 'success600';
  }

  if (status === 'error') {
    return 'danger600';
  }

  return 'neutral500';
};

const WebhookWidget = () => {
  const { get, post } = useFetchClient();
  const [loading, setLoading] = React.useState(true);
  const [settings, setSettings] = React.useState<WebhookSettings | null>(null);
  const [error, setError] = React.useState<Error | null>(null);
  const [statusMap, setStatusMap] = React.useState<Record<string, StatusState>>({});

  React.useEffect(() => {
    let active = true;

    const fetchSettings = async () => {
      try {
        const response = await get(`/${PLUGIN_ID}/settings`);
        if (!active) {
          return;
        }
        setSettings(response.data);
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

    fetchSettings();

    return () => {
      active = false;
    };
  }, [get]);

  const handleTrigger = async (id: string) => {
    setStatusMap((prev) => ({
      ...prev,
      [id]: { type: 'loading', message: '触发中...' },
    }));

    try {
      const result = await post(`/${PLUGIN_ID}/trigger`, { id });
      const { status } = result.data as { status?: number };

      setStatusMap((prev) => ({
        ...prev,
        [id]: { type: 'success', message: `成功${status ? ` (${status})` : ''}` },
      }));
    } catch (err) {
      setStatusMap((prev) => ({
        ...prev,
        [id]: { type: 'error', message: getErrorMessage(err) },
      }));
    }
  };

  if (loading) {
    return (
      <Flex justifyContent="center" alignItems="center" height="100%" minHeight="100px">
        <Loader>加载中...</Loader>
      </Flex>
    );
  }

  if (error) {
    return (
       <Box padding={4}>
        <Alert closeLabel="关闭" title="错误" variant="danger">
          {error.message}
        </Alert>
      </Box>
    );
  }

  if (!settings?.buttons?.length) {
    return (
      <Box padding={4}>
        <Typography variant="pi" textColor="neutral600">
          未配置 Webhook 按钮，请前往设置页添加。
        </Typography>
      </Box>
    );
  }

  return (
    <Box padding={4}>
      <Flex direction="column" gap={2} alignItems="stretch">
        {settings.buttons.map((button) => {
          const status = statusMap[button.id];

          return (
            <Flex key={button.id} justifyContent="space-between" alignItems="center" gap={4} wrap="wrap">
              <Button size="S" variant="secondary" onClick={() => handleTrigger(button.id)}>
                {button.title}
              </Button>
              {status ? (
                <Typography variant="pi" textColor={getStatusColor(status.type)}>
                  {status.message}
                </Typography>
              ) : null}
            </Flex>
          );
        })}
      </Flex>
    </Box>
  );
};

export default WebhookWidget;