import { NextFunction, Request, Response } from 'express'

import { throw_error } from '@/utils/throw-error'

type TUserContext = {
  _id: string
}

export const is_authenticated = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const header_user = req.header('x-user-id') || req.header('x-user')
  const query_user = typeof req.query.user_id === 'string' ? req.query.user_id : undefined
  const user_id = header_user || query_user || 'demo-user'

  if (!user_id) {
    throw_error('Unauthorized', 401)
  }

  req.user = { _id: user_id } as TUserContext
  next()
}
