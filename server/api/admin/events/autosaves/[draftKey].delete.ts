import type { AutosaveDraftDeleteData } from '~~/types/admin-events'
import eventDraftAutosaveService from '~~/server/utils/database/event-draft-autosave'
import { apiError, success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const draftKey = getRouterParam(event, 'draftKey')
  if (!draftKey) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'INVALID_DRAFT_KEY', message: 'Autosave draft key is required.' })
  }

  const discarded = await eventDraftAutosaveService.markDiscarded(draftKey, session.user.id)
  if (!discarded) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'AUTOSAVE_DRAFT_NOT_FOUND', message: 'Active autosave draft not found.' })
  }

  const response: AutosaveDraftDeleteData = { draftKey }
  return success(response)
})
