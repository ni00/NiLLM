# NiLLM

中文 · [English](./README.md)

在同一工作台对比多个 AI 模型的回答质量、速度和成本。支持 Windows、macOS、Linux 和 Android，可接入云端 API 或本地模型服务。

![模型竞技场](./assets/demo1.png)

## 功能

- **多模型竞技场** — 向多个模型发送同一提示词，并排查看流式回答。各模型保留独立的对话历史；图片输入与生成取决于模型和接口是否支持。
- **批量实验** — 组合测试集、模型、参数组和重复次数。每个用例独立运行并保留当次配置快照，支持暂停、恢复和失败重试。
- **结果评分** — 支持人工评分，用精确匹配、包含、JSON 等方式校验预期答案，也可指定裁判模型对匿名回答的准确性、指令遵循和完整性打分。
- **结构化决策** — 为判断、选择和评分任务定义问题与标准，对比各模型的决策、概率和置信度。
- **性能与成本** — 查看首字延迟、生成速度、总耗时、成功率、Token 用量、缓存命中率和费用，并区分 API 返回值与估算值。
- **模型与素材** — 接入 OpenAI、Anthropic、Gemini、DeepSeek、OpenRouter 等服务，支持自定义 OpenAI 兼容接口和 Ollama、LM Studio 本地服务；提示词、测试集和参数预设可复用。
- **报告与备份** — 导出 Markdown、HTML、CSV 或 JSON，并支持备份与恢复。记录保存在本机，模型请求只发送到你配置的服务。

## 开始使用

1. 从 [Releases](https://github.com/ni00/NiLLM/releases/latest) 下载对应平台的安装包。
2. 在「模型」页添加供应商，填写接口地址、密钥和模型；使用本地模型时先启动 Ollama 或 LM Studio。
3. 在「竞技场」选择模型并发送提示词。批量评测时，先在「测试集」准备用例，再创建「实验」。

云端模型使用你自己的凭据，费用由对应服务收取。图片、采样参数和用量统计的支持情况取决于所选模型与接口。

## 开发

技术栈为 Tauri 2、Rust、React 19、TypeScript、Zustand 和 Vite。需要 Node.js 24+、pnpm 11 和 Rust stable；Linux 还需安装 WebKitGTK 4.1 等 Tauri 系统依赖。

```bash
pnpm install --frozen-lockfile
pnpm tauri:dev    # 桌面应用
pnpm dev          # 浏览器中运行前端
pnpm check        # 类型检查、Lint 和单元测试
pnpm test:e2e     # 端到端测试（Playwright）
pnpm tauri build  # 构建桌面安装包
```

### 目录结构

| 路径               | 内容                                                                   |
| ------------------ | ---------------------------------------------------------------------- |
| `src/lib`          | 底层：类型、校验、供应商目录与传输、生成参数、统计、状态仓库与本地存储 |
| `src/features/<x>` | 每个功能一个目录：`domain/` 为纯逻辑，`components/`、`hooks/` 为界面   |
| `src/pages`        | 路由入口，按需加载                                                     |
| `src/app`          | 路由、导航、全局 Provider、快捷键、队列调度                            |
| `src-tauri`        | Rust 外壳：插件注册与 Linux AppImage 环境设置                          |

耗时的流式生成（`src/lib/workers`）和 Markdown 解析（`src/features/chat-arena/markdown`）运行在两个 Web Worker 中。生成 Worker 作为主构建的入口，因此窗口与 Worker 共享同一份供应商 SDK。

## 许可证

[MIT](./LICENSE)
