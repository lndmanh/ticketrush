import { eventAutosavePayloadSchema } from '#shared/schemas/ticketingSchema'
import type { AutosaveDraftSummary } from '~~/types/admin-events'
import eventDraftAutosaveService from '~~/server/utils/database/event-draft-autosave'
import { success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const draft = await eventDraftAutosaveService.getActiveByUserId(session.user.id)

  if (!draft) {
    const response: AutosaveDraftSummary | null = null
    return success(response)
  }

  let payloadResult = eventAutosavePayloadSchema.safeParse({})
  try {
    payloadResult = eventAutosavePayloadSchema.safeParse(JSON.parse(draft.payload))
  }
  catch {
    payloadResult = eventAutosavePayloadSchema.safeParse({})
  }
  const payload = payloadResult.success ? payloadResult.data : {}

  const response: AutosaveDraftSummary = {
    draftKey: draft.draftKey,
    titleSnapshot: draft.titleSnapshot || payload.title || '',
    slugSnapshot: draft.slugSnapshot || payload.slug || '',
    venueId: draft.venueId ?? payload.venueId ?? null,
    lastSavedStep: draft.lastSavedStep,
    updatedAt: draft.updatedAt,
    createdAt: draft.createdAt,
  }

  return success(response)
})
