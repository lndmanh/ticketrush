import { eventAutosaveDraftSchema } from '#shared/schemas/ticketingSchema'
import eventDraftAutosaveService from '~~/server/utils/database/event-draft-autosave'
import { success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async (event) => {
  const result = await readValidatedBody(event, body => eventAutosaveDraftSchema.safeParse(body))
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request. Event autosave data is invalid.', data: result.error })
  }

  const draft = await eventDraftAutosaveService.save(result.data)
  return success({
    draftKey: draft.draftKey,
    lastSavedStep: draft.lastSavedStep,
    updatedAt: draft.updatedAt,
  })
})
