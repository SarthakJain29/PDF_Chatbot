import { fetchWithRetry } from './retry'
import { readSseData } from '../sse'
import type { LlmProvider } from './types'

export function createGemini(apiKey: string, model = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest'): LlmProvider {
  return {
    name: 'gemini',
    model,
    async *stream(req) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`
      const res = await fetchWithRetry(url, {
        method: 'POST',
        signal: req.signal,
        headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: req.system }] },
          contents: [
            ...req.history.map((h) => ({
              role: h.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: h.content }]
            })),
            { role: 'user', parts: [{ text: req.prompt }] }
          ],
          generationConfig: { temperature: 0.2, maxOutputTokens: 1024 }
        })
      })
      if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`)
      for await (const data of readSseData(res)) {
        try {
          const json = JSON.parse(data)
          const text = json.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('')
          if (text) yield text
        } catch {
          /* skip keep-alive / partial frames */
        }
      }
    }
  }
}
