import { PLUGIN_ID } from './pluginId';

const action = (uid: string) => `plugin::${PLUGIN_ID}.${uid}`;

export const ACTIONS = {
  read: action('read'),
  trigger: action('trigger'),
  updateSettings: action('settings.update'),
  clearHistory: action('history.clear'),
};

export const PERMISSIONS = {
  read: [{ action: ACTIONS.read }],
  trigger: [{ action: ACTIONS.trigger }],
  updateSettings: [{ action: ACTIONS.updateSettings }],
  clearHistory: [{ action: ACTIONS.clearHistory }],
  all: [
    { action: ACTIONS.read },
    { action: ACTIONS.trigger },
    { action: ACTIONS.updateSettings },
    { action: ACTIONS.clearHistory },
  ],
};
