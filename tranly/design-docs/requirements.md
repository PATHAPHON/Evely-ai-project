# Requirements — Tarnly

## Overview
Tarnly is a mobile-first web app (Next.js 16 PWA) that helps Thai speakers learn English. Learners chat with an AI conversation partner, tap any word to get an LLM-generated detail card, save words into a personal bank, review them with spaced repetition (SM-2) and mini-games, and practise listening/speaking via TTS/STT. Free and premium tiers are gated by a per-user **daily AI spend budget in micro-baht (µ฿)**, with Stripe billing.

## Goals & Non-Goals
- **Goals:**
  - Conversational English practice with an AI friend that always replies in the target language.
  - Tappable reply suggestions (premium) and premium grammar correction of the user's own messages.
  - One-tap word capture from chat into a personal `words` bank, with status colouring (unknown/known/needs_review/rejected).
  - On-demand word detail (Thai meaning, definition, part of speech, tense, example) cached permanently and shared across users to cut LLM cost.
  - Spaced-repetition review (SM-2) plus "refresh" mini-games (matching, typing, speak) that feed quality scores back into SM-2.
  - English→Thai translation, text-to-speech, and speech-to-text.
  - Tiered daily AI budget enforced server-side; Stripe checkout/portal/webhook for premium.
  - Account/data deletion (PDPA).
- **Non-goals:**
  - Languages other than English as the learning target (`TargetLanguage = 'english'` only; the type system anticipates more but everything is hard-locked).
  - Native mobile apps (web/PWA only).
  - Long-term storage of raw chat messages (purged after 3 days via `pg_cron`).
  - Guest/anonymous mode (removed — anonymous users are treated as logged-out).

## User Stories
- As a learner, I want to chat with an AI friend in English so that I can practise conversation.
- As a learner, I want tappable reply suggestions (premium) so that I know what to say next.
- As a premium learner, I want my messages grammar-checked and corrected so that I learn from mistakes.
- As a learner, I want to tap any word to see its meaning/details so that I understand it.
- As a learner, I want to save words and review them later with spaced repetition.
- As a learner, I want quick mini-games to refresh due words so that review feels less tedious.
- As a learner, I want to hear words/sentences spoken and to speak back so that I practise pronunciation.
- As a learner, I want to revisit recent conversations so that I can continue them.
- As a learner, I want to upgrade to premium so that I get higher daily limits, suggestions, and grammar check.
- As a learner, I want to reset my data or delete my account so that my privacy is respected.

## Functional Requirements
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | Authenticate via Supabase Auth; auto-create a `profiles` row on first load; protect `/words /chat /new /recents /profile /refresh` via middleware | Must |
| FR-2 | `POST /api/chat` (OpenRouter Gemini): reply as JSON `sentences` in target language; premium gets `suggestions` | Must |
| FR-3 | Enforce daily budget via `check_budget` RPC before each LLM call; debit actual token cost after via `debit_budget` in `after()` | Must |
| FR-4 | Lock suggestions for free tier (`X-Suggestions-Locked` header); return 429 + budget banner when budget exhausted | Must |
| FR-5 | `POST /api/grammar` (OpenRouter Gemini, premium-only): correct/translate the user's message, return `grammarCorrect`/`grammarNotes` | Should |
| FR-6 | `POST /api/word-detail` (OpenRouter Gemini): serve from permanent `ai_word_detail_cache` (SHA-256 key incl. prompt version) or generate + cache | Must |
| FR-7 | `POST /api/translate` (OpenRouter Gemini): batch English→Thai, index-aligned | Should |
| FR-8 | `POST /api/tts` (OpenRouter Kokoro): synthesize speech, voice-whitelisted, in-memory FIFO cache (500 entries) | Should |
| FR-9 | `POST /api/stt` (OpenRouter Whisper): transcribe recorded audio to text | Could |
| FR-10 | Word bank: add/remove words, derive status, store SM-2 progress in `word_progress`; review updates progress | Must |
| FR-11 | Refresh mini-games (matching/typing/speak) score performance → SM-2 quality (0–5) → `reviewWord` | Should |
| FR-12 | Persist conversations lazily (row on first message; first message = title) and list recents; resume by `sessionId` | Must |
| FR-13 | Stripe: `create-checkout-session`, `portal`, `webhook` (sets `subscription_status`, dedup via `stripe_events`) | Must |
| FR-14 | `DELETE /api/account/delete` (service-role cascade) and in-app data reset | Must |

## Non-Functional Requirements
| ID | Category | Requirement |
|----|----------|-------------|
| NFR-1 | Performance | LLM routes `maxDuration = 60s`; per-call abort 15–30s; chat context capped to last 20 messages (`MAX_CONTEXT_MESSAGES`) |
| NFR-2 | Cost control | Daily budget fail-closed (block on DB error); word-detail DB cache permanent; TTS in-memory cache; reasoning disabled on LLM calls |
| NFR-3 | Security | RLS on all user tables; service-role used only server-side (webhook, account delete); open-redirect guard in middleware; Stripe webhook signature verified |
| NFR-4 | Privacy | `conversation_messages` auto-purged after 3 days via `pg_cron` |
| NFR-5 | Availability | Stripe webhook idempotent against duplicate events |
| NFR-6 | Usability | Mobile-first, installable PWA (`manifest.ts`, `public/sw.js`); light/dark theme |

## Constraints & Assumptions
- Stack: Next.js 16 (App Router, React 19), TypeScript, Tailwind v4, Supabase (Postgres + Auth), Stripe, Vitest.
- **AI provider:** OpenRouter (LLM = Google Gemini 3.1 Flash Lite, TTS = Kokoro-82M, STT = Whisper-large-v3). Token cost in µ฿/token: 2. Daily budget: free 20,000 µ฿, premium 50,000 µ฿.
- Users may supply their own key/model via `x-custom-api-key` / `x-custom-model` headers.
- Schema applied manually to Supabase; `supabase/migrations/*.sql` documents the live budget schema and the pg_cron cleanup.
- Single learning target language (English); UI language defaults to Thai (`th`).
- Stripe runs in mock mode when `STRIPE_SECRET_KEY === 'sk_test_mock'`.

## Open Questions
- Middleware lists `/tutor /topik /backoffice` as protected, but those routes don't exist on disk yet — planned features.
- Will additional target languages ship? The type system is built for it but `LANG_PROMPT`/`VALID_LANGUAGES` only contain `english`.
- `translateToThai` calls the server `/api/translate` (OpenRouter) — confirm intended source of truth.
- Some legacy JSON keys (`korean`) are still accepted in `parseChatResponse` for backward-compat; confirm when they can be dropped.
