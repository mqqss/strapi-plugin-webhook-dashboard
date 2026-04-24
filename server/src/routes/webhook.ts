export default [
  {
    method: 'GET',
    path: '/settings',
    handler: 'webhook.getSettings',
    config: {
      policies: [],
    },
  },
  {
    method: 'PUT',
    path: '/settings',
    handler: 'webhook.updateSettings',
    config: {
      policies: [],
    },
  },
  {
    method: 'POST',
    path: '/trigger',
    handler: 'webhook.trigger',
    config: {
      policies: [],
    },
  },
];
