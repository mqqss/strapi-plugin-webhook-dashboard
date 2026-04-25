import * as React from 'react';
import { useFetchClient } from '@strapi/strapi/admin';
import { PLUGIN_ID } from '../pluginId';
import type { WebhookButton, WebhookSettings } from '../types';
import { getErrorMessage } from '../utils/getErrorMessage';
import {
  Main,
  Box,
  Typography,
  Button,
  TextInput,
  Flex,
  Loader,
  Alert,
  Field
} from '@strapi/design-system';
import { Plus, Trash, Check } from '@strapi/icons';

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
});

const SettingsPage = () => {
  const { get, put } = useFetchClient();
  const [settings, setSettings] = React.useState<WebhookSettings>({ buttons: [] });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

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
  }, [get]);

  const updateButton = (id: string, patch: Partial<WebhookButton>) => {
    setSettings((prev) => ({
      buttons: prev.buttons.map((button) =>
        button.id === id ? { ...button, ...patch } : button
      ),
    }));
  };

  const handleAdd = () => {
    setSettings((prev) => ({
      buttons: [...prev.buttons, createEmptyButton()],
    }));
  };

  const handleRemove = (id: string) => {
    setSettings((prev) => ({
      buttons: prev.buttons.filter((button) => button.id !== id),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await put(`/${PLUGIN_ID}/settings`, settings);
      setSettings(response.data);
      setSuccess('已保存');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

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
        <Flex justifyContent="space-between" alignItems="center">
          <Flex direction="column" alignItems="flex-start" gap={1}>
            <Typography variant="alpha" fontWeight="bold">
              Webhook Dashboard
            </Typography>
            <Typography variant="epsilon" textColor="neutral600">
              配置首页 Widget 的按钮标题与 webhook 地址（仅支持 POST）
            </Typography>
          </Flex>
          <Button
            onClick={handleSave}
            startIcon={<Check />}
            loading={saving}
            disabled={saving}
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

          <Box background="neutral0" padding={6} shadow="filterShadow" hasRadius>
            <Flex direction="column" alignItems="stretch" gap={6}>
              {settings.buttons.length > 0 ? (
                settings.buttons.map((button, index) => (
                  <Box key={button.id} padding={4} background="neutral100" hasRadius borderColor="neutral200" borderStyle="solid" borderWidth="1px">
                    <Flex direction="column" alignItems="stretch" gap={4}>
                      <Flex justifyContent="space-between" alignItems="center">
                        <Typography variant="delta" fontWeight="bold">
                          按钮 {index + 1}
                        </Typography>
                        <Button
                          onClick={() => handleRemove(button.id)}
                          startIcon={<Trash />}
                          variant="danger-light"
                          size="S"
                        >
                          删除
                        </Button>
                      </Flex>

                      <Field.Root name={`button-title-${button.id}`}>
                        <Field.Label>按钮标题</Field.Label>
                        <TextInput
                          placeholder="例如：触发部署"
                          value={button.title}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            updateButton(button.id, { title: e.target.value })
                          }
                        />
                      </Field.Root>

                      <Field.Root name={`button-url-${button.id}`}>
                         <Field.Label>Webhook 地址</Field.Label>
                         <TextInput
                          placeholder="https://example.com/webhook"
                          value={button.url}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            updateButton(button.id, { url: e.target.value })
                          }
                        />
                      </Field.Root>
                    </Flex>
                  </Box>
                ))
              ) : (
                <Box padding={8} background="neutral100" hasRadius borderColor="neutral200" borderStyle="dashed" borderWidth="1px">
                   <Flex justifyContent="center">
                      <Typography variant="omega" textColor="neutral600">
                        还没有按钮，请先新增一个。
                      </Typography>
                   </Flex>
                </Box>
              )}

              <Box>
                <Button onClick={handleAdd} startIcon={<Plus />} variant="secondary">
                  新增按钮
                </Button>
              </Box>
            </Flex>
          </Box>
        </Flex>
      </Box>
    </Main>
  );
};

export default SettingsPage;
