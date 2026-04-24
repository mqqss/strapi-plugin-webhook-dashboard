import type { Core } from '@strapi/strapi';
import { PLUGIN_ID } from '../pluginId';

type WebhookContext = {
  request: {
    body?: unknown;
  };
  send: (body: unknown) => void;
  badRequest: (message: string) => void;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const webhookController = ({ strapi }: { strapi: Core.Strapi }) => ({
  async getSettings(ctx: WebhookContext) {
    const data = await strapi.plugin(PLUGIN_ID).service('webhook').getSettings();
    ctx.send(data);
  },

  async updateSettings(ctx: WebhookContext) {
    try {
      const data = await strapi.plugin(PLUGIN_ID).service('webhook').updateSettings(ctx.request.body);
      ctx.send(data);
    } catch (error) {
      strapi.log.error('[webhook-widget] update settings failed', error);
      ctx.badRequest(getErrorMessage(error, '保存失败'));
    }
  },

  async trigger(ctx: WebhookContext) {
    try {
      const id = (ctx.request.body as { id?: string } | undefined)?.id;

      if (!id) {
        return ctx.badRequest('id is required');
      }

      const data = await strapi.plugin(PLUGIN_ID).service('webhook').trigger(id);
      ctx.send(data);
    } catch (error) {
      strapi.log.error('[webhook-widget] trigger failed', error);
      ctx.badRequest(getErrorMessage(error, '触发失败'));
    }
  },
});

export default webhookController;
