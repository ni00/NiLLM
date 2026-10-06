# NiLLM

[中文](./README.zh-CN.md) · English

Compare AI models by answer quality, speed and cost in one local-first workspace. Runs on Windows, macOS, Linux and Android, against cloud APIs or local model servers.

![Model arena](./assets/demo1.png)

## Features

- **Model arena** — send one prompt to several models and compare streaming answers side by side. Each model keeps its own conversation history; image input and generation work where the model and API support them.
- **Batch experiments** — combine test sets, models, parameter groups and repetitions. Every case runs independently with a saved configuration snapshot, and you can pause, resume or retry failures.
- **Answer evaluation** — rate answers manually, check expected answers with exact, substring or JSON matching, or let a judge model score anonymous answers for accuracy, instruction following and completeness.
- **Structured decisions** — define questions and criteria for judgment, choice and scoring tasks, then compare decisions, probabilities and confidence across models.
- **Performance and cost** — time to first token, generation speed, duration, success rate, token usage, cache hit rate and cost. API-reported values are kept distinct from estimates.
- **Models and materials** — OpenAI, Anthropic, Gemini, DeepSeek, OpenRouter and other providers, custom OpenAI-compatible endpoints, and local Ollama or LM Studio servers. Prompts, test sets and parameter presets are reusable.
- **Reports and backups** — export Markdown, HTML, CSV or JSON, and back up or restore the workspace. Records stay on your device; model requests go only to the services you configure.

## Get started

1. Download the package for your platform from [Releases](https://github.com/ni00/NiLLM/releases/latest).
2. On **Models**, add a provider with its endpoint, key and models. For local models, start your Ollama or LM Studio server first.
3. Select models in the **Arena** and send a prompt. For batch evaluation, prepare cases under **Tests**, then create an **Experiment**.

Cloud models use your own credentials and are billed by the provider. Image support, sampling parameters and usage metrics depend on the model and the API.

## Development

Tauri 2, Rust, React 19, TypeScript, Zustand and Vite. Requires Node.js 24+, pnpm 11 and Rust stable; Linux also needs WebKitGTK 4.1 and the usual Tauri system packages.

```bash
pnpm install --frozen-lockfile
pnpm tauri:dev    # desktop app
pnpm dev          # frontend in a browser
pnpm check        # types, lint and unit tests
pnpm test:e2e     # end-to-end tests (Playwright)
pnpm tauri build  # desktop packages
```

### Layout

| Path               | Contents                                                                                                          |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `src/lib`          | Bottom layer: types, validation, provider catalog and transport, generation config, statistics, store and storage |
| `src/features/<x>` | One directory per feature: `domain/` is pure logic, `components/` and `hooks/` are UI                             |
| `src/pages`        | Route entry points, loaded lazily                                                                                 |
| `src/app`          | Router, navigation, providers, global hotkeys, queue processor                                                    |
| `src-tauri`        | Rust shell: plugin registration and Linux AppImage environment setup                                              |

Two Web Workers keep long-running work off the UI thread: generation streams (`src/lib/workers`) and Markdown parsing (`src/features/chat-arena/markdown`). The generation worker is an entry of the main bundle, so the window and the worker share a single copy of the provider SDK.

## License

[MIT](./LICENSE)
