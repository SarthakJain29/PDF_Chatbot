import { Request, Response } from 'express'
import { z } from 'zod'

import { mg } from '@my-scope/db'

import { z_object_id } from '@/utils/schema'
import { throw_error } from '@/utils/throw-error'

export const get_chat_by_id = async (req: Request, res: Response) => {
  const { _id } = z_chat_params.parse(req.params)

  const chat = await mg.chat.findOne({ _id, user: req.user._id }).lean()

  if (!chat) {
    throw_error('Chat not found', 404)
  }

  res.json({
    message: 'Chat fetched successfully',
    data: chat
  })
}

const z_chat_params = z.object({
  _id: z_object_id
})
