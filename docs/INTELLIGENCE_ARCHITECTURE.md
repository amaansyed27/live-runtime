# Live Runtime Intelligence Architecture

Live Runtime should become a local assistant with durable recall, not a stateless chat app.

## Core ideas

- Keep one continuous assistant experience.
- Store chats, actions, routines, documents, web reads, preferences, and skills locally.
- Retrieve only relevant context before a response.
- Promote repeated workflows into reviewable skills.
- Keep web reading and desktop actions behind approval.

## Storage model

Use SQLite for local structured storage.

Suggested tables:

```text
memories
memory_tags
profile_entries
skills
routines
sources
```

Use a vector index beside SQLite records for semantic recall. Good first target: SQLite plus a vector extension such as sqlite-vec.

## Embeddings

Use a local embedding model through Ollama. Each stored memory can keep:

```text
id
kind
scope
title
content
source
confidence
tags
created_at
updated_at
embedding_model
vector
```

## Runtime loop

```text
user message
  -> classify intent
  -> retrieve related memories
  -> retrieve matching skills
  -> create compact context packet
  -> answer or propose action
  -> save new turn
  -> update profile / skill candidates when useful
```

The chat model should receive a compact context packet, not the full database.

## Profile learning

Profile entries should be structured and evidence-backed:

```text
label: Preferred UI style
value: compact, rounded, modern, low text density
confidence: 0.92
evidence: memory ids
```

The user should be able to inspect, edit, disable, or delete profile entries.

## Skill learning

Skills should be generated from repeated behavior.

```text
candidate -> draft -> approved -> ready -> updated / disabled
```

Example:

```text
Skill: UI Polish Pass
Trigger: user asks to improve app UI
Rule: reduce text density, improve hierarchy, preserve visual direction
```

## Web search

Primary free search path: configurable SearXNG-compatible endpoint.

Flow:

```text
search needed
  -> call search endpoint
  -> show sources
  -> read approved pages
  -> summarize with citations
  -> store source-backed memory
```

Rules:

- Prefer official sources.
- Respect robots.txt and site terms.
- Rate-limit reads.
- Cache repeated reads.
- Store source URLs with memory records.

## UI split

- Chat: live conversation.
- Settings: model, theme, companion, startup, voice.
- Routines: scheduled prompts.
- Skills: reusable learned capabilities.
- Intelligence: profile, vector recall, reflections, and database health.

## Milestones

1. Add SQLite in the Tauri backend.
2. Add vector index.
3. Add Ollama embedding client.
4. Save every chat turn.
5. Retrieve before answering.
6. Extract profile entries.
7. Extract skill candidates.
8. Add approval UI.
9. Add web search and page reader.
10. Add memory management controls.
