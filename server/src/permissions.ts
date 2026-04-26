import { PLUGIN_ID } from './pluginId';

export const ACTIONS = {
  read: `plugin::${PLUGIN_ID}.read`,
  trigger: `plugin::${PLUGIN_ID}.trigger`,
  updateSettings: `plugin::${PLUGIN_ID}.settings.update`,
  clearHistory: `plugin::${PLUGIN_ID}.history.clear`,
};

export const permissionActions = [
  {
    section: 'plugins',
    displayName: 'Read',
    uid: 'read',
    pluginName: PLUGIN_ID,
  },
  {
    section: 'plugins',
    displayName: 'Trigger webhooks',
    uid: 'trigger',
    pluginName: PLUGIN_ID,
  },
  {
    section: 'plugins',
    displayName: 'Update settings',
    uid: 'settings.update',
    subCategory: 'settings',
    pluginName: PLUGIN_ID,
  },
  {
    section: 'plugins',
    displayName: 'Clear history',
    uid: 'history.clear',
    subCategory: 'history',
    pluginName: PLUGIN_ID,
  },
];
