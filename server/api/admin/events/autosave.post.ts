import { eventAutosaveDraftSchema } from '#shared/schemas/ticketingSchema'
import type { AutosaveDraftSaveData } from '~~/types/admin-events'
import eventDraftAutosaveService from '~~/server/utils/database/event-draft-autosave'
import { apiError, success, zodErrorToFieldErrors } from '~~/server/utils/apiResponse'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const result = await readValidatedBody(event, body => eventAutosaveDraftSchema.safeParse(body))
  if (!result.success) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'VALIDATION_ERROR', message: 'Invalid request.', fieldErrors: zodErrorToFieldErrors(result.error), cause: result.error })
  }

  const draft = await eventDraftAutosaveService.save(result.data, session.user.id)
  const response: AutosaveDraftSaveData = {
    draftKey: draft.draftKey,
    lastSavedStep: draft.lastSavedStep,
    updatedAt: draft.updatedAt,
  }

  return success(response)
})
