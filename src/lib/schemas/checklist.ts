import { z } from 'zod'
import { ACTORS } from '@/lib/constants'

export const ITEM_TYPES = ['step', 'phase_header'] as const
export type ItemType = (typeof ITEM_TYPES)[number]

const optionalText = (max: number) =>
  z.string().max(max).optional().or(z.literal(''))

export const updateChecklistItemSchema = z
  .object({
    id: z.string().uuid(),
    itemType: z.enum(ITEM_TYPES).optional(),
    stepNumber: z.number().int().positive().nullable().optional(),
    path: z.enum(['Happy', 'Non-Happy']).nullable().optional(),
    actor: z.enum(ACTORS).optional(),
    action: z.string().min(1).max(2000).optional(),
    viewSample: optionalText(2000),
    crmModule: optionalText(200),
    tip: optionalText(500),
    headerLabel: optionalText(120),
  })

export const addChecklistItemSchema = z
  .object({
    projectId: z.string().uuid(),
    itemType: z.enum(ITEM_TYPES).default('step'),
    stepNumber: z.number().int().positive().nullable().optional(),
    path: z.enum(['Happy', 'Non-Happy']).nullable().optional(),
    actor: z.enum(ACTORS).optional(),
    action: z.string().min(1, 'Action is required').max(2000),
    viewSample: optionalText(2000),
    crmModule: optionalText(200),
    tip: optionalText(500),
    headerLabel: optionalText(120),
  })
  .superRefine((data, ctx) => {
    if (data.itemType === 'step') {
      if (!data.actor) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['actor'],
          message: 'Actor is required for testable steps',
        })
      }
      if (data.path === undefined) {
        // path is optional but should be explicitly null for steps
        data.path = null
      }
    }
  })

export const reorderChecklistSchema = z.object({
  projectId: z.string().uuid(),
  items: z.array(
    z.object({
      id: z.string().uuid(),
      sortOrder: z.number().int().min(0),
    })
  ),
})

export type UpdateChecklistItemInput = z.infer<typeof updateChecklistItemSchema>
export type AddChecklistItemInput = z.infer<typeof addChecklistItemSchema>
export type ReorderChecklistInput = z.infer<typeof reorderChecklistSchema>
