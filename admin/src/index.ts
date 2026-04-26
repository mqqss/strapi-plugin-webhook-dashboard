import type { StrapiApp } from '@strapi/admin/strapi-admin';
import { Lightning } from '@strapi/icons';
import { PLUGIN_ID } from './pluginId';
import { PERMISSIONS } from './permissions';

const PLUGIN_NAME = 'Webhook Dashboard';

export default {
  register(app: StrapiApp) {
    app.registerPlugin({
      id: PLUGIN_ID,
      name: PLUGIN_NAME,
    });

    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: Lightning,
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.name`,
        defaultMessage: PLUGIN_NAME,
      },
      Component: () => import('./pages/SettingsPage'),
      permissions: PERMISSIONS.read,
      position: 8,
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
      id: 'webhook-dashboard',
      pluginId: PLUGIN_ID,
      permissions: PERMISSIONS.read,
    });
  },

  bootstrap() {},
};
