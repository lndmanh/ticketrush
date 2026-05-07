import { createSavedAttendeeSchema } from '#shared/schemas/savedAttendeeSchema'
import savedAttendeeService from '~~/server/utils/database/savedAttendee'
import { success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const result = await readValidatedBody(event, body => createSavedAttendeeSchema.safeParse(body))

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request. Saved attendee is invalid.',
      data: result.error,
    })
  }

  const attendee = await savedAttendeeService.create(session.user.id, result.data)
  return success(attendee)
})
