import { z } from 'zod'

export const createProjectSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(200),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug must be lowercase alphanumeric with hyphens (e.g. "acme-corp-q1")'
    ),
  testScenario: z.string().max(2000).optional().or(z.literal('')),
  talkpushLoginLink: z.string().url('Must be a valid URL').max(500).optional().or(z.literal('')),
})

export const updateProjectSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(200).optional(),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug must be lowercase alphanumeric with hyphens'
    )
    .optional(),
  testScenario: z.string().max(2000).optional().or(z.literal('')),
  talkpushLoginLink: z.string().url('Must be a valid URL').max(500).optional().or(z.literal('')),
})

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
