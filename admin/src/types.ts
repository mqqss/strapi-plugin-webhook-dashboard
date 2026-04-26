export type WebhookAuthType = 'none' | 'bearer' | 'basic';

export type AdminRole = {
  id: string;
  name: string;
  code: string;
  description?: string;
};

export type WebhookButton = {
  id: string;
  title: string;
  url: string;
  enabled: boolean;
  group: string;
  description: string;
  headers: string;
  body: string;
  authType: WebhookAuthType;
  authToken: string;
  authUsername: string;
  authPassword: string;
  confirmRequired: boolean;
  confirmText: string;
  allowedRoleIds: string[];
};

export type WebhookSettings = {
  buttons: WebhookButton[];
};

export type WebhookDashboardButton = Pick<
  WebhookButton,
  'id' | 'title' | 'enabled' | 'group' | 'description' | 'confirmRequired' | 'confirmText'
>;

export type WebhookDashboard = {
  buttons: WebhookDashboardButton[];
  history: WebhookRun[];
};

export type WebhookRunStatus = 'success' | 'error';

export type WebhookRun = {
  id: string;
  buttonId: string;
  buttonTitle: string;
  group: string;
  status: WebhookRunStatus;
  statusCode?: number;
  statusText?: string;
  durationMs: number;
  triggeredAt: string;
  triggeredBy: string;
  error?: string;
  responsePreview?: string;
};
