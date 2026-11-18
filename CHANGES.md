# CHANGES: what changed and why

Use this as an interview script. Each section: **what → why → how**.

## 0. The big decision: rewrite, don't patch
**What:** Turborepo (Express API + Next web + Mongo/Cloudinary/Firebase/OpenAI) → one Next.js 15 + TypeScript app.
**Why:** The old version needed four external accounts to even start, so it couldn't be demoed or deployed for free. For a portfolio piece, "clone, `npm i`, it works" matters more than the original topology. The old code also had real bugs (malformed system prompt string, stale timestamp computed at import time).
**Trade-off to mention:** no server-side persistence/auth. I chose privacy + zero infra; multi-device sync is a roadmap item.

## 1. Local-first ingestion (`lib/pdf.ts`, `lib/chunk.ts`, `lib/storage.ts`)
- pdf.js extracts text **in the browser**, page by page, with a progress indicator.
- `chunkText` splits each page into ~900-char, sentence-aware chunks with ~150-char overlap (overlap prevents answers being cut at a boundary); over-long unpunctuated runs are hard-split. Chunks keep their page number, which powers citations.
- The PDF blob, chunks and chats persist in IndexedDB (`idb-keyval`).
- Errors handled: non-PDF, >25 MB, password-protected, corrupt, scanned (no text) → clear toasts.

## 2. Retrieval (`lib/bm25.ts`, `lib/retrieve.ts`)
- **BM25** with stopword removal and a tiny suffix stemmer. Why BM25: free, instant, offline, deterministic, testable; strong baseline for document QA.
- **Near-duplicate removal** (Jaccard on tokens) so overlapping chunks don't fill all slots.
- **Follow-up expansion**: a short question like "why?" borrows the previous user question for searching.
- **Overview mode**: "summarize"/"key takeaways" queries sample chunks evenly across the document (BM25 is bad at these).
- Index is cached per document selection.

## 3. LLM provider abstraction (`lib/llm/*`)
- Interface `LlmProvider { stream(req): AsyncGenerator<string> }` with `gemini.ts`, `groq.ts` (plain `fetch`, no SDKs), and `mock.ts`.
- `getProviderChain(env)`: `auto` = Gemini → Groq → mock; missing keys are skipped, mock is always last.
- Route handler tries each provider; if one fails **before streaming any token**, it falls back to the next and tells the UI. Retries with backoff on 429/5xx (`retry.ts`).
- **Mock mode** builds an extractive answer from the best-matching sentences and streams it word by word, so the whole UX works with no key (and in CI).
- Model defaults use aliases because pinned model IDs were retired while I tested.

## 4. Streaming API (`app/api/chat/route.ts`, `lib/sse.ts`)
- Stateless POST: validates input (length, ≤8 passages), builds the prompt (system rules + numbered excerpts + trimmed history), streams typed SSE events (`meta`, `delta`, `done`, `error`).
- The system prompt forces answers from excerpts only and `[n]` citations: this is what keeps it grounded.
- Client parses SSE with a small tested decoder that handles frames split across network chunks.

## 5. Citations + PDF viewer (`components/pdf-viewer.tsx`, `message-text.tsx`)
- `[n]` in the answer becomes a clickable chip; the "sources" panel shows cards, with cited ones emphasised.
- Clicking opens a docked pane (overlay on mobile) that re-opens the stored PDF, renders the page to a canvas and **highlights** text-layer items that overlap the cited chunk (word-overlap ≥ 60%). This is the signature feature: competitors link to a page, Folio shows the passage.

## 6. Workspace state (`lib/use-workspace.ts`)
One hook owns docs, selection, chats, streaming, toasts, provider status. Handles abort ("stop"), per-chat history, auto-titles from the first question, error messages stored on the message (not faked as assistant text).

## 7. UI/UX (`components/app.tsx`, `globals.css`)
Dark-first with light theme; Bricolage Grotesque display type + Inter; violet→pink accent used sparingly (CTA, citations, user bubbles); CSS-variable design tokens. States covered: first-run landing with drag-and-drop, "try sample" button, ingestion progress, thinking skeletons, blinking caret while streaming, empty chat with suggestions, error cards, toasts, reduced-motion support, keyboard focus rings, aria labels.

## 8. Tests, CI, tooling
21 Vitest tests: chunking, BM25 ranking/stemming/dedupe, retrieval modes, prompt building, citation extraction, mock answer, provider selection, SSE round-trip. GitHub Actions runs lint, typecheck, test, build. Strict TypeScript with `noUncheckedIndexedAccess`.

## Architecture in one paragraph
Browser: pdf.js → chunker → IndexedDB; on a question, BM25 picks the top passages locally and POSTs *only those* with the question to `/api/chat`. The server picks the first working provider (Gemini → Groq → mock), streams tokens back as SSE, and the client renders them with clickable citations that open the stored PDF at the right page with a highlight.

## Likely interview questions
- *Why not embeddings/vector DB?* Cost, setup, and privacy; BM25 is a strong, testable baseline. Interface allows swapping in embeddings.
- *How do you prevent hallucination?* Excerpt-only prompt, mandatory citations, visible sources and highlight so users can verify; empty retrieval yields "not found".
- *Why retrieval on the client?* Keeps documents private and the server stateless/free to host.
- *What breaks?* Scanned PDFs, paraphrase-heavy queries, multi-column layouts (see developer.md).
