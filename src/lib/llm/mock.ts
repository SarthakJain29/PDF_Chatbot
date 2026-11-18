import { tokenize } from '../bm25'
import type { LlmProvider, LlmRequest } from './types'

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => (clearTimeout(t), resolve()), { once: true })
  })

/** Pick the sentences from an excerpt that best overlap with the question. */
export function bestSentences(text: string, question: string, max = 2): string[] {
  const q = new Set(tokenize(question))
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((s) => s.trim()).filter((s) => s.length > 20) ?? [text]
  return sentences
    .map((s, i) => ({ s, i, score: tokenize(s).filter((t) => q.has(t)).length }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, max)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.s)
}

/** Deterministic extractive answer: no network, no key. Good enough to demo the full UX. */
export function buildMockAnswer(req: Pick<LlmRequest, 'question' | 'sources'>): string {
  if (!req.sources.length) {
    return "I couldn't find anything in your documents that matches that question. Try rephrasing it with terms that appear in the PDF, or select more documents."
  }
  const top = req.sources.slice(0, 3)
  const lines = top.map((s) => `- ${bestSentences(s.text, req.question).join(' ')} [${s.n}]`)
  return `Here's what your documents say (demo mode, extractive answer, no LLM key configured):\n\n${lines.join('\n')}`
}

export const mockProvider: LlmProvider = {
  name: 'mock',
  model: 'extractive-demo',
  async *stream(req) {
    const answer = buildMockAnswer(req)
    // Stream word-by-word to exercise the same UI path as a real model.
    for (const token of answer.match(/\S+\s*/g) ?? []) {
      if (req.signal?.aborted) return
      yield token
      await sleep(18, req.signal)
    }
  }
}
