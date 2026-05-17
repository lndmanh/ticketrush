import { SavedAttendeeGender } from '#shared/commonEnums'

export enum SelfAttendeeRequirement {
  LegalName = 'legalName',
  Email = 'email',
  Phone = 'phone',
  BirthDate = 'birthDate',
  Gender = 'gender',
}

export type SelfAttendeeProfile = {
  legalName: string | null
  email: string | null
  phone: string | null
  birthDate: Date | string | null
  gender: SavedAttendeeGender | null
}

function hasText(value: string | null): boolean {
  return value !== null && value.trim().length > 0
}

function hasBirthDate(value: Date | string | null): boolean {
  if (value === null) {
    return false
  }

  if (value instanceof Date) {
    return !Number.isNaN(value.getTime())
  }

  return value.trim().length > 0
}

function hasRequiredBookingGender(value: SavedAttendeeGender | null): boolean {
  return value !== null && value !== SavedAttendeeGender.PreferNotToSay
}

export function getMissingSelfAttendeeFields(attendee: SelfAttendeeProfile | null): SelfAttendeeRequirement[] {
  if (!attendee) {
    return [
      SelfAttendeeRequirement.LegalName,
      SelfAttendeeRequirement.Email,
      SelfAttendeeRequirement.Phone,
      SelfAttendeeRequirement.BirthDate,
      SelfAttendeeRequirement.Gender,
    ]
  }

  const missingFields: SelfAttendeeRequirement[] = []

  if (!hasText(attendee.legalName)) {
    missingFields.push(SelfAttendeeRequirement.LegalName)
  }

  if (!hasText(attendee.email)) {
    missingFields.push(SelfAttendeeRequirement.Email)
  }

  if (!hasText(attendee.phone)) {
    missingFields.push(SelfAttendeeRequirement.Phone)
  }

  if (!hasBirthDate(attendee.birthDate)) {
    missingFields.push(SelfAttendeeRequirement.BirthDate)
  }

  if (!hasRequiredBookingGender(attendee.gender)) {
    missingFields.push(SelfAttendeeRequirement.Gender)
  }

  return missingFields
}

export function isSelfAttendeeComplete(attendee: SelfAttendeeProfile | null): boolean {
  return getMissingSelfAttendeeFields(attendee).length === 0
}
