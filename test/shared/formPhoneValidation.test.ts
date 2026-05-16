import { describe, expect, it } from 'vitest'
import { SavedAttendeeGender, TicketHolderSource, AgeBracket, OrderPaymentMethod } from '#shared/commonEnums'
import { savedAttendeeFormSchema } from '#shared/schemas/savedAttendeeSchema'
import { confirmCheckoutSchema } from '#shared/schemas/ticketingSchema'

describe('form phone validation schemas', () => {
  it('rejects alphabetic saved attendee phone fields', () => {
    const result = savedAttendeeFormSchema.safeParse({
      legalName: 'Jane Doe',
      email: 'jane@example.com',
      phone: 'not a phone number',
      guardianPhone: 'guardian phone',
      gender: SavedAttendeeGender.Female,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map(issue => issue.path.join('.'))).toContain('phone')
      expect(result.error.issues.map(issue => issue.path.join('.'))).toContain('guardianPhone')
    }
  })

  it('rejects alphabetic checkout customer and ticket holder phone fields', () => {
    const result = confirmCheckoutSchema.safeParse({
      checkoutSessionId: 'checkout_123',
      holdPublicId: 'hold_123',
      customerName: 'Jane Doe',
      customerEmail: 'jane@example.com',
      customerPhone: 'customer phone',
      customerAgeBracket: AgeBracket.TwentyFiveToThirtyFour,
      customerGender: SavedAttendeeGender.Female,
      payment: OrderPaymentMethod.Visa,
      ticketHolders: [
        {
          eventSeatId: 1,
          source: TicketHolderSource.Manual,
          holder: {
            legalName: 'Jane Doe',
            email: 'jane@example.com',
            phone: 'holder phone',
            gender: SavedAttendeeGender.Female,
          },
          saveAsAttendee: false,
        },
      ],
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map(issue => issue.path.join('.'))).toContain('customerPhone')
      expect(result.error.issues.map(issue => issue.path.join('.'))).toContain('ticketHolders.0.holder.phone')
    }
  })
