type TSseHandlers = {
  delta?: (_data: { text: string }) => void
  sources?: (_data: { sources: Array<Record<string, unknown>> }) => void
  done?: (_data: { text: string }) => void
  error?: (_data: { message: string }) => void
}

export const read_sse_stream = async (
  response: Response,
  handlers: TSseHandlers
): Promise<void> => {
  if (!response.body) {
    throw new Error('No response body for SSE stream')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { value, done } = await reader.read()
    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })

    const events = buffer.split('\n\n')
    buffer = events.pop() || ''

    for (const event_block of events) {
      const trimmed = event_block.trim()
      if (!trimmed) {
        continue
      }

      let event_name = 'message'
      let data_payload = ''

      for (const line of trimmed.split('\n')) {
        if (line.startsWith('event:')) {
          event_name = line.replace('event:', '').trim()
        }

        if (line.startsWith('data:')) {
          data_payload += line.replace('data:', '').trim()
        }
      }

      let parsed: any = data_payload
      try {
        parsed = JSON.parse(data_payload)
      } catch (error) {
        parsed = data_payload
      }

      const handler = handlers[event_name as keyof TSseHandlers]
      if (handler) {
        handler(parsed)
      }
    }
  }
}
