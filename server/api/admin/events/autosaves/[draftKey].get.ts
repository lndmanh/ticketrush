import { eventAutosavePayloadSchema } from '#shared/schemas/ticketingSchema'
import type { AutosaveDraftDetail } from '~~/types/admin-events'
import eventDraftAutosaveService from '~~/server/utils/database/event-draft-autosave'
import { apiError, success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const draftKey = getRouterParam(event, 'draftKey')
  if (!draftKey) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'INVALID_DRAFT_KEY', message: 'Autosave draft key is required.' })
  }

  const draft = await eventDraftAutosaveService.getActiveByDraftKey(draftKey, session.user.id)
  if (!draft) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'AUTOSAVE_DRAFT_NOT_FOUND', message: 'Autosave draft not found.' })
  }

  let payloadResult = eventAutosavePayloadSchema.safeParse({})
  try {
    payloadResult = eventAutosavePayloadSchema.safeParse(JSON.parse(draft.payload))
  }
  catch {
    throw apiError({ status: 422, statusText: 'Unprocessable Content', code: 'AUTOSAVE_DRAFT_PAYLOAD_INVALID', message: 'Autosave draft payload is invalid.' })
  }

  if (!payloadResult.success) {
    throw apiError({ status: 422, statusText: 'Unprocessable Content', code: 'AUTOSAVE_DRAFT_PAYLOAD_INVALID', message: 'Autosave draft payload is invalid.' })
  }

  const response: AutosaveDraftDetail = {
    draftKey: draft.draftKey,
    payload: payloadResult.data,
    lastSavedStep: draft.lastSavedStep,
    updatedAt: draft.updatedAt,
    createdAt: draft.createdAt,
  }

  return success(response)
})
