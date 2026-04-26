import { ACTIONS } from '../permissions';

const adminPermissions = (actions: string[]) => [
  'admin::isAuthenticatedAdmin',
  {
    name: 'admin::hasPermissions',
    config: {
      actions,
    },
  },
];

export default [
  {
    method: 'GET',
    path: '/dashboard',
    handler: 'webhook.getDashboard',
    config: {
      policies: adminPermissions([ACTIONS.read]),
    },
  },
  {
    method: 'GET',
    path: '/settings',
    handler: 'webhook.getSettings',
    config: {
      policies: adminPermissions([ACTIONS.updateSettings]),
    },
  },
  {
    method: 'GET',
    path: '/roles',
    handler: 'webhook.getRoles',
    config: {
      policies: adminPermissions([ACTIONS.updateSettings]),
    },
  },
  {
    method: 'PUT',
    path: '/settings',
    handler: 'webhook.updateSettings',
    config: {
      policies: adminPermissions([ACTIONS.updateSettings]),
    },
  },
  {
    method: 'GET',
    path: '/history',
    handler: 'webhook.getHistory',
    config: {
      policies: adminPermissions([ACTIONS.updateSettings]),
    },
  },
  {
    method: 'DELETE',
    path: '/history',
    handler: 'webhook.clearHistory',
    config: {
      policies: adminPermissions([ACTIONS.clearHistory]),
    },
  },
  {
    method: 'POST',
    path: '/trigger',
    handler: 'webhook.trigger',
    config: {
      policies: adminPermissions([ACTIONS.trigger]),
    },
  },
];
