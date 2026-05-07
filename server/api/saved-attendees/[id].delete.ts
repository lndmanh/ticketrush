import savedAttendeeService from '~~/server/utils/database/savedAttendee'
import { success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request. Saved attendee ID is invalid.' })
  }

  const deleted = await savedAttendeeService.delete(session.user.id, id)

  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: 'Saved attendee not found' })
  }

  return success({ deleted: true })
})
