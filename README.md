# NiLLM

[中文](./README.zh-CN.md) · English

Compare AI models by answer quality, speed and cost in one workspace. Available on Windows, macOS, Linux and Android, with support for cloud APIs and local model servers.

![Model arena](./assets/demo1.png)

## Features

- **Model arena**: Send the same prompt to multiple models and compare streaming responses side by side. Each model keeps its own conversation history. Image input and generation are available where supported by the model and API.
- **Batch experiments**: Combine test sets, models, parameter groups and repetitions to compare configurations. Cases run independently with saved configuration snapshots. Pause, resume or retry failed tasks.
- **Answer evaluation**: Rate answers manually, check expected answers with exact, substring or JSON matching, or select a judge model to score anonymous answers for accuracy, instruction following and completeness.
- **Structured decisions**: Define questions and criteria for judgment, choice and scoring tasks. Compare decisions, probabilities and confidence across models.
- **Performance and cost**: Track time to first token, generation speed, total duration, success rate, token usage, cache hit rate and cost. API-reported values are distinguished from estimates; costs use your configured model prices.
- **Models and test materials**: Connect OpenAI, Anthropic, Gemini, DeepSeek, OpenRouter and other providers, custom OpenAI-compatible endpoints, or local Ollama and LM Studio servers. Reuse prompts, test sets and parameter presets.
- **Reports and backups**: Export Markdown, HTML, CSV or JSON reports, and back up or restore your data. Settings and records stay on your device; model requests go to your configured services.

## Get started

1. Download the package for your platform from [Releases](https://github.com/ni00/NiLLM/releases/latest).
2. Add a provider on the **Models** page and configure its API endpoint, key and models. For local models, start your Ollama or LM Studio server first.
3. Select models in the **Arena** and send a prompt. For batch evaluations, prepare cases under **Tests**, then create an **Experiment**.

Cloud models use your own API credentials and are billed by the provider. Support for images, sampling parameters and usage metrics depends on the model and API.

Linux AppImages support [AppImageUpdate](https://github.com/AppImageCommunity/AppImageUpdate) from v1.1.0 onward. Earlier versions require one manual upgrade first.

## Development

Built with Tauri 2, Rust, React and TypeScript. Requires Node.js 24+ and pnpm 11. Running or building the desktop app also requires Rust stable; Linux needs system development dependencies including WebKitGTK 4.1.

```bash
pnpm install --frozen-lockfile
pnpm tauri:dev   # desktop app
pnpm dev         # browser frontend
pnpm check       # type checking, lint and unit tests
pnpm tauri build # desktop packages
```

[MIT License](./LICENSE)
