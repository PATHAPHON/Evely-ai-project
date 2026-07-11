# Class Diagram — Tarnly

The codebase is a Next.js app, not OO. Below, core domain types, React hooks, pure utilities, and API route handlers are modelled as classes; exported functions/handlers as methods. Grouped by domain; only the primary members are shown.

```mermaid
classDiagram
    %% ─── Domain types ───
    class ChatMessage {
        +string id
        +string role
        +string englishText
        +string translation
        +ReplySuggestion[] suggestions
        +bool grammarCorrect
        +string grammarNotes
        +string status
    }
    class WordBankEntry {
        +string id
        +string word
        +string thai
        +int box
        +int interval
        +number easeFactor
        +int repetitions
        +Date nextReviewAt
    }
    class ConversationSessionRecord {
        +string id
        +string topic
        +bool completed
    }

    %% ─── Chat hooks ───
    class useConversationSession {
        +ChatMessage[] messages
        +startSession(config)
        +sendMessage(text)
        +restoreSession(id, lang)
    }
    class useChatApi {
        +callChatApi(msgs, lang) ChatSuccessResponse
    }
    class useConversationHistory {
        +loadSessions()
        +loadSessionMessages(id)
        +saveSession() saveMessage()
    }

    %% ─── Word hooks / SR ───
    class useWordBank {
        +WordBankWord[] words
        +addWord(word)
        +removeWord(id)
        +reviewWord(id, quality)
        +getStatus(word) WordStatus
    }
    class spacedRepetition {
        +recalculateProgress(state, q) RecalculatedProgress
        +createInitialProgress()
    }
    class wordStatusDerivation {
        +deriveWordStatus(word, bank, rejected) WordStatus
    }
    class refreshQuality {
        +matchingQuality(mistakes) int
        +typingQuality(input, target) int
        +speakQuality(attempts, gotIt) int
    }

    %% ─── API routes ───
    class ChatRoute {
        +POST() Response
    }
    class GrammarRoute {
        +POST() Response
    }
    class WordDetailRoute {
        +POST() Response
    }
    class TranslateRoute {
        +POST() Response
    }
    class TtsRoute {
        +POST() Response
    }
    class SttRoute {
        +POST() Response
    }
    class StripeRoutes {
        +createCheckoutSession()
        +portal()
        +webhook()
    }
    class AccountDeleteRoute {
        +DELETE() Response
    }
    class requireUser {
        +getRequestUser() User
        +checkBudget(limit) bool
        +debitBudget(cost)
    }
    class BudgetRPC {
        +check_budget(limit) bool
        +debit_budget(cost) void
    }

    %% ─── Relationships ───
    useConversationSession --> useChatApi : uses
    useConversationSession --> useConversationHistory : persists via
    useConversationSession --> ChatMessage : produces
    useChatApi ..> ChatRoute : POST /api/chat
    useConversationSession ..> GrammarRoute : POST /api/grammar
    useWordBank --> WordBankEntry : manages
    useWordBank --> spacedRepetition : reviews via
    useWordBank --> wordStatusDerivation : derives status
    useWordBank ..> WordDetailRoute : POST /api/word-detail
    refreshQuality ..> useWordBank : feeds reviewWord
    ChatRoute --> requireUser : gates
    GrammarRoute --> requireUser : gates
    WordDetailRoute --> requireUser : gates
    requireUser ..> BudgetRPC : rpc
    StripeRoutes --> BudgetRPC : updates profiles
```

Guidance: `-->` association/usage, `..>` HTTP/RPC dependency. Hooks live under `app/**/_lib/hooks`; pure utilities under `app/**/_lib/utils`; route handlers under `app/api/**/route.ts`; `BudgetRPC` is the Supabase `SECURITY DEFINER` pair in `supabase/migrations/budget_rpcs.sql`. Chat/TTS/STT call OpenRouter; grammar/word-detail/translate call KKU DeepSeek.
