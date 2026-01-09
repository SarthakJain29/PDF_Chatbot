import { Request, Response } from 'express'
import { z } from 'zod'

import { mg } from '@my-scope/db'

export const create_chat = async (req: Request, res: Response) => {
  const { title } = z_create_chat_body.parse(req.body)

  const chat = await mg.chat.create({
    user: req.user._id,
    title: title || 'New Chat',
    message_count: 0,
    last_message_at: new Date()
  })

  res.status(201).json({
    message: 'Chat created successfully',
    data: {
      chat_id: chat._id.toString()
    }
  })
}

const z_create_chat_body = z.object({
  title: z.string().trim().min(1).optional()
})
