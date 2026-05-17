import { z } from 'zod'

export const commonSchemaFragments = {
  userId: z.coerce.number().int().positive('validation.user_id_required'),
  coerceDates: {
    createdAt: z.coerce.date().nullish(),
    updatedAt: z.coerce.date().nullish(),
  },
  positiveId: z.coerce.number().int().positive('validation.id_required'),
  nonEmptyString: (messageKey: string) => z.string().trim().min(1, messageKey),
}
