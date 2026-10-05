# NiLLM

[中文](./README.zh-CN.md) · English

A desktop app for comparing and testing AI models.

![Model arena](./assets/demo1.png)

## Features

- Compare multiple models on conversations and decision tasks, with image input and generation.
- Run batch tests, compare parameters and rate results; view speed, token usage, cost and cache hit rate.
- Manage providers, models, prompts and test sets locally, with import and export.

## Get started

Download the app from [Releases](https://github.com/ni00/NiLLM/releases). Configure a provider on the Models page, then select models in the Arena to start comparing.

## Development

Requires Node.js 24+, pnpm 11 and Rust stable. Linux desktop builds also require WebKitGTK 4.1 development libraries.

```bash
pnpm install --frozen-lockfile
pnpm tauri:dev   # desktop app
pnpm dev         # browser frontend
```

[MIT License](./LICENSE)
