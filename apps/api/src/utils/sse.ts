import type { Response } from 'express'

type TSseEvent<T> = {
  event?: string
  data: T
}

export const init_sse = (res: Response): void => {
  res.status(200)
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  if (res.flushHeaders) {
    res.flushHeaders()
  }
}

export const send_sse_event = <T>(res: Response, payload: TSseEvent<T>): void => {
  if (payload.event) {
    res.write(`event: ${payload.event}\n`)
  }
  res.write(`data: ${JSON.stringify(payload.data)}\n\n`)
}
