# Security notes

Live Runtime is designed as a local-first AI app.

## Defaults

- Ollama endpoint defaults to `http://localhost:11434`.
- No cloud API key is required.
- The Tauri content security policy only allows local Ollama connections.
- Native OS operations are exposed through narrow Tauri commands.
- The dashboard does not execute model output as code.

## Threat model

The main risks are:

1. A user changing the Ollama endpoint to an untrusted remote host.
2. Overbroad native command permissions.
3. Prompt injection in future tool-use features.
4. Accidental speech output of sensitive content.

## Current mitigations

- Keep provider URL visible in the UI.
- Use a typed provider layer rather than ad-hoc fetch calls across components.
- Avoid filesystem access in this initial scaffold.
- Keep Tauri permissions minimal.

## Next steps

- Add endpoint allowlist controls.
- Add encrypted local settings.
- Add redaction controls before speech output.
- Add explicit permission prompts for global shortcuts, microphone capture, and filesystem access.
