# NiLLM

中文 · [English](./README.md)

在同一工作台对比多个 AI 模型的回答质量、速度和成本。支持 Windows、macOS、Linux 和 Android，可接入云端 API 或本地模型服务。

![模型竞技场](./assets/demo1.png)

## 功能

- **多模型竞技场**：向多个模型发送同一提示词，并排查看流式回答。各模型保留独立的多轮对话历史；支持图片输入与生成，具体能力取决于模型和接口。
- **批量实验**：组合测试集、模型、参数组和重复次数，比较不同配置的表现。每个用例独立运行，保留当次配置，支持暂停、恢复和失败重试。
- **结果评分**：支持人工评分、预期答案校验（精确匹配、包含、JSON 等），也可指定裁判模型，对匿名回答的准确性、指令遵循和完整性打分。
- **结构化决策**：为判断、选择和评分任务定义问题与标准，对比模型返回的决策、概率和置信度。
- **性能与成本统计**：查看首字延迟、生成速度、总耗时、成功率、Token 用量、缓存命中率和费用。区分 API 返回值与估算值，费用按配置的模型价格计算。
- **模型与素材管理**：接入 OpenAI、Anthropic、Gemini、DeepSeek、OpenRouter 等服务，支持自定义 OpenAI 兼容接口，以及 Ollama、LM Studio 本地服务。管理提示词、测试集和参数预设，复用评测配置。
- **报告与备份**：导出 Markdown、HTML、CSV 或 JSON 报告，支持数据备份与恢复。配置和记录保存在本机，模型请求发送至你配置的服务。

## 开始使用

1. 从 [Releases](https://github.com/ni00/NiLLM/releases/latest) 下载对应平台的安装包。
2. 在「模型」页添加供应商，配置 API 地址、密钥和模型；使用本地模型时，先启动 Ollama 或 LM Studio 服务。
3. 在「竞技场」选择模型并发送提示词。需要批量评测时，先在「测试集」准备用例，再创建「实验」。

云端模型需使用你自己的 API 凭据，调用费用由对应服务收取。图片、采样参数和用量统计的支持情况取决于所选模型与接口。

Linux AppImage 从 v1.1.0 起支持 [AppImageUpdate](https://github.com/AppImageCommunity/AppImageUpdate)；更早版本需先手动升级一次。

## 开发

基于 Tauri 2、Rust、React 和 TypeScript。需要 Node.js 24+、pnpm 11；运行或构建桌面端还需 Rust stable，Linux 需安装 WebKitGTK 4.1 等系统开发依赖。

```bash
pnpm install --frozen-lockfile
pnpm tauri:dev   # 桌面应用
pnpm dev         # 浏览器前端
pnpm check       # 类型检查、Lint 和单元测试
pnpm tauri build # 构建桌面安装包
```

[MIT 许可证](./LICENSE)
