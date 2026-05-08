import savedAttendeeService from '~~/server/utils/database/savedAttendee'
import { success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const attendees = await savedAttendeeService.listForUser(session.user.id)
  const response: Awaited<ReturnType<typeof savedAttendeeService.listForUser>> = attendees
  return success(response)
})
