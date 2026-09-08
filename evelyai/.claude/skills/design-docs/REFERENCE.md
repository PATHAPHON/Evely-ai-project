# Document Templates

Each generated file must follow the structure below. Headings are fixed; fill the content per project. Replace bracketed `[…]` placeholders. Delete a section only if it genuinely does not apply, and say so in one line rather than leaving it empty.

---

## requirements.md

```markdown
# Requirements — [Project Name]

## Overview
[1–3 sentences: what the project is and the problem it solves.]

## Goals & Non-Goals
- **Goals:** [bullet list]
- **Non-goals:** [explicitly out of scope]

## User Stories
- As a [role], I want to [action] so that [benefit].

## Functional Requirements
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | [what the system must do] | Must / Should / Could |

## Non-Functional Requirements
| ID | Category | Requirement |
|----|----------|-------------|
| NFR-1 | Performance / Security / Availability / … | [target] |

## Constraints & Assumptions
- [tech stack, platform, regulatory, or external dependencies]

## Open Questions
- [anything unresolved]
```

---

## flowchart.md

High-level process / control flow. One main flow per chart.

```markdown
# Flowchart — [Process Name]

[1 sentence describing the flow.]

\`\`\`mermaid
flowchart TD
    Start([Start]) --> Step1[Do something]
    Step1 --> Decision{Condition?}
    Decision -->|Yes| Step2[Path A]
    Decision -->|No| Step3[Path B]
    Step2 --> End([End])
    Step3 --> End
\`\`\`
```

Guidance: `flowchart TD` (top-down) by default. Use `([rounded])` for start/end, `[rect]` for steps, `{diamond}` for decisions. Label decision edges.

---

## database-design.md

Entity-relationship model.

```markdown
# Database Design — [Project Name]

[1 sentence on the data model.]

\`\`\`mermaid
erDiagram
    USER ||--o{ ORDER : places
    ORDER ||--|{ ORDER_ITEM : contains
    USER {
        uuid id PK
        text email
        timestamptz created_at
    }
    ORDER {
        uuid id PK
        uuid user_id FK
        numeric total
    }
\`\`\`

## Tables
### user
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| email | text | unique, not null | |

[repeat per table]
```

Guidance: show PK/FK in the ER block. Cardinality: `||--o{` (one-to-many), `}o--o{` (many-to-many), `||--||` (one-to-one). The per-table tables give types/constraints the diagram can't.

---

## sequence-diagram.md

Interaction over time between actors/services for a key flow.

```markdown
# Sequence Diagram — [Flow Name]

[1 sentence: which interaction this covers.]

\`\`\`mermaid
sequenceDiagram
    actor User
    participant Client
    participant API
    participant DB

    User->>Client: action
    Client->>API: POST /endpoint
    API->>DB: query
    DB-->>API: rows
    API-->>Client: 200 + payload
    Client-->>User: render
\`\`\`
```

Guidance: `->>` request, `-->>` response. Use `alt`/`opt`/`loop` blocks for branches and retries. One flow per diagram; add more files or more diagrams for other flows.

---

## class-diagram.md

Static structure — classes/modules and their relationships.

```markdown
# Class Diagram — [Project Name]

[1 sentence on the structure shown.]

\`\`\`mermaid
classDiagram
    class User {
        +string id
        +string email
        +login() bool
    }
    class Order {
        +string id
        +calcTotal() number
    }
    User "1" --> "*" Order : places
\`\`\`
```

Guidance: `+` public, `-` private, `#` protected. Relationships: `-->` association, `--|>` inheritance, `--*` composition, `--o` aggregation. For non-OO codebases, model modules/services as classes and exported functions as methods.
```
