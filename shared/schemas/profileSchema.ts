import { z } from 'zod'
import { SavedAttendeeGender } from '#shared/commonEnums'

export const profileEmailSchema = z.email({ error: 'Valid email is required' })

export const profilePhoneSchema = z.string()
  .trim()
  .max(32, 'Phone number is too long')
  .nullable()

export const profileBirthDateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Birth date must use YYYY-MM-DD format')
  .nullable()

export const profileGenderSchema = z.enum(SavedAttendeeGender).nullable()

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: profileEmailSchema,
  phone: profilePhoneSchema,
  birthDate: profileBirthDateSchema,
  gender: profileGenderSchema,
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
