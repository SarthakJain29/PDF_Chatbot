import { z } from 'zod'

export const z_object_id = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format')
