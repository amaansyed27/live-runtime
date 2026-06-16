# Architecture

Live Runtime is split into three boundaries.

## 1. Desktop host

`apps/desktop` is the Tauri shell. It owns privileged OS behavior:

- system tray lifecycle
- native speech output
- hide/show dashboard window
- future native settings storage
- future global shortcut and wake-word permissions

The dashboard calls native behavior through typed Tauri commands instead of direct shell access.

## 2. Dashboard app

`apps/dashboard` is the companion UI. It is a Vite + React app that can run inside Tauri or as a standalone local web dashboard during development.

It owns:

- chat composition
- runtime status cards
- model picker
- browser speech recognition adapter
- UI state and transitions

## 3. Core package

`packages/core` contains provider-neutral runtime code:

- `AiProvider` interface
- Ollama REST client
- stream parsing
- message and model types
- browser voice adapters
- default runtime settings

The package is intentionally UI-free so a future CLI, mobile shell, or web companion can reuse the same runtime.

## Runtime flow

```txt
User voice/text
  -> Dashboard composer
  -> Core chat runtime
  -> Ollama provider on localhost
  -> streamed assistant response
  -> Dashboard transcript
  -> Tauri native speech command
  -> OS speech engine
```

## Provider strategy

Ollama is the first provider. The `AiProvider` interface keeps the runtime open to later providers without coupling them to the UI.

## Process model

Tauri runs a Rust host process and the dashboard runs in a WebView. The WebView may call only registered commands. Ollama traffic stays local by default at `localhost:11434`.
