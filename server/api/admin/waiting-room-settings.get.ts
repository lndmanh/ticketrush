import waitingRoomSettingsService from '~~/server/utils/ticketing/waiting-room-settings'
import { success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async () => {
  const settings = await waitingRoomSettingsService.getSettings()
  const response: Awaited<ReturnType<typeof waitingRoomSettingsService.getSettings>> = settings
  return success(response)
})
