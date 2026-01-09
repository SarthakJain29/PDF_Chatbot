import { Request, Response } from 'express'
import { z } from 'zod'

import { mg } from '@my-scope/db'

import { z_object_id } from '@/utils/schema'

const z_chat_params = z.object({
  _id: z_object_id
})

export const get_chat_messages = async (req: Request, res: Response) => {
  try {
    const { _id } = z_chat_params.parse(req.params)

    console.log('Fetching messages for chat:', _id, 'user:', req.user._id)

    const messages = await mg.message
      .find({ chat: _id, user: req.user._id })
      .sort({ createdAt: 1 })
      .lean()

    console.log('Found messages:', messages.length)

    res.json({
      message: 'Messages fetched successfully',
      data: messages
    })
  } catch (error) {
    console.error('Error in get_chat_messages:', error)
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
    }
    throw error
  }
}
