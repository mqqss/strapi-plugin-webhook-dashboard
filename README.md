# strapi-plugin-webhook-widget

Strapi 5 插件，用于在管理后台首页添加一个可配置的 Webhook widget。

## Features

- 在 Strapi 管理后台首页注册 widget
- 支持在 Settings 页面配置多个按钮
- 每个按钮通过服务端发送 `POST` 请求触发 webhook
- 配置保存在 Strapi plugin store 中
- 从早期本地插件 ID `strapi-plugin-webhook-widget` 自动迁移旧配置

## Installation

```bash
npm install strapi-plugin-webhook-widget
```

Strapi 5 会从 `node_modules` 自动发现插件，通常不需要在 `config/plugins.ts` 里手动配置。

如果你希望显式启用：

```ts
export default () => ({
  'webhook-widget': {
    enabled: true,
  },
});
```

安装后重新构建后台：

```bash
npm run build
npm run develop
```

## Usage

1. 打开 Strapi 后台 Settings。
2. 进入“Webhook 小组件”。
3. 添加按钮标题和 webhook URL。
4. 保存后，在后台首页 widget 中点击按钮触发对应 webhook。

Webhook 只支持 `http` 或 `https` URL，并使用服务端 `POST` 请求触发。

## Development

```bash
npm install
npm run build
npm run verify
```

本地联调可以使用 Strapi Plugin SDK 的 `watch:link`：

```bash
npm run watch:link
```

## Package

```bash
npm pack
```

发布前建议先运行：

```bash
npm run test
npm run build
npm run verify
```

## License

MIT
