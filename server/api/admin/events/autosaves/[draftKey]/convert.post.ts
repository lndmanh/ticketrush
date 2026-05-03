import { z } from 'zod'
import eventDraftAutosaveService from '~~/server/utils/database/event-draft-autosave'
import { success } from '~~/server/utils/apiResponse'

const convertAutosaveDraftSchema = z.object({
  eventId: z.coerce.number().int().positive('Event ID is required'),
})

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const draftKey = getRouterParam(event, 'draftKey')
  if (!draftKey) {
    throw createError({ statusCode: 400, statusMessage: 'Autosave draft key is required.' })
  }

  const result = await readValidatedBody(event, body => convertAutosaveDraftSchema.safeParse(body))
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request. Autosave conversion data is invalid.', data: result.error })
  }

  const converted = await eventDraftAutosaveService.markConverted(draftKey, session.user.id, result.data.eventId)
  if (!converted) {
    throw createError({ statusCode: 404, statusMessage: 'Active autosave draft not found.' })
  }

  return success({ draftKey, eventId: result.data.eventId })
})
