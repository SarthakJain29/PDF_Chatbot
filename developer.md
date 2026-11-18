# developer.md

## Audit of the original project

**Intent:** a "RAG PDF chatbot": upload PDFs, ask questions, get answers grounded in them.

**Original stack:** Turborepo + Bun monorepo. `apps/api` (Express, MongoDB Atlas Vector Search, Cloudinary storage, OpenAI embeddings + `gpt-4o-mini` via Vercel AI SDK v3, Firebase Admin auth, SSE) and `apps/web` (Next 14, React Query, FirebaseUI). Shared `packages/{db,shared,eslint-config,typescript-config}`.

**What worked (in principle):** PDF upload → Cloudinary → range-fetch pdf.js → page chunks → embeddings → `$vectorSearch`; streaming chat via SSE with a tool-calling retrieval step; chat titles and rolling summaries.

**Broken / missing / problems**
- Could not run without four external paid or credentialed accounts (OpenAI, Atlas, Cloudinary, Firebase). No mock mode.
- `README.md` was a copy-pasted monorepo template ("business-os"); `.env.example` was incomplete/mis-documented (`EMBEDDING_DIMENSIONS` comments wrong, code uses 256).
- `stream-chat-message.ts`: system prompt was one malformed template literal with stray quotes (`'Use the…`) and an inline ternary rendered as literal text; `nowIST` was computed once at module load (stale timestamp); errors were persisted as assistant messages; message counters updated non-atomically.
- Citations were only text in the answer; no way to see the source page. No PDF viewer.
- No tests, no CI, committed `tsconfig.tsbuildinfo`, no error boundaries, minimal loading/empty states, generic UI.
- Old AI SDK (v3) and Next 14; leftover `TURBOREPO_GUIDE.md`.
- Free-tier deployability was poor (Atlas vector index setup, Cloudinary, Firebase service account).

## Research (what good products do)
- **ChatPDF / Humata**: page-level citations that link back into the document; Humata is praised for jumping to the exact section ([comparison](https://www.atlasworkspace.ai/blog/chatpdf-alternatives)).
- **NotebookLM**: numbered, clickable references, source toggling per notebook, but no in-PDF highlighting (per [reviews](https://paperguide.ai/blog/notebooklm-alternatives)). Gap Folio fills.
- **AnythingLLM**: workspaces, conversation vs query modes, in-chat citations linked to source text; self-hosted/private positioning.
- **PrivateGPT**: privacy/local-first as the headline selling point.
- **vibrant.design** (UI reference): minimal, content-first, big editorial headings, card grid, colour supplied by content. I adopted big display type, card-based layout and a single vivid violet→pink accent on a dark canvas.

Takeaways applied: clickable citations + highlight, per-document scoping, private-by-default, zero-setup demo.

## Decisions
1. **Rewrite as one Next.js 15 + TypeScript app** (drop monorepo, Express, Mongo, Cloudinary, Firebase, OpenAI). Why: the old design needed 4 accounts to run and couldn't be demoed or deployed free. A single app deploys to Vercel's free tier in one click.
2. **Local-first**: parse/chunk/index in the browser; store in IndexedDB. No database, no file hosting, no auth needed (data never leaves the device). Trade-off: library is per-browser.
3. **Retrieval = BM25 (not embeddings)**: free, instant, offline, deterministic and unit-testable; works well for document Q&A. Embeddings are on the roadmap behind the same `retrieve` interface.
4. **Provider abstraction** (`src/lib/llm`): Gemini and Groq via plain `fetch` (no SDK churn), ordered fallback chain ending in a mock. Retries on 429/5xx.
5. **Model defaults use aliases** (`gemini-flash-lite-latest`) because pinned model IDs were retired during testing (`gemini-2.0-flash` and `gemini-2.5-flash-lite` returned 404; Groq's `llama-3.3-70b-versatile` was gone, now `openai/gpt-oss-20b`). Override with `GEMINI_MODEL` / `GROQ_MODEL`.
6. Retrieval happens client-side; the server route is stateless and only forwards passages (max 8, 1800 chars each) to the LLM.
7. npm instead of Bun (works everywhere, simpler CI).
8. Tailwind v3 and pdfjs-dist 4.x chosen for stability with Next 15 bundling.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

### Environment variables (all optional)
| Var | Purpose | Get it |
| --- | --- | --- |
| `LLM_PROVIDER` | `auto` (default), `gemini`, `groq`, `mock` | n/a |
| `GEMINI_API_KEY` | Gemini free tier | https://aistudio.google.com/apikey |
| `GEMINI_MODEL` | override, default `gemini-flash-lite-latest` | n/a |
| `GROQ_API_KEY` | Groq free tier | https://console.groq.com/keys |
| `GROQ_MODEL` | override, default `openai/gpt-oss-20b` | n/a |

No keys → mock mode (extractive answers built from the retrieved passages, same streaming UX).

### Deploy (free)
Vercel Hobby: import the repo, set `GEMINI_API_KEY` and/or `GROQ_API_KEY` in Project → Settings → Environment Variables, deploy. No other services are required. (Netlify/Cloudflare Pages also work via the Next adapter; route uses the Node runtime.)

### Quality gates
`npm run lint && npm run typecheck && npm test && npm run build` (also in `.github/workflows/ci.yml`). Screenshots in `docs/screenshots` were captured with Playwright against a production build.

## Known issues
- Scanned/image-only PDFs have no text layer → rejected with a clear message (OCR on roadmap).
- Highlighting is a word-overlap heuristic over the pdf.js text layer; multi-column layouts may highlight neighbouring lines.
- Chats/library are per-browser (IndexedDB); clearing site data deletes them.
- Retrieval is lexical: paraphrased questions with no shared words can miss.
- Free-tier LLMs can return 503 under load; the chain falls back (and ultimately to mock). Both Gemini and Groq streaming paths were verified live against real keys during development.

## Blockers & workarounds
- vibrant.design fetch returned only page text (no CSS), so I took structure/mood cues only, not exact tokens.
- `gemini-2.0-flash` default 404'd and `gemini-flash-latest` returned 503 (overload) during testing → switched to the `flash-lite` alias and added retry/backoff plus provider fallback.
- `next lint` is deprecated in Next 15 → using the ESLint CLI.

## Progress
**Done:** audit, research, rewrite, provider chain + mock, BM25 retrieval, chunker, IndexedDB library, chat UI with streaming/stop/history/export, PDF viewer with highlights, theming, responsive layout, 21 unit tests, CI, docs, screenshots.
**In progress:** none.
**Next:** OCR, embedding hybrid retrieval, component/e2e tests in CI (Playwright script used manually).
