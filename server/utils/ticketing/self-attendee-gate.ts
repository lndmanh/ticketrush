import type { SavedAttendeeModel } from '~~/types/models/saved-attendee'
import savedAttendeeService from '~~/server/utils/database/savedAttendee'
import { apiError } from '~~/server/utils/apiResponse'

export async function requireCompleteSelfAttendee(userId: number): Promise<SavedAttendeeModel> {
  const status = await savedAttendeeService.getSelfAttendeeStatus(userId)
  if (status.isComplete) {
    return status.attendee
  }

  throw apiError({
    status: 409,
    statusText: 'Conflict',
    code: 'SELF_ATTENDEE_INCOMPLETE',
    message: 'Complete your required profile before booking tickets.',
    details: {
      missingFields: status.missingFields,
    },
  })
}
