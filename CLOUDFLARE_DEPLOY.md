# Cloudflare 部署说明

这个目录是客运情报站的 Cloudflare 独立部署版，不影响原 Netlify 仓库。

## 部署前准备

1. 登录 Cloudflare：
   `npx wrangler login`

2. 创建 KV：
   `npx wrangler kv namespace create PASSENGER_STATE`

3. 将命令返回的 `id` 填入 `wrangler.toml`：
   `REPLACE_WITH_KV_NAMESPACE_ID`

4. 配置 AI 密钥：
   `npx wrangler secret put AI_API_KEY`

5. 配置 AI 参数：
   `npx wrangler secret put AI_PROVIDER`
   `npx wrangler secret put AI_MODEL`
   `npx wrangler secret put AI_BASE_URL`

推荐值：
- `AI_PROVIDER=glm`
- `AI_MODEL=glm-4.7`
- `AI_BASE_URL=https://open.bigmodel.cn/api/paas/v4`

## 检查和部署

检查：
`npm test`

Cloudflare 预检查：
`npm run cloudflare:dry-run`

部署：
`npm run cloudflare:deploy`

## 说明

- 网页由 Cloudflare Worker Static Assets 托管。
- 新闻缓存、日报和反馈内容保存在 Workers KV。
- 定时抓取使用 Cloudflare Cron Triggers。
- 手动刷新入口仍然关闭，不在前台展示。
