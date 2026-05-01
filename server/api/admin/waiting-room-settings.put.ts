import { waitingRoomSettingsSchema } from '#shared/schemas/ticketingSchema'
import waitingRoomSettingsService from '~~/server/utils/ticketing/waiting-room-settings'
import { success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async (event) => {
  const result = await readValidatedBody(event, body => waitingRoomSettingsSchema.safeParse(body))
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request. Waiting room settings are invalid.', data: result.error })
  }

  const settings = await waitingRoomSettingsService.updateSettings(result.data)
  return success(settings)
})
