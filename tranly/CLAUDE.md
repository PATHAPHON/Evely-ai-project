# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ This is NOT the Next.js you know

This project pins **Next.js 16** (and React 19), which has breaking changes — APIs,
conventions, and file structure may differ from your training data. **Read the
relevant guide in `node_modules/next/dist/docs/` before writing any code that
touches the framework**, and heed deprecation notices. (See `AGENTS.md`.)

## ⚠️ Design system is mandatory

`design.md` defines a **Neobrutalist / illustration** design system that all pages
**must** follow: hard `3px` solid `#2C2C2C` borders, flat offset shadows
(`4px 4px 0 #2C2C2C`, no blur), warm cream canvas (`#FFF9F0`), and saturated accent
colors. It is implemented as the `useIllustrationTheme` hook
(`app/theme/illustrationTheme.ts`) injected via Ant Design's `<ConfigProvider>` +
`antd-style`. Read `design.md` before building or restyling any UI.

## Commands

```bash
npm run dev          # dev server, --webpack, bound to 0.0.0.0
npm run dev:https    # dev over HTTPS using ./certificates/*.pem (needed for camera/PWA on device)
npm run build        # production build
npm run start        # serve the production build
npm run lint         # eslint (next core-web-vitals + typescript configs)
npm test             # vitest --run (single pass)

npx vitest <path>                 # run one test file in watch mode
npx vitest --run <path>           # run one test file once
npx vitest -t "<name>"            # run tests matching a name
```

Tests use **vitest + jsdom**, with `fake-indexeddb` and `fast-check` (property
testing) available. The `@/*` path alias maps to the repo root in both `tsconfig`
and `vitest.config.ts`. Test files are **colocated** next to source (`*.test.ts(x)`
or under `__tests__/`).

## Architecture

A Next.js App Router PWA for learning languages (Korean/Japanese/Chinese/English)
from photos, chat, lessons, and flashcards. Ant Design v6 + Tailwind v4 for UI.

### Feature-folder convention
Each route under `app/<feature>/` owns its code via private folders Next.js does
not route: `_components/` (UI) and `_lib/` (hooks, pure logic, types). Shared
cross-feature code lives in `app/_components/` and `app/_lib/`. Pure logic and
hooks are extracted into `_lib` specifically so they can be unit-tested without
rendering.

### Two data layers
- **IndexedDB is the primary client-side store** — see `app/_lib/db.ts`. It defines
  all object stores (captures, flashcards, words, conversations, lessons, study
  sessions, …) and uses **versioned migrations** (`DB_VERSION`); bump the version
  and add an upgrade path when changing the schema. Records carry a `language`
  field and are queried through a `language` index (`queryByLanguage`). Feature
  hooks like `useWordStorage`, `useFeedStorage`, `useImageStorage` wrap it.
- **Supabase** (`app/_lib/supabaseClient.ts`) provides **auth and cloud sync**.
  Auth state and route protection are centralized in
  `app/_components/AppProviders.tsx` (redirects unauthenticated users to `/auth`,
  treating only `/` and `/auth` as public). The active-language preference also
  syncs to Supabase via `ActiveLanguageContext`.

### Global providers
`app/layout.tsx` → `AppProviders` wraps the tree in `GemsProvider` (gamification
currency) and `ActiveLanguageProvider` (the currently selected target language).
Read the active language with the `ActiveLanguageContext`; most data is scoped to it.

### Multi-language model — important gotcha
`TargetLanguage = 'english' | 'japanese' | 'korean' | 'chinese'`. Word records are
a **discriminated union** keyed on `language` (`app/_lib/wordTypes.ts`), each with
language-specific fields (hangul/thaiReading, kanji/hiragana, hanzi/pinyin, word/ipa).

Note: in the **AI prompt/response layer** (`app/api/_lib/languagePrompt.ts` and
chat/lesson responses) the legacy field names `korean` / `reading` / `romanization`
are **repurposed generically** — `korean` = target-language text, `reading` =
pronunciation in Thai-script "karaoke". Don't assume those fields mean Korean.

### AI features go through `app/api/*` route handlers
Routes (`chat`, `translate`, `lesson`, `feed`, `identify`, `flashcard/select`,
`tts`, `chat/suggest-topic`) proxy to external services so secrets stay server-side:
- **KKU IntelSphere API** (`gen.ai.kku.ac.th`) for chat/translate/lesson generation.
- **Google Cloud Text-to-Speech** for pronunciation (falls back to Web Speech API
  if `GOOGLE_TTS_API_KEY` is unset).

Each route validates input, enforces length/timeout limits, and returns a typed
`{ error: { type, message } }` shape on failure. AI parsing/prompt logic is split
into testable helpers (e.g. `parseChatResponse`, `buildContext`, `languagePrompt`).

**Per-user AI credentials:** the client reads an API key/model from `localStorage`
(`tarnly:ai-api-key`, `tarnly:ai-model`) via `getCustomAIHeaders()` and sends them
as `x-custom-api-key` / `x-custom-model` headers; routes prefer these over env.

### Backoffice & TOPIK
- `app/backoffice/` is a small admin area (lessons, topik) with its own `layout.tsx`.
- TOPIK (Korean proficiency exam) content lives in `app/home/_lib/topik/` — question
  banks are static JSON (`topik1Questions.json`, `topik2Questions.json`) selected/filtered
  by pure helpers (`selectQuestions`, `filterSets`, `useTopikExam`); the exam runner
  route is `app/topik/[examId]/`.

### PWA
This is an installable PWA: `app/manifest.ts` (start_url `/home`, standalone) plus a
service worker at `public/sw.js` that `layout.tsx` registers in production and
**unregisters in development** (so stale SW caching doesn't break dev).

### Theming & i18n strings
Dark mode is class-based (`darkMode: "class"`). An inline script in `layout.tsx`
applies the `dark` class from `localStorage['tarnly:theme']` before paint to avoid
flash. User-facing strings live in `app/_lib/strings.ts`.

## Environment
Copy `.env.example` → `.env.local`. Keys: `KKU_API_KEY`, `GOOGLE_TTS_API_KEY` /
`GOOGLE_TTS_VOICE`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
The Supabase client falls back to placeholders (with a warning) if unset.
