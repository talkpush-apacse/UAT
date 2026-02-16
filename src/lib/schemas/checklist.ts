import { z } from 'zod'

export const updateChecklistItemSchema = z.object({
  id: z.string().uuid(),
  stepNumber: z.number().int().positive().optional(),
  path: z.enum(['Happy', 'Non-Happy']).nullable().optional(),
  actor: z.enum(['Candidate', 'Talkpush', 'Recruiter']).optional(),
  action: z.string().min(1).max(2000).optional(),
  viewSample: z.string().max(2000).optional().or(z.literal('')),
  crmModule: z.string().max(200).optional().or(z.literal('')),
  tip: z.string().max(500).optional().or(z.literal('')),
})

export const addChecklistItemSchema = z.object({
  projectId: z.string().uuid(),
  stepNumber: z.number().int().positive(),
  path: z.enum(['Happy', 'Non-Happy']).nullable(),
  actor: z.enum(['Candidate', 'Talkpush', 'Recruiter']),
  action: z.string().min(1, 'Action is required').max(2000),
  viewSample: z.string().max(2000).optional().or(z.literal('')),
  crmModule: z.string().max(200).optional().or(z.literal('')),
  tip: z.string().max(500).optional().or(z.literal('')),
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
