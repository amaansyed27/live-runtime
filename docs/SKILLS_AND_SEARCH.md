# Skills and Search Architecture

Live Runtime separates three concepts:

1. **Chat context** — the active conversation, kept until the user starts a new chat.
2. **Routines** — scheduled prompts, similar to Codex automations. Example: “Send me a news brief every day at 8 AM.”
3. **Skills** — reusable capabilities the companion learns over time. Example: “When Amaan asks for documentation cleanup, use this markdown structure.”

## Why skills should not live in the system prompt

A small local model such as `qwen3.5:4b` should not be overloaded with a massive permanent prompt. Skills should live as external memory and be retrieved only when useful.

Recommended structure:

```text
runtime-memory/
  skills.md
  skills/
    docs-cleanup.md
    web-research.md
    user-preferences.md
  routines.json
  profile.json
```

## Skill lifecycle

```text
Observe repeated behavior
  -> propose a skill
  -> user approves or edits
  -> save to skills.md / skill file
  -> retrieve only when relevant
```

The app should eventually show these states:

- Draft
- Learning
- Ready
- Disabled

## Free web search layer

Primary free option: **SearXNG-compatible search**.

SearXNG supports `/search` with `q` and `format=json`, but public instances may disable JSON output. For reliability, Live Runtime should let the user configure either:

- a self-hosted SearXNG instance, or
- a trusted public instance that allows JSON.

The core package now has a small `searchWithSearxng` client. It should later be called by an approved agent action, not automatically on every chat turn.

## Scraping and reading pages

Search should only return links and snippets. Page reading should be a separate approved action:

```text
Search web
  -> show sources
  -> user approves page read
  -> fetch page
  -> extract readable content
  -> summarize with citations
```

Rules:

- Prefer official APIs and open docs.
- Respect robots.txt and site terms.
- Rate-limit requests.
- Cache repeated reads.
- Keep source URLs with every answer.

## Recommended agent flow

```text
User asks question
  -> classify: chat / routine / skill / search / desktop action
  -> retrieve relevant skills
  -> ask permission for web or desktop action
  -> execute minimal action
  -> summarize result
  -> optionally propose new skill
```

This keeps the companion growing without becoming an unsafe uncontrolled automation system.
