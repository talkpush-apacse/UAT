import { z } from 'zod'

export const createSignoffSchema = z.object({
  projectId: z.string().uuid(),
  signoffName: z.string().min(1, 'Name is required').max(200),
  signoffDate: z.string().min(1, 'Date is required'),
})

export type CreateSignoffInput = z.infer<typeof createSignoffSchema>
