import { BM25Index, tokenize } from './bm25'
import type { Chunk, Source } from './types'

const OVERVIEW = /\b(summar(y|ize|ise)|overview|tl;?dr|key (points|takeaways)|main (points|ideas)|what is this (document|pdf) about)\b/i

export const isOverviewQuery = (q: string) => OVERVIEW.test(q)

/** Evenly spaced chunks across the document: gives "summarize" questions broad coverage. */
export function sampleOverview(chunks: Chunk[], limit = 6): Chunk[] {
  if (chunks.length <= limit) return chunks
  const step = chunks.length / limit
  return Array.from({ length: limit }, (_, i) => chunks[Math.floor(i * step)]!)
}

/**
 * Follow-ups like "and why?" have no searchable terms of their own, so borrow the
 * previous user question to give BM25 something to match.
 */
export function expandQuery(question: string, previousUserQuestion?: string): string {
  return tokenize(question).length < 3 && previousUserQuestion ? `${previousUserQuestion} ${question}` : question
}

export function retrieve(
  chunks: Chunk[],
  index: BM25Index,
  question: string,
  previousUserQuestion?: string,
  limit = 5
): Source[] {
  const toSource = (c: Chunk, score: number, i: number): Source => ({
    n: i + 1,
    docId: c.docId,
    docName: c.docName,
    page: c.page,
    text: c.text,
    score
  })
  if (isOverviewQuery(question)) return sampleOverview(chunks).map((c, i) => toSource(c, 0, i))
  return index.search(expandQuery(question, previousUserQuestion), limit).map((h, i) => toSource(h.chunk, h.score, i))
}
