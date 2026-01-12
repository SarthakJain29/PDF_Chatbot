import type { Request, Response } from 'express'

import { mg } from '@my-scope/db'

import {
  subscribe_file_stream,
  unsubscribe_file_stream
} from '@/service/file-stream'
import { init_sse, send_sse_event } from '@/utils/sse'

export const stream_files = async (req: Request, res: Response) => {
  init_sse(res)

  const user_id = req.user._id
  subscribe_file_stream(user_id, res)

  const keep_alive = setInterval(() => {
    send_sse_event(res, { event: 'ping', data: { at: Date.now() } })
  }, 25000)

  req.on('close', () => {
    clearInterval(keep_alive)
    unsubscribe_file_stream(user_id, res)
  })

  try {
    const files = await mg.file
      .find({ user: user_id })
      .sort({ createdAt: -1 })
      .lean()

    send_sse_event(res, {
      event: 'snapshot',
      data: files
    })
  } catch (error) {
    send_sse_event(res, {
      event: 'error',
      data: {
        message: error instanceof Error ? error.message : 'Failed to stream files'
      }
    })
    res.end()
  }
}
