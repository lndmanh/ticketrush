import savedAttendeeService from '~~/server/utils/database/savedAttendee'
import { apiError, success } from '~~/server/utils/apiResponse'
import type { DeletedPayload } from '~~/types/common'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'INVALID_SAVED_ATTENDEE_ID', message: 'Saved attendee ID is invalid.' })
  }

  const deleted = await savedAttendeeService.delete(session.user.id, id)

  if (!deleted) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'SAVED_ATTENDEE_NOT_FOUND', message: 'Saved attendee not found.' })
  }

  const response: DeletedPayload = { deleted: true }
  return success(response)
})
