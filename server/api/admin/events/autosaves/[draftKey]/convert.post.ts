import { z } from 'zod'
import type { AutosaveDraftConvertData } from '~~/types/admin-events'
import eventDraftAutosaveService from '~~/server/utils/database/event-draft-autosave'
import { apiError, success, zodErrorToFieldErrors } from '~~/server/utils/apiResponse'

const convertAutosaveDraftSchema = z.object({
  eventId: z.coerce.number().int().positive('Event ID is required'),
})

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const draftKey = getRouterParam(event, 'draftKey')
  if (!draftKey) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'INVALID_DRAFT_KEY', message: 'Autosave draft key is required.' })
  }

  const result = await readValidatedBody(event, body => convertAutosaveDraftSchema.safeParse(body))
  if (!result.success) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'VALIDATION_ERROR', message: 'Invalid request.', fieldErrors: zodErrorToFieldErrors(result.error), cause: result.error })
  }

  const converted = await eventDraftAutosaveService.markConverted(draftKey, session.user.id, result.data.eventId)
  if (!converted) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'AUTOSAVE_DRAFT_NOT_FOUND', message: 'Active autosave draft not found.' })
  }

  const response: AutosaveDraftConvertData = { draftKey, eventId: result.data.eventId }
  return success(response)
})
