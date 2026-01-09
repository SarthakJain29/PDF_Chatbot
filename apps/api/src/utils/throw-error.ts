import CustomError from './CustomError'

export const throw_error = (
  message: string = 'Internal error occurred',
  status_code: number = 500
): never => {
  throw new CustomError(message, status_code)
}
