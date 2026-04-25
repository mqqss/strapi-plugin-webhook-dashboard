# strapi-plugin-webhook-dashboard

Strapi 5 plugin that adds a configurable webhook dashboard widget to the admin homepage.

## Features

- Registers a Strapi admin homepage widget
- Adds a Settings page for configuring multiple webhook buttons
- Triggers webhooks from the Strapi server with `POST`
- Stores button configuration in the Strapi plugin store

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

1. Open Strapi admin Settings.
2. Go to "Webhook Dashboard".
3. Add a button title and webhook URL.
4. Save, then trigger the webhook from the admin homepage widget.

Webhook URLs must use `http` or `https`.

## Development

```bash
npm install
npm run test
npm run build
npm run verify
```

## Package

```bash
npm pack
```

## License

MIT
