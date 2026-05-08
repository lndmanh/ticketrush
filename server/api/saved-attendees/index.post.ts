import { createSavedAttendeeSchema } from '#shared/schemas/savedAttendeeSchema'
import savedAttendeeService from '~~/server/utils/database/savedAttendee'
import { apiError, success, zodErrorToFieldErrors } from '~~/server/utils/apiResponse'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const result = await readValidatedBody(event, body => createSavedAttendeeSchema.safeParse(body))

  if (!result.success) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'VALIDATION_ERROR', message: 'Invalid request.', fieldErrors: zodErrorToFieldErrors(result.error), cause: result.error })
  }

  const attendee = await savedAttendeeService.create(session.user.id, result.data)
  const response: Awaited<ReturnType<typeof savedAttendeeService.create>> = attendee
  return success(response)
})
