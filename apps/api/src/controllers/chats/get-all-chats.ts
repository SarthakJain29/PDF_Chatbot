import { Request, Response } from 'express'

import { mg } from '@my-scope/db'

export const get_all_chats = async (req: Request, res: Response) => {
  const chats = await mg.chat
    .find({ user: req.user._id })
    .sort({ updatedAt: -1 })
    .lean()

  res.json({
    message: 'Chats fetched successfully',
    data: chats
  })
}
