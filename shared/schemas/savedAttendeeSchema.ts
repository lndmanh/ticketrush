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

function birthDateSchema() {
  return z.preprocess(
    (value) => {
      if (typeof value === 'string' && value.trim() === '') {
        return null
      }

      if (value === null) {
        return null
      }

      return value
    },
    z.coerce.date().nullable().optional(),
  )
}

const savedAttendeeBaseSchema = z.object({
  legalName: commonSchemaFragments.nonEmptyString('Legal name'),
  preferredName: optionalTextSchema(),
  email: optionalEmailSchema(),
  phone: optionalTextSchema(),
  birthDate: birthDateSchema(),
  gender: savedAttendeeGenderSchema.optional(),
  guardianName: optionalTextSchema(),
  guardianEmail: optionalEmailSchema(),
  guardianPhone: optionalTextSchema(),
  notes: optionalTextSchema(),
  accessibilityNeeds: optionalTextSchema(),
  isSelf: z.boolean().optional(),
})

function addSavedAttendeeFormIssues(data: z.infer<typeof savedAttendeeBaseSchema>, ctx: z.RefinementCtx) {
  if (data.birthDate && data.birthDate > new Date()) {
    ctx.addIssue({
      code: 'custom',
      path: ['birthDate'],
      message: 'Birth date cannot be in the future',
    })
  }

  const hasContact = Boolean(data.email || data.phone || data.guardianEmail || data.guardianPhone)
  if (!hasContact) {
    ctx.addIssue({
      code: 'custom',
      path: ['email'],
      message: 'At least one contact method is required',
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
