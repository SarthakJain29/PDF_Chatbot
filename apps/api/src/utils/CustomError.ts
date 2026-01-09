class CustomError extends Error {
  status_code: number

  constructor(message: string = 'Internal Server Error', status_code: number = 500) {
    super(message)
    this.status_code = status_code

    Object.setPrototypeOf(this, CustomError.prototype)

    Error.captureStackTrace(this, this.constructor)
  }
}

export default CustomError
