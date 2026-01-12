import type { Response } from 'express'

import { send_sse_event } from '@/utils/sse'

type TFileUpdatePayload = {
  _id: string
  file_name: string
  status: string
}

const subscribers = new Map<string, Set<Response>>()

export const subscribe_file_stream = (user_id: string, res: Response): void => {
  const user_subscribers = subscribers.get(user_id) || new Set<Response>()
  user_subscribers.add(res)
  subscribers.set(user_id, user_subscribers)
}

export const unsubscribe_file_stream = (user_id: string, res: Response): void => {
  const user_subscribers = subscribers.get(user_id)
  if (!user_subscribers) {
    return
  }

  user_subscribers.delete(res)

  if (!user_subscribers.size) {
    subscribers.delete(user_id)
  }
}

export const broadcast_file_update = (
  user_id: string,
  payload: TFileUpdatePayload
): void => {
  const user_subscribers = subscribers.get(user_id)
  if (!user_subscribers) {
    return
  }

  for (const res of user_subscribers) {
    if (res.writableEnded) {
      user_subscribers.delete(res)
      continue
    }

    send_sse_event(res, {
      event: 'update',
      data: payload
    })
  }
}
