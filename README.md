# 全国客运情报站

这是一个准备部署到 Netlify 的国内道路客运情报网站。它参考 AIHOT 的产品思路：信源分级、低成本预筛、AI 多维评分、代码计算最终分、精选阈值、同事件聚类和自动日报。

## 本地预览

双击 `启动网站.bat`，或手动运行：

```powershell
npm run dev
```

然后打开：

```text
http://127.0.0.1:8765
```

## Netlify 部署

项目已经包含：

- `netlify.toml`：部署目录、函数目录、接口重定向、定时抓取配置。
- `web/`：前端页面。
- `netlify/functions/`：接口、抓取、日报、信源和系统状态。
- `data/sources.json`：分级信源表。

定时抓取使用 UTC 配置，已换算为北京时间每天 7:00、9:00、11:00、13:00、15:00、17:00。

## 免费额度控制

- 每次只处理一批信源。
- 每个信源只取少量最新链接。
- 已抓过的 URL 不重复处理。
- 已有缓存优先读取。
- AI 调用次数有上限；没有 API KEY 时自动使用本地规则兜底。

默认限制可通过 Netlify 环境变量调整：

```text
MAX_SOURCES_PER_RUN=4
MAX_LINKS_PER_SOURCE=6
MAX_NEW_ARTICLES_PER_RUN=12
MAX_AI_CALLS_PER_RUN=8
MAX_ARTICLES_STORED=300
```

## AI 配置

默认按 GLM 兼容 OpenAI 的接口设计，密钥不要写进代码，应放在 Netlify 环境变量里：

```text
AI_PROVIDER=glm
AI_BASE_URL=https://open.bigmodel.cn/api/paas/v4
AI_API_KEY=你的GLM密钥
AI_MODEL=你的GLM模型
```

后续切换 DeepSeek，一般只改环境变量：

```text
AI_PROVIDER=deepseek
AI_BASE_URL=https://api.deepseek.com
AI_API_KEY=你的DeepSeek密钥
AI_MODEL=deepseek-chat
```

## 测试

```powershell
npm test
```

测试覆盖：国外信息过滤、无关铁路民航过滤、政策监管、经营借鉴、同事件聚类、接口读取、日报和系统状态。
