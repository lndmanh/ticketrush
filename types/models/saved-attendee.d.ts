import type { SavedAttendeeGender } from '#shared/schemas/savedAttendeeSchema'
import type { SelfAttendeeRequirement } from '#shared/utils/selfAttendee'

export interface SavedAttendeeModel {
  id: number
  userId: number
  legalName: string
  preferredName: string | null
  email: string | null
  phone: string | null
  birthDate: Date | null
  gender: SavedAttendeeGender | null
  guardianName: string | null
  guardianEmail: string | null
  guardianPhone: string | null
  notes: string | null
  accessibilityNeeds: string | null
  isSelf: boolean
  createdAt: Date
  updatedAt: Date
}

export interface SelfAttendeeStatusModel {
  attendee: SavedAttendeeModel
  missingFields: SelfAttendeeRequirement[]
  isComplete: boolean
}
