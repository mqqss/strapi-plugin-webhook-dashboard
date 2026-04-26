# strapi-plugin-webhook-dashboard

Strapi 5 plugin that adds a configurable webhook dashboard widget to the admin homepage.

[中文文档](./README.zh-CN.md)

## Features

- Registers a Strapi admin homepage widget
- Adds a Settings page for configuring multiple webhook buttons
- Triggers webhooks from the Strapi server with `POST`
- Stores button configuration in the Strapi plugin store
- Supports grouped buttons, descriptions, enable/disable state, custom headers, raw body, Bearer Token, and Basic Auth
- Supports dangerous-action confirmation before triggering selected buttons
- Stores the latest 50 trigger runs in the Strapi plugin store with status, status code, duration, actor, and response preview
- Allows saved webhook buttons to be triggered from the Settings page and records execution history
- Registers Strapi admin RBAC actions for read, trigger, settings update, and history clearing
- Supports per-button admin role allowlists, enforced by the plugin before a webhook is triggered

## Installation

```bash
npm install strapi-plugin-webhook-dashboard
```

Strapi 5 usually discovers installed plugins automatically. To enable it explicitly:

```ts
export default () => ({
  'webhook-dashboard': {
    enabled: true,
  },
});
```

Rebuild the admin panel after installation:

```bash
npm run build
npm run develop
```

## Usage

1. Open Strapi admin.
2. Go to "Webhook Dashboard" from the left navigation.
3. Add a button title and webhook URL.
4. Save, then trigger the webhook from the admin homepage widget.

## Button configuration

Webhook URLs must use `http` or `https`.
Headers can be entered as a JSON object or as one `Name: Value` pair per line.
Body is sent as the raw request body for the `POST`.

Buttons support optional grouping, descriptions, enable/disable state, confirmation prompts, custom headers, raw bodies, Bearer Token auth, and Basic Auth.

## Permissions

The plugin adds permissions under the Strapi admin roles page. Grant `Read` to show the left navigation page and widget, `Trigger webhooks` to fire buttons, `Update settings` to edit configuration, and `Clear history` to remove stored runs.

Each button can also be restricted to selected admin roles. Leave the role list empty to allow any admin role that already has `Trigger webhooks`; select one or more roles to make that button visible and triggerable only for those roles. The homepage widget uses a safe dashboard endpoint that does not expose webhook URLs, headers, request bodies, or auth secrets.

## License

MIT
