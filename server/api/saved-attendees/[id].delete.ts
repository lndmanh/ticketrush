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

  switch (deleted) {
    case 'self-attendee':
      throw apiError({ status: 409, statusText: 'Conflict', code: 'SELF_ATTENDEE_CANNOT_BE_DELETED', message: 'Your required profile cannot be deleted.' })
    case 'not-found':
      throw apiError({ status: 404, statusText: 'Not Found', code: 'SAVED_ATTENDEE_NOT_FOUND', message: 'Saved attendee not found.' })
    case 'deleted': {
      const response: DeletedPayload = { deleted: true }
      return success(response)
    }
    default: {
      const unhandledResult: never = deleted
      throw apiError({ status: 500, statusText: 'Internal Server Error', code: 'SAVED_ATTENDEE_DELETE_FAILED', message: `Unhandled saved attendee delete result: ${unhandledResult}` })
    }
  }
})
