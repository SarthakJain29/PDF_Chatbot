import { describe, expect, it } from 'vitest'
import { BM25Index, tokenize } from '../src/lib/bm25'
import { chunkPages, chunkText } from '../src/lib/chunk'
import { getProvider } from '../src/lib/llm'
import { buildMockAnswer } from '../src/lib/llm/mock'
import { buildUserPrompt, citedNumbers, trimHistory } from '../src/lib/prompt'
import { encodeEvent, readEvents } from '../src/lib/sse'
import type { Source } from '../src/lib/types'

describe('chunkText', () => {
  it('returns [] for blank text and one chunk for short text', () => {
    expect(chunkText('   ')).toEqual([])
    expect(chunkText('Hello world.')).toEqual(['Hello world.'])
  })
  it('splits long text with overlap and never exceeds max much', () => {
    const text = Array.from({ length: 60 }, (_, i) => `Sentence number ${i} talks about topic ${i}.`).join(' ')
    const chunks = chunkText(text, { maxChars: 300, overlapChars: 60 })
    expect(chunks.length).toBeGreaterThan(3)
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(380)
    // overlap: consecutive chunks share words
    const a = chunks[0]!.split(' ').slice(-3).join(' ')
    expect(chunks[1]).toContain(a.split(' ')[2]!)
  })
  it('hard-splits sentences without punctuation', () => {
    expect(chunkText('x'.repeat(2500), { maxChars: 1000 }).length).toBeGreaterThanOrEqual(3)
  })
  it('records page numbers', () => {
    const c = chunkPages({ id: 'd', name: 'd.pdf' }, ['one', '', 'three'])
    expect(c.map((x) => x.page)).toEqual([1, 3])
  })
})

describe('BM25', () => {
  const chunks = chunkPages({ id: 'd', name: 'a.pdf' }, [
    'The mitochondria is the powerhouse of the cell and produces ATP energy.',
    'Photosynthesis happens in chloroplasts and converts light into sugar.',
    'The French Revolution began in 1789 and reshaped European politics.'
  ])
  const idx = new BM25Index(chunks)
  it('ranks the relevant chunk first', () => {
    expect(idx.search('what produces energy in cells?')[0]!.chunk.page).toBe(1)
    expect(idx.search('when did the revolution start')[0]!.chunk.page).toBe(3)
  })
  it('stems plurals/gerunds', () => {
    expect(tokenize('converting chloroplasts')).toEqual(tokenize('converts chloroplast').map((t) => t))
  })
  it('returns nothing for unrelated or stopword-only queries', () => {
    expect(idx.search('the and of')).toEqual([])
    expect(idx.search('quantum blockchain')).toEqual([])
  })
  it('dedupes near-identical chunks', () => {
    const dup = chunkPages({ id: 'x', name: 'x' }, ['alpha beta gamma delta epsilon', 'alpha beta gamma delta epsilon'])
    expect(new BM25Index(dup).search('alpha beta')).toHaveLength(1)
  })
})

const src: Source[] = [
  { n: 1, docId: 'd', docName: 'a.pdf', page: 4, text: 'Revenue grew 20% in 2023. Costs fell slightly.', score: 3 }
]

describe('prompt + mock', () => {
  it('builds a numbered prompt', () => {
    expect(buildUserPrompt('q?', src)).toContain('[1] a.pdf, page 4')
  })
  it('extracts cited numbers in order', () => {
    expect(citedNumbers('A [2] and B [1][2]')).toEqual([2, 1])
  })
  it('trims history', () => {
    expect(trimHistory(Array.from({ length: 10 }, () => ({ role: 'user' as const, content: 'x' })))).toHaveLength(6)
  })
  it('mock answer cites and handles empty retrieval', () => {
    expect(buildMockAnswer({ question: 'how much did revenue grow', sources: src })).toMatch(/Revenue grew 20%.*\[1\]/)
    expect(buildMockAnswer({ question: 'x', sources: [] })).toMatch(/couldn't find/)
  })
})

describe('provider selection', () => {
  it('falls back to mock without keys', () => expect(getProvider({}).name).toBe('mock'))
  it('prefers gemini then groq in auto', () => {
    expect(getProvider({ GEMINI_API_KEY: 'k', GROQ_API_KEY: 'g' }).name).toBe('gemini')
    expect(getProvider({ GROQ_API_KEY: 'g' }).name).toBe('groq')
  })
  it('respects LLM_PROVIDER=mock', () => expect(getProvider({ LLM_PROVIDER: 'mock', GEMINI_API_KEY: 'k' }).name).toBe('mock'))
  it('treats a requested provider with missing key as mock', () =>
    expect(getProvider({ LLM_PROVIDER: 'groq' }).name).toBe('mock'))
})

describe('sse', () => {
  it('round-trips events across split frames', async () => {
    const payload = encodeEvent({ type: 'delta', text: 'hi' }) + encodeEvent({ type: 'done' })
    const half = Math.floor(payload.length / 2)
    const enc = new TextEncoder()
    const body = new ReadableStream({
      start(c) {
        c.enqueue(enc.encode(payload.slice(0, half)))
        c.enqueue(enc.encode(payload.slice(half)))
        c.close()
      }
    })
    const out = []
    for await (const e of readEvents(new Response(body))) out.push(e)
    expect(out).toEqual([{ type: 'delta', text: 'hi' }, { type: 'done' }])
  })
})
