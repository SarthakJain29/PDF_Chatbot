import { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { generateErrorMessage } from 'zod-error'

import CustomError from '@/utils/CustomError'
import type { TApiError } from '@/types/errors'

const is_prod = process.env.NODE_ENV === 'production'

export const error_handler = (
  err: Error | ZodError | CustomError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log error details in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error occurred:', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      body: req.body,
      params: req.params,
      query: req.query
    })
  }

  let custom_error: TApiError = {
    message: err.message || 'Unknown error occurred',
    status_code: 500,
    stack: err.stack
  }

  if (err instanceof CustomError) {
    custom_error = {
      message: err.message,
      status_code: err.status_code,
      stack: err.stack
    }
  }

  if (err instanceof ZodError) {
    custom_error = { ...handle_zod_error(err), stack: err.stack }
  }

  res.status(custom_error.status_code).json({
    message: custom_error.message,
    status_code: custom_error.status_code,
    validation_error: is_prod ? undefined : custom_error.validation_error,
    stack: is_prod ? undefined : custom_error.stack
  })
}

const handle_zod_error = (err: ZodError): TApiError => {
  const invalid_fields = err.errors.map((error) => error.path.join('.'))

  const formatted_message = generateErrorMessage(err.issues, {
    maxErrors: 1,
    path: {
      enabled: false
    },
    code: {
      enabled: false
    },
    message: {
      enabled: true,
      label: ''
    }
  })

  return {
    message:
      formatted_message ||
      'Invalid input. Please check your entries and try again.',
    status_code: 400,
    validation_error: {
      fields: invalid_fields,
      details: err.errors.map((error) => ({
        field: error.path.join('.'),
        message: error.message,
        code: error.code
      }))
    }
  }
}
