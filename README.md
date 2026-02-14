# NiLLM

> **The Professional Model Arena** | **专业的模型竞技场**

A high-performance desktop arena for developers and AI researchers to benchmark LLMs side-by-side.

一款高性能桌面应用，为开发者和 AI 研究人员提供 LLM 并排基准测试。

![Arena Screenshot](./assets/demo.png)

---

## English

### Features

- **Live Benchmarking** — Real-time tracking of TTFT, TPS, and total duration
- **Side-by-Side Comparison** — Concurrent streaming responses for instant cross-model evaluation
- **AI Judging** — Automated quantitative scoring powered by frontier models
- **Unified Control** — Manage system prompts and generation parameters globally
- **Statistics Dashboard** — Visualize performance metrics across sessions
- **Multi-Provider Support** — OpenAI, Anthropic, Google, OpenRouter, and custom endpoints

### Installation

Download the latest release for your platform:

| Platform | Download                                          |
| -------- | ------------------------------------------------- |
| macOS    | `NiLLM_x.x.x_x64.dmg` / `NiLLM_x.x.x_aarch64.dmg` |
| Windows  | `NiLLM_x.x.0_x64-setup.exe`                       |
| Linux    | `NiLLM_x.x.x_amd64.AppImage`                      |

### Quick Start

1. Launch NiLLM
2. Navigate to **Models** and add your API keys
3. Go to **Arena** and select models to compare
4. Enter a prompt and watch responses stream in real-time

### Tech Stack

- **Tauri 2** — Rust backend for native performance
- **React 19** — Modern frontend with TypeScript
- **Tailwind CSS 4** — Utility-first styling
- **Zustand** — Lightweight state management

### Development

```bash
pnpm install
pnpm tauri dev
```

### License

[MIT](./LICENSE)

---

## 中文

### 功能特性

- **实时基准测试** — 追踪 TTFT、TPS 和总时长等性能指标
- **并排比较** — 多模型同时流式输出，即时对比评估
- **AI 评判** — 使用前沿模型自动进行量化评分
- **统一控制** — 全局管理系统提示词和生成参数
- **统计仪表板** — 可视化跨会话性能指标
- **多提供商支持** — 支持 OpenAI、Anthropic、Google、OpenRouter 及自定义端点

### 安装

根据您的平台下载最新版本：

| 平台    | 下载                                              |
| ------- | ------------------------------------------------- |
| macOS   | `NiLLM_x.x.x_x64.dmg` / `NiLLM_x.x.x_aarch64.dmg` |
| Windows | `NiLLM_x.x.0_x64-setup.exe`                       |
| Linux   | `NiLLM_x.x.x_amd64.AppImage`                      |
| Android | `NiLLM_x.x.x.apk`                                 |

### 快速开始

1. 启动 NiLLM
2. 进入 **Models** 页面添加 API 密钥
3. 前往 **Arena** 选择要比较的模型
4. 输入提示词，实时查看多模型响应

### 技术栈

- **Tauri 2** — Rust 后端，原生性能
- **React 19** — TypeScript 现代前端
- **Tailwind CSS 4** — 实用优先的样式方案
- **Zustand** — 轻量级状态管理

### 开发

```bash
pnpm install
pnpm tauri dev
```

### 许可证

[MIT](./LICENSE)

---

_Simplicity is the ultimate sophistication._ | _简洁是极致的精妙。_
