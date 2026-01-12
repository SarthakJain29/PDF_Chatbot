import { Request, Response } from 'express'

import { mg } from '@my-scope/db'

export const list_files = async (req: Request, res: Response) => {
  const files = await mg.file
    .find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .lean()

  res.json({
    message: 'Files fetched',
    data: files
  })
}
