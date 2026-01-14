import type { TUserContext } from '@/types/auth'

declare global {
  namespace Express {
    export interface Request {
      user: TUserContext
    }
  }
}

export {}
