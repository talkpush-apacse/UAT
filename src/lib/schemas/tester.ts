import { z } from 'zod'

export const registerTesterSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email('Invalid email address'),
  mobile: z.string().min(1, 'Mobile number is required').max(20),
  projectId: z.string().uuid(),
})

export type RegisterTesterInput = z.infer<typeof registerTesterSchema>
