import { Request, Response } from 'express'
import { z } from 'zod'

import { mg } from '@my-scope/db'

import { z_object_id } from '@/utils/schema'

const z_chat_params = z.object({
  _id: z_object_id
})

export const get_chat_messages = async (req: Request, res: Response) => {
  const { _id } = z_chat_params.parse(req.params)

  const messages = await mg.message
    .find({ chat: _id, user: req.user._id })
    .sort({ createdAt: 1 })
    .lean()

  res.json({
    message: 'Messages fetched successfully',
    data: messages
  })
}
