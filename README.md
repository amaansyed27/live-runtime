# Live Runtime

Live Runtime is a tray-native local AI companion built around Ollama. It runs as a cross-platform Tauri desktop app for macOS, Windows, and Linux, with a companion dashboard UI for chatting, voice control, runtime status, and model selection.

## What this scaffold includes

- **Ollama provider first:** local `http://localhost:11434` chat and model discovery.
- **Cross-platform desktop shell:** Tauri v2 app with a system tray menu and hide-to-tray behavior.
- **Companion dashboard:** React + TypeScript + Vite dashboard with a minimal offwhite-green theme, motion, and responsive panels.
- **Voice I/O abstraction:** browser speech recognition where Web Speech is available, OS-native speech output through Tauri commands.
- **Modular monorepo:** apps and reusable packages are separated instead of being bundled into one large app.
- **Security-first defaults:** localhost-only Ollama endpoint, restricted CSP, typed provider interfaces, and no remote API keys.

## Monorepo layout

```txt
apps/
  dashboard/       React companion dashboard UI
  desktop/         Tauri desktop shell, tray, native speech commands
packages/
  core/            Ollama provider, chat runtime, settings, browser voice adapters
docs/
  ARCHITECTURE.md  System design and runtime boundaries
  SECURITY.md      Security notes and local-first assumptions
```

## Requirements

- Node.js 20+
- pnpm 10+
- Rust stable
- Ollama installed and running locally
- At least one Ollama model pulled, for example:

```bash
ollama pull llama3.2
```

## Install

```bash
pnpm install
```

## Run dashboard only

```bash
pnpm dev
```

## Run desktop app with tray

```bash
pnpm desktop
```

The desktop app starts the dashboard inside a Tauri window. Closing the window hides it to the system tray instead of quitting.

## Build

```bash
pnpm build
pnpm --filter @live-runtime/desktop tauri build
```

## Current voice behavior

- **Input:** uses browser/WebView speech recognition when the platform exposes it, otherwise the dashboard keeps typed input as the fallback.
- **Output:** uses native OS speech commands from Rust:
  - macOS: `say`
  - Windows: PowerShell + `System.Speech.Synthesis`
  - Linux: `spd-say`, with `espeak` fallback

## Next hardening steps

1. Add a dedicated native speech-to-text plugin for platforms where Web Speech is unavailable.
2. Add local encrypted settings storage.
3. Add background wake-word support as an optional capability.
4. Add signed release pipelines for Windows, macOS, and Linux.
