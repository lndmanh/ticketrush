import eventDraftAutosaveService from '~~/server/utils/database/event-draft-autosave'
import { success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const draftKey = getRouterParam(event, 'draftKey')
  if (!draftKey) {
    throw createError({ statusCode: 400, statusMessage: 'Autosave draft key is required.' })
  }

  const discarded = await eventDraftAutosaveService.markDiscarded(draftKey, session.user.id)
  if (!discarded) {
    throw createError({ statusCode: 404, statusMessage: 'Active autosave draft not found.' })
  }

  return success({ draftKey })
})
