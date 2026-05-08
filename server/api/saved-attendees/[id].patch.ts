import { updateSavedAttendeeSchema } from '#shared/schemas/savedAttendeeSchema'
import savedAttendeeService from '~~/server/utils/database/savedAttendee'
import { apiError, success, zodErrorToFieldErrors } from '~~/server/utils/apiResponse'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'INVALID_SAVED_ATTENDEE_ID', message: 'Saved attendee ID is invalid.' })
  }

  const result = await readValidatedBody(event, body => updateSavedAttendeeSchema.safeParse({ ...body, id }))

  if (!result.success) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'VALIDATION_ERROR', message: 'Invalid request.', fieldErrors: zodErrorToFieldErrors(result.error), cause: result.error })
  }

  const attendee = await savedAttendeeService.update(session.user.id, result.data)

  if (!attendee) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'SAVED_ATTENDEE_NOT_FOUND', message: 'Saved attendee not found.' })
  }

  const response: Awaited<ReturnType<typeof savedAttendeeService.update>> = attendee
  return success(response)
})
