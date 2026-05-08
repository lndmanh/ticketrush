import { waitingRoomSettingsSchema } from '#shared/schemas/ticketingSchema'
import waitingRoomSettingsService from '~~/server/utils/ticketing/waiting-room-settings'
import { apiError, success, zodErrorToFieldErrors } from '~~/server/utils/apiResponse'

export default defineEventHandler(async (event) => {
  const result = await readValidatedBody(event, body => waitingRoomSettingsSchema.safeParse(body))
  if (!result.success) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'VALIDATION_ERROR', message: 'Invalid request.', fieldErrors: zodErrorToFieldErrors(result.error), cause: result.error })
  }

  const settings = await waitingRoomSettingsService.updateSettings(result.data)
  const response: Awaited<ReturnType<typeof waitingRoomSettingsService.updateSettings>> = settings
  return success(response)
})
