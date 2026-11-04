/** Minimal SSE helpers shared by the route handler (encode) and the browser (decode). */
export type StreamEvent =
  | { type: 'meta'; provider: string; model: string; mock: boolean; note?: string }
  | { type: 'delta'; text: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

export const encodeEvent = (e: StreamEvent) => `data: ${JSON.stringify(e)}\n\n`

export async function* readEvents(res: Response): AsyncGenerator<StreamEvent> {
  if (!res.body) throw new Error('Empty response body')
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const frames = buf.split('\n\n')
    buf = frames.pop() ?? ''
    for (const f of frames) {
      const line = f.split('\n').find((l) => l.startsWith('data:'))
      if (!line) continue
      try {
        yield JSON.parse(line.slice(5).trim()) as StreamEvent
      } catch {
        /* ignore malformed frame */
      }
    }
  }
}

/** Parse provider SSE bodies (Gemini / OpenAI-compatible) into raw `data:` payload strings. */
export async function* readSseData(res: Response): AsyncGenerator<string> {
  if (!res.body) throw new Error('Empty provider body')
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split(/\r?\n/)
    buf = lines.pop() ?? ''
    for (const l of lines) if (l.startsWith('data:')) yield l.slice(5).trim()
  }
  if (buf.startsWith('data:')) yield buf.slice(5).trim()
}
