import { eventAutosavePayloadSchema } from '#shared/schemas/ticketingSchema'
import type { AutosaveDraftDetail } from '~~/types/admin-events'
import eventDraftAutosaveService from '~~/server/utils/database/event-draft-autosave'
import { success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const draftKey = getRouterParam(event, 'draftKey')
  if (!draftKey) {
    throw createError({ statusCode: 400, statusMessage: 'Autosave draft key is required.' })
  }

  const draft = await eventDraftAutosaveService.getActiveByDraftKey(draftKey, session.user.id)
  if (!draft) {
    throw createError({ statusCode: 404, statusMessage: 'Autosave draft not found.' })
  }

  let payloadResult = eventAutosavePayloadSchema.safeParse({})
  try {
    payloadResult = eventAutosavePayloadSchema.safeParse(JSON.parse(draft.payload))
  }
  catch {
    throw createError({ statusCode: 422, statusMessage: 'Autosave draft payload is invalid.' })
  }

  if (!payloadResult.success) {
    throw createError({ statusCode: 422, statusMessage: 'Autosave draft payload is invalid.' })
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
