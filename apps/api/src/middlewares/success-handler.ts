import { NextFunction, Request, Response } from 'express'

export const success_handler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const original_json = res.json

  res.json = function (json: any): Response {
    if (res.statusCode < 400) {
      console.log({
        message: json.message || 'Successful request',
        meta: {
          path: `[${req.method}] ${req.path}`,
          status: res.statusCode
        }
      })
    }

    return original_json.call(this, json)
  }

  next()
}
