import { getProviderChain } from '@/lib/llm'
import type { LlmRequest } from '@/lib/llm'
import { buildUserPrompt, SYSTEM_PROMPT, trimHistory } from '@/lib/prompt'
import { encodeEvent, type StreamEvent } from '@/lib/sse'
import type { Source } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface Body {
  question?: string
  sources?: Source[]
  history?: { role: 'user' | 'assistant'; content: string }[]
}

function validate(body: Body) {
  const question = typeof body.question === 'string' ? body.question.trim() : ''
  if (!question || question.length > 2000) return null
  const sources = (Array.isArray(body.sources) ? body.sources : [])
    .slice(0, 8)
    .map((s, i) => ({ ...s, n: i + 1, text: String(s.text ?? '').slice(0, 1800) }))
  const history = Array.isArray(body.history) ? trimHistory(body.history) : []
  return { question, sources, history }
}

export async function POST(req: Request) {
  let body: Body
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const v = validate(body)
  if (!v) return Response.json({ error: 'A question (max 2000 chars) is required' }, { status: 400 })

  const llmReq: LlmRequest = {
    system: SYSTEM_PROMPT,
    history: v.history,
    question: v.question,
    sources: v.sources,
    prompt: buildUserPrompt(v.question, v.sources),
    signal: req.signal
  }

  const enc = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: StreamEvent) => controller.enqueue(enc.encode(encodeEvent(e)))
      let started = false
      try {
        const chain = getProviderChain()
        let lastError: unknown
        for (const [i, provider] of chain.entries()) {
          send({
            type: 'meta',
            provider: provider.name,
            model: provider.model,
            mock: provider.name === 'mock',
            note: i > 0 ? 'Live model unavailable, switched provider.' : undefined
          })
          try {
            for await (const t of provider.stream(llmReq)) {
              started = true
              send({ type: 'delta', text: t })
            }
            lastError = undefined
            break
          } catch (err) {
            lastError = err
            // Once tokens were streamed we can't transparently swap providers.
            if (started || req.signal.aborted) throw err
            console.error(`[chat] ${provider.name} failed:`, (err as Error).message)
          }
        }
        if (lastError) throw lastError
        send({ type: 'done' })
      } catch (err) {
        send({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' })
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform' }
  })
}
