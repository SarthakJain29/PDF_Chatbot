import type { Chunk } from './types'

const STOP = new Set(
  'a an and are as at be but by for from has have he her his i in is it its of on or that the their them there these they this to was were what when where which who why will with you your about can do does how not so than then us we'.split(
    ' '
  )
)

/** Lowercase, strip punctuation, drop stopwords, apply a tiny suffix stemmer. */
export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? [])
    .filter((t) => t.length > 1 && !STOP.has(t))
    .map(stem)
}

export function stem(t: string): string {
  if (t.length <= 4) return t
  for (const suf of ['ingly', 'edly', 'ing', 'ies', 'ed', 'es', 's']) {
    if (t.endsWith(suf) && t.length - suf.length >= 3) {
      return suf === 'ies' ? t.slice(0, -3) + 'y' : t.slice(0, -suf.length)
    }
  }
  return t
}

export interface Hit {
  chunk: Chunk
  score: number
}

export class BM25Index {
  private tfs: Map<string, number>[] = []
  private lens: number[] = []
  private df = new Map<string, number>()
  private avgLen = 0

  constructor(
    private chunks: Chunk[],
    private k1 = 1.4,
    private b = 0.75
  ) {
    for (const c of chunks) {
      const toks = tokenize(c.text)
      const tf = new Map<string, number>()
      for (const t of toks) tf.set(t, (tf.get(t) ?? 0) + 1)
      for (const t of tf.keys()) this.df.set(t, (this.df.get(t) ?? 0) + 1)
      this.tfs.push(tf)
      this.lens.push(toks.length)
    }
    this.avgLen = this.lens.reduce((a, b) => a + b, 0) / (this.lens.length || 1)
  }

  search(query: string, limit = 6): Hit[] {
    const q = [...new Set(tokenize(query))]
    if (!q.length) return []
    const N = this.chunks.length
    const hits: Hit[] = []
    this.tfs.forEach((tf, i) => {
      let score = 0
      for (const t of q) {
        const f = tf.get(t)
        if (!f) continue
        const n = this.df.get(t) ?? 0
        const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5))
        const norm = 1 - this.b + (this.b * this.lens[i]!) / (this.avgLen || 1)
        score += (idf * (f * (this.k1 + 1))) / (f + this.k1 * norm)
      }
      if (score > 0) hits.push({ chunk: this.chunks[i]!, score })
    })
    return dedupe(hits.sort((a, b) => b.score - a.score), limit)
  }
}

function jaccard(a: Set<string>, b: Set<string>) {
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  return inter / (a.size + b.size - inter || 1)
}

/** Greedy near-duplicate removal so overlapping chunks don't crowd out variety. */
export function dedupe(sorted: Hit[], limit: number, threshold = 0.7): Hit[] {
  const kept: { hit: Hit; set: Set<string> }[] = []
  for (const hit of sorted) {
    const set = new Set(tokenize(hit.chunk.text))
    if (kept.some((k) => jaccard(k.set, set) > threshold)) continue
    kept.push({ hit, set })
    if (kept.length >= limit) break
  }
  return kept.map((k) => k.hit)
}
