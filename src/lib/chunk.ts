import type { Chunk } from './types'

export interface ChunkOptions {
  maxChars?: number
  overlapChars?: number
}

/** Split a page's text into sentence-aware, overlapping chunks. */
export function chunkText(text: string, { maxChars = 900, overlapChars = 150 }: ChunkOptions = {}): string[] {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return []
  if (clean.length <= maxChars) return [clean]

  const sentences = clean.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) ?? [clean]
  const chunks: string[] = []
  let current = ''

  const push = () => {
    const t = current.trim()
    if (t) chunks.push(t)
  }

  for (const raw of sentences) {
    // Hard-split pathological sentences (no punctuation, tables, etc.)
    const parts = raw.length > maxChars ? raw.match(new RegExp(`.{1,${maxChars}}`, 'g')) ?? [raw] : [raw]
    for (const s of parts) {
      if (current && current.length + s.length > maxChars) {
        push()
        const tail = current.slice(-overlapChars)
        const wordStart = tail.indexOf(' ')
        current = (wordStart >= 0 ? tail.slice(wordStart + 1) : tail) + ' '
      }
      current += s
    }
  }
  push()
  return chunks
}

export function chunkPages(
  doc: { id: string; name: string },
  pages: string[],
  opts?: ChunkOptions
): Chunk[] {
  const out: Chunk[] = []
  pages.forEach((pageText, i) => {
    chunkText(pageText, opts).forEach((text, index) => {
      out.push({
        id: `${doc.id}:${i + 1}:${index}`,
        docId: doc.id,
        docName: doc.name,
        page: i + 1,
        index,
        text
      })
    })
  })
  return out
}
