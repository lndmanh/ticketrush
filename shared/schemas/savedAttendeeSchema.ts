import { z } from 'zod'
import { commonSchemaFragments } from './index'
import { SavedAttendeeGender as SavedAttendeeGenderEnum } from '../commonEnums'

export const savedAttendeeGenderSchema = z.enum(SavedAttendeeGenderEnum)
export type SavedAttendeeGender = z.infer<typeof savedAttendeeGenderSchema>

function optionalTextSchema() {
  return z.string().trim().optional()
}

function optionalEmailSchema() {
  return z.union([
    z.string().trim().max(0),
    z.string().trim().email('Email is invalid'),
  ]).optional()
}

function requiredEmailSchema() {
  return z.string().trim().min(1, 'saved_attendees.email_required').email('Email is invalid')
}

export function optionalPhoneSchema() {
  return z.union([
    z.string().trim().max(0),
    z.string().trim().regex(/^\+?[0-9\s().-]{7,20}$/, 'saved_attendees.phone_invalid'),
  ]).optional()
}

function requiredPhoneSchema() {
  return z.string().trim().min(1, 'saved_attendees.phone_required').regex(/^\+?[0-9\s().-]{7,20}$/, 'saved_attendees.phone_invalid')
}

function requiredBirthDateSchema() {
  return z.preprocess(
    (value) => {
      if (typeof value === 'string' && value.trim() === '') {
        return undefined
      }

      return value
    },
    z.coerce.date({ error: 'saved_attendees.birth_date_required' }),
  )
}

const savedAttendeeBaseSchema = z.object({
  legalName: z.string().trim().min(1, 'saved_attendees.legal_name_required'),
  preferredName: optionalTextSchema(),
  email: requiredEmailSchema(),
  phone: requiredPhoneSchema(),
  birthDate: requiredBirthDateSchema(),
  gender: savedAttendeeGenderSchema,
  guardianName: optionalTextSchema(),
  guardianEmail: optionalEmailSchema(),
  guardianPhone: optionalPhoneSchema(),
  notes: optionalTextSchema(),
  accessibilityNeeds: optionalTextSchema(),
  isSelf: z.boolean().optional(),
})

function addSavedAttendeeFormIssues(data: z.infer<typeof savedAttendeeBaseSchema>, ctx: z.RefinementCtx) {
  if (data.birthDate && data.birthDate > new Date()) {
    ctx.addIssue({
      code: 'custom',
      path: ['birthDate'],
      message: 'saved_attendees.birth_date_future',
    })
  }

  const hasContact = Boolean(data.email || data.phone || data.guardianEmail || data.guardianPhone)
  if (!hasContact) {
    ctx.addIssue({
      code: 'custom',
      path: ['email'],
      message: 'saved_attendees.contact_required',
    })
  }
}

export const savedAttendeeFormSchema = savedAttendeeBaseSchema.superRefine(addSavedAttendeeFormIssues)

export const createSavedAttendeeSchema = savedAttendeeFormSchema

export const updateSavedAttendeeSchema = savedAttendeeBaseSchema.safeExtend({
  id: commonSchemaFragments.positiveId,
}).superRefine(addSavedAttendeeFormIssues)

export type SavedAttendeeFormInput = z.infer<typeof savedAttendeeFormSchema>
export type CreateSavedAttendeeInput = z.infer<typeof createSavedAttendeeSchema>
export type UpdateSavedAttendeeInput = z.infer<typeof updateSavedAttendeeSchema>
