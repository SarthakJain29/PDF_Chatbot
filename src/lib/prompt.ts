import type { Source } from './types'

export interface HistoryTurn {
  role: 'user' | 'assistant'
  content: string
}

export const SYSTEM_PROMPT = `You are Folio, a careful assistant that answers questions strictly from the user's PDF excerpts.
Rules:
- Use ONLY the numbered excerpts provided. Never use outside knowledge.
- Cite every factual claim with the excerpt number in square brackets, e.g. [1] or [2][3].
- If the excerpts do not contain the answer, say so plainly and suggest what to ask instead.
- Be concise. Use short paragraphs or bullet lists. Quote sparingly.`

export function formatContext(sources: Source[]): string {
  return sources
    .map((s) => `[${s.n}] ${s.docName}, page ${s.page}\n${s.text}`)
    .join('\n\n')
}

export function buildUserPrompt(question: string, sources: Source[]): string {
  return `Excerpts:\n${formatContext(sources) || '(no relevant excerpts found)'}\n\nQuestion: ${question}`
}

/** Keep only the last few turns to bound prompt size. */
export function trimHistory(history: HistoryTurn[], maxTurns = 6): HistoryTurn[] {
  return history.slice(-maxTurns).map((h) => ({ role: h.role, content: h.content.slice(0, 2000) }))
}

/** Extract the distinct citation numbers used in an answer, in order of appearance. */
export function citedNumbers(answer: string): number[] {
  const seen: number[] = []
  for (const m of answer.matchAll(/\[(\d{1,2})\]/g)) {
    const n = Number(m[1])
    if (!seen.includes(n)) seen.push(n)
  }
  return seen
}
