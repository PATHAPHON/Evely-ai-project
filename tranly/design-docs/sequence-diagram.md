# Sequence Diagram — Core Flows

Covers the three core interactions: sending a chat turn (grammar + budget-gated LLM), tapping a word for its cached detail, and a refresh mini-game updating SM-2 progress.

## Chat turn (premium path)

```mermaid
sequenceDiagram
    actor User
    participant UI as ChatScreen
    participant Grammar as /api/grammar (KKU)
    participant Chat as /api/chat (OpenRouter)
    participant DB as Supabase (RPC + tables)

    User->>UI: Send message
    UI->>DB: upsert conversations + user message
    UI->>Grammar: POST {text} (premium only)
    Grammar->>DB: check_budget(premium)
    Grammar-->>UI: {englishText, grammarCorrect, grammarNotes}
    Note over Grammar,DB: after() debit_budget(tokens × kku)
    UI->>UI: Patch user bubble with correction
    UI->>Chat: POST {messages(last 20), language}
    Chat->>DB: check_budget(limit)
    alt no budget
        DB-->>Chat: false
        Chat-->>UI: 429 → budget banner
    else has budget
        Chat-->>UI: JSON sentences (+suggestions / X-Suggestions-Locked)
        Note over Chat,DB: after() debit_budget(tokens × openrouter)
        UI->>UI: translateBatchToThai + render
        UI->>DB: save assistant message
    end
```

## Word detail lookup + save

```mermaid
sequenceDiagram
    actor User
    participant WR as WordRenderer
    participant API as /api/word-detail (KKU)
    participant Cache as ai_word_detail_cache
    participant Bank as useWordBank → words / word_progress

    User->>WR: Tap a word
    WR->>API: POST {word, language}
    API->>Cache: SELECT by cache_key (SHA-256)
    alt cache hit (or word+language fallback)
        Cache-->>API: response_json
    else miss
        API->>API: KKU DeepSeek generate detail
        Note over API,Cache: after() debit_budget + upsert cache
    end
    API-->>WR: {thai, definition, partOfSpeech, tense, usage}
    WR-->>User: Show WordDetailPopup
    opt Save word
        User->>Bank: addWord()
        Bank->>Bank: insert words + word_progress (initial SM-2)
    end
```

## Refresh mini-game → SM-2 review

```mermaid
sequenceDiagram
    actor User
    participant Game as Matching/Typing/Speak
    participant Q as quality.ts
    participant Bank as useWordBank
    participant DB as word_progress

    User->>Game: Play round on a due word
    Game->>Q: score(performance)
    Q-->>Game: quality 0–5
    Game->>Bank: reviewWord(wordId, quality)
    Bank->>Bank: recalculateProgress (SM-2)
    Bank->>DB: update box/interval/ease/next_review_at
    DB-->>Bank: ok
    Bank-->>User: next round / summary
```
