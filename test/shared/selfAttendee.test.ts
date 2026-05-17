import { describe, expect, it } from 'vitest'
import { SavedAttendeeGender } from '#shared/commonEnums'
import { SelfAttendeeRequirement, getMissingSelfAttendeeFields, isSelfAttendeeComplete } from '#shared/utils/selfAttendee'

describe('self attendee requirements', () => {
  it('reports every required field when no attendee exists', () => {
    expect(getMissingSelfAttendeeFields(null)).toEqual([
      SelfAttendeeRequirement.LegalName,
      SelfAttendeeRequirement.Email,
      SelfAttendeeRequirement.Phone,
      SelfAttendeeRequirement.BirthDate,
      SelfAttendeeRequirement.Gender,
    ])
  })

  it('treats whitespace legal name as missing', () => {
    expect(
      getMissingSelfAttendeeFields({
        legalName: '   ',
        email: 'jane@example.com',
        phone: '+84 900000000',
        birthDate: new Date('1990-01-01T00:00:00.000Z'),
        gender: SavedAttendeeGender.Female,
      }),
    ).toEqual([SelfAttendeeRequirement.LegalName])
  })

  it('treats whitespace email as missing', () => {
    expect(
      getMissingSelfAttendeeFields({
        legalName: 'Jane Doe',
        email: '   ',
        phone: '+84 900000000',
        birthDate: new Date('1990-01-01T00:00:00.000Z'),
        gender: SavedAttendeeGender.Female,
      }),
    ).toEqual([SelfAttendeeRequirement.Email])
  })

  it('treats whitespace phone as missing', () => {
    expect(
      getMissingSelfAttendeeFields({
        legalName: 'Jane Doe',
        email: 'jane@example.com',
        phone: '   ',
        birthDate: new Date('1990-01-01T00:00:00.000Z'),
        gender: SavedAttendeeGender.Female,
      }),
    ).toEqual([SelfAttendeeRequirement.Phone])
  })

  it('treats null individual fields as missing', () => {
    expect(
      getMissingSelfAttendeeFields({
        legalName: null,
        email: null,
        phone: null,
        birthDate: null,
        gender: null,
      }),
    ).toEqual([
      SelfAttendeeRequirement.LegalName,
      SelfAttendeeRequirement.Email,
      SelfAttendeeRequirement.Phone,
      SelfAttendeeRequirement.BirthDate,
      SelfAttendeeRequirement.Gender,
    ])
  })

  it('treats invalid date objects as missing', () => {
    expect(
      getMissingSelfAttendeeFields({
        legalName: 'Jane Doe',
        email: 'jane@example.com',
        phone: '+84 900000000',
        birthDate: new Date('invalid-date'),
        gender: SavedAttendeeGender.Female,
      }),
    ).toEqual([SelfAttendeeRequirement.BirthDate])
  })

  it('treats empty and whitespace birth date strings as missing', () => {
    expect(
      getMissingSelfAttendeeFields({
        legalName: 'Jane Doe',
        email: 'jane@example.com',
        phone: '+84 900000000',
        birthDate: '   ',
        gender: SavedAttendeeGender.Female,
      }),
    ).toEqual([SelfAttendeeRequirement.BirthDate])
  })

  it('accepts a valid non-empty birth date string', () => {
    expect(
      getMissingSelfAttendeeFields({
        legalName: 'Jane Doe',
        email: 'jane@example.com',
        phone: '+84 900000000',
        birthDate: '1990-01-01',
        gender: SavedAttendeeGender.Female,
      }),
    ).toEqual([])
  })

  it('treats PreferNotToSay as incomplete for booking', () => {
    const missingFields = getMissingSelfAttendeeFields({
      legalName: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+84 900000000',
      birthDate: new Date('1990-01-01T00:00:00.000Z'),
      gender: SavedAttendeeGender.PreferNotToSay,
    })

    expect(missingFields).toEqual([SelfAttendeeRequirement.Gender])
  })

  it('returns false when the attendee is incomplete', () => {
    expect(
      isSelfAttendeeComplete({
        legalName: 'Jane Doe',
        email: 'jane@example.com',
        phone: '   ',
        birthDate: '1990-01-01',
        gender: SavedAttendeeGender.Female,
      }),
    ).toBe(false)
  })

  it('accepts a complete self attendee', () => {
    const attendee = {
      legalName: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+84 900000000',
      birthDate: new Date('1990-01-01T00:00:00.000Z'),
      gender: SavedAttendeeGender.Female,
    }

    expect(getMissingSelfAttendeeFields(attendee)).toEqual([])
    expect(isSelfAttendeeComplete(attendee)).toBe(true)
  })
})
