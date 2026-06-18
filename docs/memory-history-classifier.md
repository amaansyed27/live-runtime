# Memory-History Classifier

Live Runtime uses a routing layer before saving memory. The goal is to avoid treating every message the same way.

## Flow

```mermaid
flowchart TD
    A[Incoming text] --> B[Memory classifier]
    B --> C[Class]
    B --> D[Topic tags]
    B --> E[Content hash]
    B --> F[Term hashes]
    C --> G[Save enriched memory]
    D --> G
    E --> G
    F --> G
    G --> H[SQLite memory table]
    H --> I[Fast local retrieval]
```

## Classes

The first version supports:

```text
chatHistory      normal conversation context
preference       stable user preference
projectMemory    repo, branch, UI, bug, architecture decisions
actionRequest    user asks the assistant to do something
skillCandidate   repeated workflow that can become a reusable skill
```

## Topics

The classifier also adds lightweight topic tags:

```text
memory
voice
pc-control
ui
repo
local-models
```

## Indexes

Each saved memory gets:

```text
memoryClass
contentHash
searchHashes
topic tags
class tags
term hash tags
```

The hash index is cheap and local. It lets retrieval work quickly even when the embedding model is unavailable or slow.

## Retrieval order

```mermaid
flowchart TD
    A[User query] --> B[Build query index]
    B --> C[Term hash search]
    B --> D[Topic search]
    B --> E[Class boost]
    A --> F[Optional embedding search]
    C --> G[Merge scores]
    D --> G
    E --> G
    F --> G
    G --> H[Top memories]
```

## Design rule

Embeddings should improve recall, but the app should still feel fast without them. The classifier/hash index is the baseline. Vectors are the upgrade layer.
