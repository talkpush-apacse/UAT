import { z } from 'zod'

const slugSchema = z
  .string()
  .max(100)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Slug must be lowercase alphanumeric with hyphens (e.g. "acme-corp-q1")'
  )

const createSlugSchema = z.preprocess(
  (value) => (value === null ? undefined : value),
  slugSchema.optional().or(z.literal(''))
)

const countrySchema = z
  .string()
  .regex(/^[A-Za-z]{2}$/, 'Country must be a 2-letter ISO code')
  .transform((v) => v.toUpperCase())

export const createProjectSchema = z.object({
  companyName: z.string().min(1, 'Please select a client').max(200),
  title: z.string().min(1, 'Title is required').max(300),
  slug: createSlugSchema,
  testScenario: z.string().max(2000).optional().or(z.literal('')),
  talkpushLoginLink: z.string().url('Must be a valid URL').max(500).optional().or(z.literal('')),
  country: countrySchema.optional().default('PH'),
})

export const updateProjectSchema = z.object({
  companyName: z.string().min(1, 'Please select a client').max(200).optional(),
  title: z.string().min(1, 'Title is required').max(300).optional(),
  slug: slugSchema.optional(),
  testScenario: z.string().max(2000).optional().or(z.literal('')),
  talkpushLoginLink: z.string().url('Must be a valid URL').max(500).optional().or(z.literal('')),
  country: countrySchema.optional(),
  wizardMode: z.preprocess(
    (v) => {
      if (v === undefined) return undefined
      return v === true || v === 'true' || v === 'on' || v === '1'
    },
    z.boolean().optional()
  ),
})

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
