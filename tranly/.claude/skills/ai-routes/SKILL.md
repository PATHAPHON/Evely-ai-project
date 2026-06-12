---
name: ai-routes
description: Conventions for building and modifying AI route handlers under app/api (chat, translate, lesson, identify, feed, word-detail, tts) in the tranly project. Use when adding a new API route, changing prompts, parsing AI responses, adding caching, or debugging AI route errors.
---

# AI Routes (app/api)

All AI features proxy through Next.js route handlers so secrets stay serv  er-side.
Upstream LLM: **KKU IntelSphere** (`https://gen.ai.kku.ac.th/api/v1/chat/completions`),
default model `deepseek-v4-flash`. TTS uses Google Cloud TTS with Web Speech fallback.

## Route handler checklist (every POST route follows this shape)

1. **Parse body defensively** — `await request.json()` in try/catch; validate field
   types manually (`typeof`), trim strings, enforce a `MAX_*_LENGTH` constant.
2. **Per-user credentials** — read headers first, fall back to env:
   ```ts
   const apiKey = request.headers.get('x-custom-api-key') || process.env.KKU_API_KEY;
   const model = request.headers.get('x-custom-model') || 'deepseek-v4-flash';
   ```
   Clients attach these via `getCustomAIHeaders()` (`app/_lib/getCustomAIHeaders.ts`,
   localStorage keys `tarnly:ai-api-key` / `tarnly:ai-model`).
3. **Timeout** — `AbortController` + `setTimeout(... , API_TIMEOUT_MS)` (30s typical);
   `clearTimeout` on both success and error paths.
4. **Typed error shape** — always `{ error: { type, message } }` via a local
   `errorResponse(type, message, status)` helper. Standard types/statuses:
   - `invalid_input` 400 · `api_error` 401 (missing key) / 502 · `rate_limit` 429
   - `timeout` 504 (AbortError) · `network_error` 502 (TypeError from fetch)
5. **Extract content** — upstream may return OpenAI-shaped JSON or raw text:
   `data?.choices?.[0]?.message?.content ?? data?.content`, fall back to raw body.

## Prompts & parsing

- Prompts demand **raw JSON only** (no markdown/fences/prose), state an explicit
  schema inline, and include 1–2 anchored examples.
- **Field-name gotcha**: `korean` = target-language text, `reading` = pronunciation
  in Thai-script karaoke (NOT the Thai meaning), `romanization` = scheme per
  language. Per-language wording comes from `LANG_PROMPT` in
  `app/api/_lib/languagePrompt.ts`; validate language with `isValidTargetLanguage`.
- Parsing lives in **testable pure helpers** colocated with the route
  (`parseChatResponse.ts`, `parseFeedResponse.ts`, `parseLessonResponse.ts`) with
  `*.test.ts` next to them. Parsers must survive malformed output: try
  `JSON.parse` first, then regex-extract fields (see `extractStringField` /
  `extractExamplesField` in `app/api/word-detail/route.ts`).

## Caching (feed, word-detail)

- Tables `ai_feed_pool_cache` / `ai_word_detail_cache` in Supabase (~3-day TTL),
  accessed with `supabaseServer` (service-role; **only** in route handlers).
- Cache key: `crypto.createHash('sha256')` over the inputs that affect output.
- Check cache before calling the AI; **write cache asynchronously** with
  `after(async () => { ... })` from `next/server` so the response isn't delayed.

## Special cases

- **`/api/feed` is NOT an AI route** — it reads `curated_feed_words`, resolves
  images (Pexels → LoremFlickr), filters `excludeWords`, and returns
  `{ words: [] }` when exhausted (never recycles duplicates).
- Next.js 16 / React 19 are pinned — check `node_modules/next/dist/docs/` before
  using framework APIs you're unsure about.

## Adding a new AI route

1. Create `app/api/<name>/route.ts` following the checklist above.
2. Extract prompt-building and response-parsing into pure functions; if shared
   across routes, put them in `app/api/_lib/`.
3. Write colocated vitest tests for the parser (happy path, fenced JSON,
   truncated/malformed output, empty content).
4. On the client, send `getCustomAIHeaders()` with the request and handle the
   `{ error: { type } }` union (esp. `rate_limit`, `timeout`).
