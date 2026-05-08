import { joinQueueSchema } from '#shared/schemas/ticketingSchema'
import eventSessionService from '~~/server/utils/database/event-session'
import queueService from '~~/server/utils/ticketing/queue'
import { apiError, success, zodErrorToFieldErrors } from '~~/server/utils/apiResponse'
import { getTicketingSessionKey } from '~~/server/utils/ticketing/session'

export default defineEventHandler(async (event) => {
  const sessionPublicId = getRouterParam(event, 'sessionId')
  if (!sessionPublicId) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'SESSION_NOT_FOUND', message: 'Event session not found.' })
  }

  const session = await eventSessionService.getByPublicId(sessionPublicId)
  if (!session) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'SESSION_NOT_FOUND', message: 'Event session not found.' })
  }

  const userSession = await requireUserSession(event)
  const result = await readValidatedBody(event, body => joinQueueSchema.safeParse({ ...body, eventSessionId: session.id }))
  if (!result.success) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'VALIDATION_ERROR', message: 'Invalid request.', fieldErrors: zodErrorToFieldErrors(result.error), cause: result.error })
  }

  const joined = await queueService.joinQueue(session.id, getTicketingSessionKey(event), userSession.user?.id)
  const response: Awaited<ReturnType<typeof queueService.joinQueue>> = joined
  return success(response)
})
