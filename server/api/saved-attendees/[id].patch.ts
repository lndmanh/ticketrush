import { updateSavedAttendeeSchema } from '#shared/schemas/savedAttendeeSchema'
import savedAttendeeService from '~~/server/utils/database/savedAttendee'
import { success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request. Saved attendee ID is invalid.' })
  }

  const result = await readValidatedBody(event, body => updateSavedAttendeeSchema.safeParse({ ...body, id }))

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request. Saved attendee update data is invalid.',
      data: result.error,
    })
  }

  const attendee = await savedAttendeeService.update(session.user.id, result.data)

  if (!attendee) {
    throw createError({ statusCode: 404, statusMessage: 'Saved attendee not found' })
  }

  return success(attendee)
})
