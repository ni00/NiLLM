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

Linux AppImages built by the release workflow include update information for [AppImageUpdate](https://github.com/AppImageCommunity/AppImageUpdate). Open the AppImage with AppImageUpdate to check for and download updates. Stable builds follow the latest stable release; nightly builds follow the published `nightly` release. Each AppImage is published with a matching `.AppImage.zsync` file. Older builds without update information (including v1.0.9) need one manual download of a newer build first.

## Development

Requires Node.js 24+, pnpm 11 and Rust stable. Linux desktop builds also require WebKitGTK 4.1 development libraries.

```bash
pnpm install --frozen-lockfile
pnpm tauri:dev   # desktop app
pnpm dev         # browser frontend
```

[MIT License](./LICENSE)
