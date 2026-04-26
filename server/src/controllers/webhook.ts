import type { Core } from '@strapi/strapi';
import { PLUGIN_ID } from '../pluginId';

type TriggerUser = {
  id?: number | string;
  firstname?: string;
  lastname?: string;
  username?: string;
  email?: string;
  roles?: Array<{
    id?: number | string;
    name?: string;
    code?: string;
    description?: string;
  }>;
};

type WebhookContext = {
  request: {
    body?: unknown;
  };
  query?: {
    limit?: string | number;
  };
  state?: {
    user?: TriggerUser;
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
  async getDashboard(ctx: WebhookContext) {
    const limit = Number(ctx.query?.limit ?? 50);
    const data = await strapi
      .plugin(PLUGIN_ID)
      .service('webhook')
      .getDashboard(ctx.state?.user, limit);
    ctx.send(data);
  },

  async getSettings(ctx: WebhookContext) {
    const data = await strapi.plugin(PLUGIN_ID).service('webhook').getSettings();
    ctx.send(data);
  },

  async getRoles(ctx: WebhookContext) {
    const data = await strapi.plugin(PLUGIN_ID).service('webhook').getRoles();
    ctx.send({ roles: data });
  },

  async updateSettings(ctx: WebhookContext) {
    try {
      const data = await strapi.plugin(PLUGIN_ID).service('webhook').updateSettings(ctx.request.body);
      ctx.send(data);
    } catch (error) {
      strapi.log.error('[webhook-dashboard] update settings failed', error);
      ctx.badRequest(getErrorMessage(error, '保存失败'));
    }
  },

  async getHistory(ctx: WebhookContext) {
    const limit = Number(ctx.query?.limit ?? 50);
    const data = await strapi.plugin(PLUGIN_ID).service('webhook').getHistory(limit);
    ctx.send({ history: data });
  },

  async clearHistory(ctx: WebhookContext) {
    const data = await strapi.plugin(PLUGIN_ID).service('webhook').clearHistory();
    ctx.send({ history: data });
  },

  async trigger(ctx: WebhookContext) {
    try {
      const body = (ctx.request.body ?? {}) as { id?: string; confirmed?: boolean };
      const id = body.id;

      if (!id) {
        return ctx.badRequest('id is required');
      }

      const data = await strapi.plugin(PLUGIN_ID).service('webhook').trigger(id, {
        confirmed: body.confirmed,
        user: ctx.state?.user,
      });
      ctx.send(data);
    } catch (error) {
      strapi.log.error('[webhook-dashboard] trigger failed', error);
      ctx.badRequest(getErrorMessage(error, '触发失败'));
    }
  },
});

export default webhookController;
