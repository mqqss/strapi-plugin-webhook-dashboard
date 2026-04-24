import type { StrapiApp } from '@strapi/admin/strapi-admin';
import { Lightning } from '@strapi/icons';
import { PLUGIN_ID } from './pluginId';

const PLUGIN_NAME = 'Webhook 小组件';

export default {
  register(app: StrapiApp) {
    app.registerPlugin({
      id: PLUGIN_ID,
      name: PLUGIN_NAME,
    });

    app.widgets.register({
      icon: Lightning,
      title: {
        id: `${PLUGIN_ID}.widget.title`,
        defaultMessage: PLUGIN_NAME,
      },
      component: async () => {
        const component = await import('./components/WebhookWidget');
        return component.default;
      },
      id: 'webhook-widget',
      pluginId: PLUGIN_ID,
    });
  },

  bootstrap(app: StrapiApp) {
    app.addSettingsLink('global', {
      id: `${PLUGIN_ID}.settings`,
      intlLabel: {
        id: `${PLUGIN_ID}.settings.label`,
        defaultMessage: PLUGIN_NAME,
      },
      to: `/settings/${PLUGIN_ID}`,
      Component: async () => import('./pages/SettingsPage'),
      permissions: [],
    });
  },
};
