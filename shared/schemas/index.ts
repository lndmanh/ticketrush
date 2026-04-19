import { z } from 'zod'

export const commonSchemaFragments = {
  userId: z.coerce.number().int().positive('User ID is required'),
  coerceDates: {
    createdAt: z.coerce.date().nullish(),
    updatedAt: z.coerce.date().nullish(),
  },
  positiveId: z.coerce.number().int().positive('ID is required'),
  nonEmptyString: (fieldName: string) => z.string().min(1, `${fieldName} is required`).trim(),
}
