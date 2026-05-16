import savedAttendeeService from '~~/server/utils/database/savedAttendee'
import { success } from '~~/server/utils/apiResponse'
import type { SelfAttendeeStatusModel } from '~~/types/models/saved-attendee'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const status = await savedAttendeeService.getSelfAttendeeStatus(session.user.id)
  const response: SelfAttendeeStatusModel = status
  return success(response)
})
