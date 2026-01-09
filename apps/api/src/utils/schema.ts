import { Types } from 'mongoose'
import { z } from 'zod'

export const z_object_id = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format')
  .transform((val) => new Types.ObjectId(val))
