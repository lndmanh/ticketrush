import { z } from 'zod'
import { commonSchemaFragments } from './index'

export const venueCountrySchema = z.string().min(2).max(80)
export const eventStatusSchema = z.enum(['draft', 'published', 'on_sale', 'sold_out', 'ended', 'cancelled'])
export const seatStatusSchema = z.enum(['available', 'locked', 'sold', 'unavailable'])
export const holdStatusSchema = z.enum(['active', 'expired', 'converted', 'released'])
export const orderStatusSchema = z.enum(['pending', 'confirmed', 'expired', 'cancelled'])
export const ticketStatusSchema = z.enum(['issued', 'checked_in', 'cancelled'])
export const queueStatusSchema = z.enum(['waiting', 'admitted', 'expired', 'completed'])
export const ageBracketSchema = z.enum(['18-24', '25-34', '35-44', '45+'])
export const genderSchema = z.enum(['female', 'male', 'non-binary', 'prefer-not-to-say'])

const requiredDateSchema = z.union([
  z.date(),
  z.string().trim().min(1, 'Date is required'),
]).pipe(z.coerce.date())

const optionalDateSchema = requiredDateSchema.optional()

export const venueSeatDraftSchema = z.object({
  label: commonSchemaFragments.nonEmptyString('Seat label'),
  seatNumber: z.coerce.number().int().positive(),
  x: z.coerce.number().int().min(0),
  y: z.coerce.number().int().min(0),
  sortOrder: z.coerce.number().int().min(0).default(0),
  accessibilityLabel: z.string().trim().optional(),
  isAccessible: z.boolean().default(false),
})

export const sectionBlueprintSchema = z.object({
  code: commonSchemaFragments.nonEmptyString('Section code'),
  name: commonSchemaFragments.nonEmptyString('Section name'),
  color: commonSchemaFragments.nonEmptyString('Section color'),
  rowCount: z.coerce.number().int().positive('Row count is required'),
  seatsPerRow: z.coerce.number().int().positive('Seats per row is required'),
})

export const venueRowDraftSchema = z.object({
  label: commonSchemaFragments.nonEmptyString('Row label'),
  sortOrder: z.coerce.number().int().min(0).default(0),
  seats: z.array(venueSeatDraftSchema).min(1),
})

export const venueSectionDraftSchema = z.object({
  code: commonSchemaFragments.nonEmptyString('Section code'),
  name: commonSchemaFragments.nonEmptyString('Section name'),
  color: commonSchemaFragments.nonEmptyString('Section color'),
  sortOrder: z.coerce.number().int().min(0).default(0),
  rows: z.array(venueRowDraftSchema).min(1),
})

export const createVenueSchema = z.object({
  slug: commonSchemaFragments.nonEmptyString('Venue slug'),
  name: commonSchemaFragments.nonEmptyString('Venue name'),
  description: z.string().trim().optional(),
  city: commonSchemaFragments.nonEmptyString('City'),
  country: venueCountrySchema.default('Vietnam'),
  address: commonSchemaFragments.nonEmptyString('Address'),
  coverImage: z.string().url().optional().or(z.literal('')),
  sections: z.array(venueSectionDraftSchema).min(1),
})

export const venueBuilderSchema = createVenueSchema.omit({
  sections: true,
}).extend({
  sections: z.array(sectionBlueprintSchema).min(1, 'At least one section is required'),
})

export const updateVenueSchema = createVenueSchema.extend({
  id: commonSchemaFragments.positiveId,
})

export const ticketTypeDraftSchema = z.object({
  id: commonSchemaFragments.positiveId.optional(),
  venueSectionId: commonSchemaFragments.positiveId.optional(),
  name: commonSchemaFragments.nonEmptyString('Ticket type name'),
  description: z.string().trim().optional(),
  priceCents: z.coerce.number().int().nonnegative(),
  currency: z.string().trim().min(3).max(3).default('VND'),
  capacity: z.coerce.number().int().positive(),
  color: commonSchemaFragments.nonEmptyString('Ticket type color'),
  isReservedSeating: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).default(0),
})

export const ticketTypeEditorSchema = ticketTypeDraftSchema.extend({
  venueSectionId: commonSchemaFragments.positiveId,
})

export const eventSessionDraftSchema = z.object({
  id: commonSchemaFragments.positiveId.optional(),
  publicId: z.string().trim().optional(),
  label: commonSchemaFragments.nonEmptyString('Session label'),
  venueId: commonSchemaFragments.positiveId,
  status: eventStatusSchema.default('draft'),
  startsAt: requiredDateSchema,
  endsAt: optionalDateSchema,
  salesStartAt: requiredDateSchema,
  salesEndAt: requiredDateSchema,
  queueEnabled: z.boolean().default(false),
  ticketTypes: z.array(ticketTypeDraftSchema).min(1),
})

export const waitingRoomSettingsSchema = z.object({
  queueActivationThreshold: z.coerce.number().int().positive('Activation threshold must be at least 1').default(250),
  queueBatchSize: z.coerce.number().int().positive('Batch size must be at least 1').default(50),
  queueWindowSeconds: z.coerce.number().int().positive('Admission window must be at least 1 second').default(180),
})

export const eventSessionEditorSchema = eventSessionDraftSchema.extend({
  startsAt: z.string().min(1, 'Session start is required'),
  endsAt: z.string().optional(),
  salesStartAt: z.string().min(1, 'Sales start is required'),
  salesEndAt: z.string().min(1, 'Sales end is required'),
  ticketTypes: z.array(ticketTypeEditorSchema).min(1, 'At least one ticket type is required'),
})

export const createEventSchema = z.object({
  slug: commonSchemaFragments.nonEmptyString('Event slug'),
  title: commonSchemaFragments.nonEmptyString('Event title'),
  subtitle: z.string().trim().optional(),
  description: commonSchemaFragments.nonEmptyString('Event description'),
  venueId: commonSchemaFragments.positiveId,
  coverImage: z.string().url().optional().or(z.literal('')),
  sessions: z.array(eventSessionDraftSchema).min(1),
})

export const eventComposerSchema = createEventSchema.extend({
  venueId: commonSchemaFragments.positiveId,
  sessions: z.array(eventSessionEditorSchema).min(1, 'At least one session is required'),
})

const eventAutosaveTicketTypeSchema = z.object({
  name: z.string().trim().max(120).optional(),
  venueSectionId: z.coerce.number().int().positive().nullable().optional(),
  priceCents: z.coerce.number().int().nonnegative().optional(),
  currency: z.string().trim().min(3).max(3).optional(),
  isReservedSeating: z.boolean().optional(),
  capacity: z.coerce.number().int().nonnegative().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
}).strict()

const eventAutosaveSessionSchema = z.object({
  label: z.string().trim().max(120).optional(),
  venueId: z.coerce.number().int().nonnegative().optional(),
  status: eventStatusSchema.optional(),
  startsAt: z.string().max(40).optional(),
  endsAt: z.string().max(40).optional(),
  salesStartAt: z.string().max(40).optional(),
  salesEndAt: z.string().max(40).optional(),
  ticketTypes: z.array(eventAutosaveTicketTypeSchema).max(50).optional(),
}).strict()

export const eventAutosavePayloadSchema = z.object({
  slug: z.string().trim().max(120).optional(),
  title: z.string().trim().max(180).optional(),
  subtitle: z.string().trim().max(240).optional(),
  description: z.string().trim().max(5000).optional(),
  venueId: z.coerce.number().int().nonnegative().optional(),
  coverImage: z.string().trim().max(1000).optional(),
  sessions: z.array(eventAutosaveSessionSchema).max(25).optional(),
}).strict()

export const eventAutosaveDraftSchema = z.object({
  draftKey: z.string().trim().max(120).optional(),
  lastSavedStep: z.coerce.number().int().min(1).max(4).default(1),
  payload: eventAutosavePayloadSchema,
}).strict()

export const eventSessionPricingFormSchema = eventSessionEditorSchema.pick({
  id: true,
  publicId: true,
  label: true,
  venueId: true,
  status: true,
  startsAt: true,
  endsAt: true,
  salesStartAt: true,
  salesEndAt: true,
  ticketTypes: true,
})

export const eventPricingFormSchema = z.object({
  sessions: z.array(eventSessionPricingFormSchema).min(1, 'At least one session is required'),
})

export const updateEventSchema = createEventSchema.extend({
  id: commonSchemaFragments.positiveId,
  status: eventStatusSchema.default('draft'),
})

export const publishEventSchema = z.object({
  eventId: commonSchemaFragments.positiveId,
})

export const createSeatHoldSchema = z.object({
  eventSessionId: commonSchemaFragments.positiveId,
  eventSeatIds: z.array(commonSchemaFragments.positiveId).min(1).max(10),
  idempotencyKey: commonSchemaFragments.nonEmptyString('Idempotency key'),
  passToken: z.string().trim().optional(),
})

export const releaseSeatHoldSchema = z.object({
  holdPublicId: commonSchemaFragments.nonEmptyString('Hold ID'),
})

export const joinQueueSchema = z.object({
  eventSessionId: commonSchemaFragments.positiveId,
})

export const confirmCheckoutSchema = z.object({
  checkoutSessionId: commonSchemaFragments.nonEmptyString('Checkout session ID'),
  holdPublicId: commonSchemaFragments.nonEmptyString('Hold ID'),
  customerName: commonSchemaFragments.nonEmptyString('Customer name'),
  customerEmail: z.email({ error: 'Valid email is required' }),
  customerPhone: z.string().trim().optional(),
  customerAgeBracket: ageBracketSchema.optional(),
  customerGender: genderSchema.optional(),
})

export const checkoutCustomerSchema = confirmCheckoutSchema.pick({
  customerName: true,
  customerEmail: true,
  customerPhone: true,
  customerAgeBracket: true,
  customerGender: true,
})

export type VenueSeatDraftInput = z.infer<typeof venueSeatDraftSchema>
export type VenueRowDraftInput = z.infer<typeof venueRowDraftSchema>
export type VenueSectionDraftInput = z.infer<typeof venueSectionDraftSchema>
export type CreateVenueInput = z.infer<typeof createVenueSchema>
export type VenueBuilderInput = z.infer<typeof venueBuilderSchema>
export type UpdateVenueInput = z.infer<typeof updateVenueSchema>
export type TicketTypeDraftInput = z.infer<typeof ticketTypeDraftSchema>
export type TicketTypeEditorInput = z.infer<typeof ticketTypeEditorSchema>
export type EventSessionDraftInput = z.infer<typeof eventSessionDraftSchema>
export type EventSessionEditorInput = z.infer<typeof eventSessionEditorSchema>
export type EventSessionPricingFormInput = z.infer<typeof eventSessionPricingFormSchema>
export type WaitingRoomSettingsInput = z.infer<typeof waitingRoomSettingsSchema>
export type EventAutosaveDraftInput = z.infer<typeof eventAutosaveDraftSchema>
export type CreateEventInput = z.infer<typeof createEventSchema>
export type EventComposerInput = z.infer<typeof eventComposerSchema>
export type EventPricingFormInput = z.infer<typeof eventPricingFormSchema>
export type UpdateEventInput = z.infer<typeof updateEventSchema>
export type PublishEventInput = z.infer<typeof publishEventSchema>
export type CreateSeatHoldInput = z.infer<typeof createSeatHoldSchema>
export type ReleaseSeatHoldInput = z.infer<typeof releaseSeatHoldSchema>
export type JoinQueueInput = z.infer<typeof joinQueueSchema>
export type ConfirmCheckoutInput = z.infer<typeof confirmCheckoutSchema>
export type CheckoutCustomerInput = z.infer<typeof checkoutCustomerSchema>
