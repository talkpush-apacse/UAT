/**
 * Statuses that flag a problem with a step. A response in one of these
 * statuses must have a comment or an attachment before a tester's test
 * can be marked complete.
 */
export const EVIDENCE_REQUIRED_STATUSES = ['Fail', 'Blocked', 'Up For Review'] as const

interface ResponseLike {
  id: string
  checklist_item_id: string
  status: string | null
  comment: string | null
}

interface AttachmentLike {
  response_id: string
}

/**
 * Returns the checklist_item_ids of responses that are Fail/Blocked/Up For
 * Review but have neither a comment nor an attachment.
 */
export function getStepsMissingEvidence(
  responses: ResponseLike[],
  attachments: AttachmentLike[]
): string[] {
  const responseIdsWithAttachment = new Set(attachments.map((a) => a.response_id))

  return responses
    .filter((r) => r.status && (EVIDENCE_REQUIRED_STATUSES as readonly string[]).includes(r.status))
    .filter((r) => !r.comment?.trim() && !responseIdsWithAttachment.has(r.id))
    .map((r) => r.checklist_item_id)
}
