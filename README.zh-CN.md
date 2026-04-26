# strapi-plugin-webhook-dashboard

用于 Strapi 5 的管理后台插件，可以在后台添加一个可配置的 Webhook Dashboard。

[English documentation](./README.md)

## 功能

- 在 Strapi 管理后台首页注册 webhook 组件
- 在左侧菜单添加 Webhook Dashboard 配置页面
- 支持配置多个 webhook 按钮
- 通过 Strapi 服务端发送 `POST` 请求触发 webhook
- 使用 Strapi plugin store 存储按钮配置和执行历史
- 支持按钮分组、描述、启用/禁用、自定义请求头、原始请求体、Bearer Token 和 Basic Auth
- 支持危险操作触发前确认
- 保留最近 50 条触发记录，包括状态、状态码、耗时、操作人和响应预览
- 可以从配置页面触发已保存的 webhook 按钮，并记录执行历史
- 注册 Strapi 管理员 RBAC 权限：读取、触发、更新配置、清空历史
- 支持按管理员角色限制单个按钮的可见性和触发权限，并在服务端强制校验

## 安装

```bash
npm install strapi-plugin-webhook-dashboard
```

Strapi 5 通常会自动发现已安装的插件。如需显式启用，可以在 Strapi 配置中添加：

```ts
export default () => ({
  'webhook-dashboard': {
    enabled: true,
  },
});
```

安装后重新构建管理后台：

```bash
npm run build
npm run develop
```

## 使用

1. 打开 Strapi 管理后台。
2. 从左侧菜单进入 "Webhook Dashboard"。
3. 添加按钮标题和 webhook URL。
4. 保存后，可以从管理后台首页组件或插件页面触发 webhook。

## 按钮配置

Webhook URL 必须使用 `http` 或 `https`。
请求头可以填写 JSON 对象，也可以按每行一个 `Name: Value` 的格式填写。
请求体会作为 `POST` 请求的原始 body 发送。

按钮支持可选分组、描述、启用/禁用、触发确认、自定义请求头、原始请求体、Bearer Token 认证和 Basic Auth 认证。

## 权限

插件会在 Strapi 管理员角色页面注册权限。授予 `Read` 后可以看到左侧菜单和首页组件，授予 `Trigger webhooks` 后可以触发按钮，授予 `Update settings` 后可以编辑配置，授予 `Clear history` 后可以清空执行历史。

每个按钮还可以单独限制允许触发的管理员角色。角色列表为空时，任何拥有 `Trigger webhooks` 权限的管理员角色都可以触发该按钮；选择一个或多个角色后，只有这些角色可以看到并触发该按钮。首页组件使用安全的 dashboard 接口，不会暴露 webhook URL、请求头、请求体或认证密钥。

## License

MIT
