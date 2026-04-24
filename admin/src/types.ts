export type WebhookButton = {
  id: string;
  title: string;
  url: string;
};

export type WebhookSettings = {
  buttons: WebhookButton[];
};
