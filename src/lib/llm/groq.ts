import { readSseData } from '../sse'
import type { LlmProvider } from './types'

export function createGroq(apiKey: string, model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'): LlmProvider {
  return {
    name: 'groq',
    model,
    async *stream(req) {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        signal: req.signal,
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          stream: true,
          temperature: 0.2,
          max_tokens: 1024,
          messages: [
            { role: 'system', content: req.system },
            ...req.history,
            { role: 'user', content: req.prompt }
          ]
        })
      })
      if (!res.ok) throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 200)}`)
      for await (const data of readSseData(res)) {
        if (data === '[DONE]') return
        try {
          const text = JSON.parse(data).choices?.[0]?.delta?.content
          if (text) yield text
        } catch {
          /* skip */
        }
      }
    }
  }
}
