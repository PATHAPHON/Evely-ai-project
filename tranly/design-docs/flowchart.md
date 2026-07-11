# Flowchart — Send a Chat Message

A learner sends a message; premium messages are grammar-checked first, then the budget-gated chat call produces the AI reply, and the actual token cost is debited afterward.

```mermaid
flowchart TD
    Start([User sends message]) --> AddUser[Add user bubble, status pending]
    AddUser --> SaveRow[Lazy-create conversations row<br/>first message = title]
    SaveRow --> Premium{Premium?}
    Premium -->|Yes| Grammar[POST /api/grammar KKU<br/>correct + translate]
    Premium -->|No| Skip[Skip grammar]
    Grammar --> Chat
    Skip --> Chat[POST /api/chat OpenRouter]
    Chat --> Auth{Auth + budget?<br/>check_budget}
    Auth -->|401| ToAuth[Redirect /auth]
    Auth -->|429 no budget| Banner[Show budget banner, lock input]
    Auth -->|OK| Call[Call LLM, build context last 20 msgs]
    Call --> Resp{Upstream OK?}
    Resp -->|timeout/429/error| Err[Show error, remove pending bubble]
    Resp -->|Yes| Parse[parseChatResponse JSON]
    Parse --> Debit[after: debit_budget tokens × cost]
    Parse --> Translate[Translate sentences/suggestions to Thai]
    Translate --> Persist[Save assistant message]
    Persist --> Render[Render reply + tappable words + suggestions]
    Render --> End([End])
```

> Other primary flows — word capture → SM-2 review, word-detail cache lookup, refresh mini-games, and Stripe upgrade — are covered in `sequence-diagram.md`.
