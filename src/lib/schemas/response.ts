import { z } from 'zod'

export const saveResponseSchema = z.object({
  testerId: z.string().uuid(),
  checklistItemId: z.string().uuid(),
  status: z.enum(['Pass', 'Fail', 'N/A', 'Blocked']).nullable(),
  comment: z.string().max(5000).optional().or(z.literal('')),
})

export type SaveResponseInput = z.infer<typeof saveResponseSchema>
