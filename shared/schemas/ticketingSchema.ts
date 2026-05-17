import { z } from 'zod'
import { commonSchemaFragments } from './index'
import { optionalPhoneSchema, savedAttendeeFormSchema } from './savedAttendeeSchema'
import {
  AgeBracket,
  EventStatus,
  HoldStatus,
  OrderPaymentMethod,
  OrderStatus,
  PricingMode,
  QueueStatus,
  SavedAttendeeGender,
  SeatLayoutMode,
  SeatStatus,
  TicketHolderSource,
  TicketStatus,
} from '../commonEnums'
import { locales, sourceLocale } from '../../i18n-constants'

export const localeSchema = z.enum(locales)
export const translatableLocaleSchema = localeSchema.refine(locale => locale !== sourceLocale, {
  message: 'validation.source_locale_original_form',
})
export const venueCountrySchema = z.string().min(2).max(80)
export const eventStatusSchema = z.enum(EventStatus)
export const seatStatusSchema = z.enum(SeatStatus)
export const holdStatusSchema = z.enum(HoldStatus)
export const orderStatusSchema = z.enum(OrderStatus)
export const orderPaymentMethodSchema = z.enum(OrderPaymentMethod)
export const ticketStatusSchema = z.enum(TicketStatus)
export const queueStatusSchema = z.enum(QueueStatus)
export const ageBracketSchema = z.enum(AgeBracket)
export const genderSchema = z.enum(SavedAttendeeGender)
export const seatLayoutModeSchema = z.enum(SeatLayoutMode)
const sectionColorSchema = z.string().trim().regex(/^#(?:[0-9A-Fa-f]{3}){1,2}$/, 'admin.venues.section_color_invalid')

const requiredDateSchema = z.union([
  z.date(),
  z.string().trim().min(1, 'validation.date_required'),
]).pipe(z.coerce.date())

const optionalDateSchema = requiredDateSchema.optional()

export const venueSeatDraftSchema = z.object({
  id: commonSchemaFragments.positiveId.optional(),
  label: z.string().trim().min(1, 'admin.venues.seat_label_required'),
  seatNumber: z.coerce.number().int().positive(),
  x: z.coerce.number().int().min(0),
  y: z.coerce.number().int().min(0),
  sortOrder: z.coerce.number().int().min(0).default(0),
  accessibilityLabel: z.string().trim().optional(),
  isAccessible: z.boolean().default(false),
})

export const sectionBlueprintSchema = z.object({
  code: z.string().trim().min(1, 'admin.venues.section_code_required'),
  name: z.string().trim().min(1, 'admin.venues.section_name_required'),
  color: sectionColorSchema,
  rowCount: z.coerce.number().int().positive('admin.venues.row_count_required'),
  seatsPerRow: z.coerce.number().int().positive('admin.venues.seats_per_row_required'),
})

function addDuplicateSectionCodeIssues(sections: { code: string }[], ctx: z.RefinementCtx) {
  const firstSectionByCode = new Map<string, number>()

  sections.forEach((section, index) => {
    const normalizedCode = section.code.trim().toLowerCase()
    if (!normalizedCode) {
      return
    }

    const firstSectionIndex = firstSectionByCode.get(normalizedCode)
    if (firstSectionIndex === undefined) {
      firstSectionByCode.set(normalizedCode, index)
      return
    }

    ctx.addIssue({
      code: 'custom',
      message: 'admin.venues.section_code_unique',
      path: [index, 'code'],
    })
  })
}

export const venueRowDraftSchema = z.object({
  id: commonSchemaFragments.positiveId.optional(),
  label: z.string().trim().min(1, 'admin.venues.row_label_required'),
  sortOrder: z.coerce.number().int().min(0).default(0),
  seats: z.array(venueSeatDraftSchema).min(1),
})

export const venueSectionDraftSchema = z.object({
  id: commonSchemaFragments.positiveId.optional(),
  code: z.string().trim().min(1, 'admin.venues.section_code_required'),
  name: z.string().trim().min(1, 'admin.venues.section_name_required'),
  color: sectionColorSchema,
  sortOrder: z.coerce.number().int().min(0).default(0),
  gridX: z.coerce.number().int().min(0).max(24),
  gridY: z.coerce.number().int().min(0).max(99),
  gridW: z.coerce.number().int().positive().max(25),
  gridH: z.coerce.number().int().positive().max(24),
  seatLayoutMode: seatLayoutModeSchema.default(SeatLayoutMode.Automatic),
  rows: z.array(venueRowDraftSchema).min(1),
})

function addVenueSectionGridIssues(sections: { gridX: number, gridY: number, gridW: number, gridH: number, rows: { seats: { x: number, y: number }[] }[], seatLayoutMode: SeatLayoutMode }[], ctx: z.RefinementCtx) {
  const occupiedCells = new Map<string, number>()

  sections.forEach((section, sectionIndex) => {
    if (section.gridX < 0 || section.gridY < 0 || section.gridW <= 0 || section.gridH <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: [sectionIndex],
        message: 'admin.venues.section_grid_bounds_positive',
      })
      return
    }

    if (section.gridY > 99 || section.gridH > 24 || section.gridX > 24) {
      ctx.addIssue({
        code: 'custom',
        path: [sectionIndex],
        message: 'admin.venues.section_grid_bounds_range',
      })
      return
    }

    if (section.gridW > 25) {
      ctx.addIssue({
        code: 'custom',
        path: [sectionIndex, 'gridW'],
        message: 'admin.venues.section_grid_width_max',
      })
      return
    }

    if (section.gridX + section.gridW > 25) {
      ctx.addIssue({
        code: 'custom',
        path: [sectionIndex, 'gridW'],
        message: 'admin.venues.section_grid_fit',
      })
      return
    }

    const maxCells = section.gridW * section.gridH
    for (let cellIndex = 0; cellIndex < maxCells; cellIndex += 1) {
      const y = section.gridY + Math.floor(cellIndex / section.gridW)
      const x = section.gridX + (cellIndex % section.gridW)
      const cellKey = `${x}:${y}`
      const firstSectionIndex = occupiedCells.get(cellKey)
      if (firstSectionIndex !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: [sectionIndex, 'gridX'],
          message: 'admin.venues.section_grid_overlap',
        })
        continue
      }

      occupiedCells.set(cellKey, sectionIndex)
    }

    if (section.seatLayoutMode === SeatLayoutMode.Manual) {
      const manualSeats: { x: number, y: number }[] = []
      for (const row of section.rows) {
        manualSeats.push(...row.seats.map(seat => ({ x: seat.x, y: seat.y })))
      }

      const seenManualSeats = new Set<string>()
      for (const seat of manualSeats) {
        const seatKey = `${seat.x}:${seat.y}`
        if (seenManualSeats.has(seatKey)) {
          ctx.addIssue({
            code: 'custom',
            path: [sectionIndex, 'rows'],
            message: 'admin.venues.manual_seat_coordinates_unique',
          })
          break
        }
        seenManualSeats.add(seatKey)
      }
    }
  })
}

export const createVenueSchema = z.object({
  slug: z.string().trim().min(1, 'admin.venues.venue_slug_required'),
  name: z.string().trim().min(1, 'admin.venues.venue_name_required'),
  description: z.string().trim().optional(),
  city: z.string().trim().min(1, 'admin.venues.city_required'),
  country: venueCountrySchema.default('Vietnam'),
  address: z.string().trim().min(1, 'admin.venues.address_required'),
  coverImage: z.string().url().optional().or(z.literal('')),
  sections: z.array(venueSectionDraftSchema).min(1).superRefine((sections, ctx) => {
    addDuplicateSectionCodeIssues(sections, ctx)
    addVenueSectionGridIssues(sections, ctx)
  }),
})

export const venueBuilderSchema = createVenueSchema

export const updateVenueSchema = createVenueSchema.extend({
  id: commonSchemaFragments.positiveId,
})

export const ticketTypeDraftSchema = z.object({
  id: commonSchemaFragments.positiveId.optional(),
  venueSectionId: commonSchemaFragments.positiveId.nullable().optional(),
  name: z.string().trim().min(1, 'validation.ticket_release_name_required'),
  description: z.string().trim().optional(),
  priceCents: z.coerce.number().int().nonnegative(),
  currency: z.string().trim().min(3).max(3).default('VND'),
  capacity: z.coerce.number().int().positive(),
  color: z.string().trim().min(1, 'validation.ticket_release_color_required').default('#3b82f6'),
  isReservedSeating: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).default(0),
})

export const pricingModeSchema = z.enum(PricingMode)

export const sessionSectionPriceDraftSchema = z.object({
  venueSectionId: commonSchemaFragments.positiveId,
  priceCents: z.coerce.number().int().nonnegative(),
  currency: z.string().trim().min(3).max(3).default('VND'),
  sortOrder: z.coerce.number().int().min(0).default(0),
})

export const sessionSeatOverrideDraftSchema = z.object({
  venueSeatId: commonSchemaFragments.positiveId,
  venueSectionId: commonSchemaFragments.positiveId,
  priceCents: z.coerce.number().int().nonnegative().nullable().optional(),
  currency: z.string().trim().min(3).max(3).nullable().optional(),
  isDisabled: z.boolean().default(false),
}).superRefine((override, ctx) => {
  if (!override.isDisabled && override.priceCents == null && override.currency == null) {
    ctx.addIssue({
      code: 'custom',
      path: ['priceCents'],
      message: 'validation.seat_override_price_currency_or_disable',
    })
  }
})

function addDuplicateSessionSectionPriceIssues(sectionPrices: { venueSectionId: number }[], ctx: z.RefinementCtx) {
  const firstIndexBySectionId = new Map<number, number>()

  sectionPrices.forEach((sectionPrice, index) => {
    const firstIndex = firstIndexBySectionId.get(sectionPrice.venueSectionId)
    if (firstIndex === undefined) {
      firstIndexBySectionId.set(sectionPrice.venueSectionId, index)
      return
    }

    ctx.addIssue({
      code: 'custom',
      path: [index, 'venueSectionId'],
      message: 'validation.section_price_unique',
    })
  })
}

function addDuplicateSessionSeatOverrideIssues(seatOverrides: { venueSeatId: number }[], ctx: z.RefinementCtx) {
  const firstIndexBySeatId = new Map<number, number>()

  seatOverrides.forEach((seatOverride, index) => {
    const firstIndex = firstIndexBySeatId.get(seatOverride.venueSeatId)
    if (firstIndex === undefined) {
      firstIndexBySeatId.set(seatOverride.venueSeatId, index)
      return
    }

    ctx.addIssue({
      code: 'custom',
      path: [index, 'venueSeatId'],
      message: 'validation.seat_override_unique',
    })
  })
}

export const ticketTypeEditorSchema = ticketTypeDraftSchema.extend({
  venueSectionId: commonSchemaFragments.positiveId.nullable(),
}).superRefine((ticketType, ctx) => {
  if (ticketType.isReservedSeating && !ticketType.venueSectionId) {
    ctx.addIssue({
      code: 'custom',
      path: ['venueSectionId'],
      message: 'validation.reserved_ticket_requires_section',
    })
  }
})

interface EventSessionTimingInput {
  startsAt: string | Date
  endsAt?: string | Date | null
  salesStartAt: string | Date
  salesEndAt: string | Date
}

interface EventSessionTimingIssue {
  field: 'startsAt' | 'endsAt' | 'salesStartAt' | 'salesEndAt'
  message: string
}

function parseEventSessionDate(value: string | Date | null | undefined) {
  if (!value) {
    return null
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date
}

export function getEventSessionTimingIssues(input: EventSessionTimingInput, sessionLabel: string, now = new Date()) {
  const issues: EventSessionTimingIssue[] = []
  const startsAt = parseEventSessionDate(input.startsAt)
  const endsAt = parseEventSessionDate(input.endsAt)
  const salesStartAt = parseEventSessionDate(input.salesStartAt)
  const salesEndAt = parseEventSessionDate(input.salesEndAt)

  if (!startsAt) {
    issues.push({ field: 'startsAt', message: 'validation.session_start_required' })
  }
  else if (startsAt <= now) {
    issues.push({ field: 'startsAt', message: 'validation.session_start_future' })
  }

  if (input.endsAt && !endsAt) {
    issues.push({ field: 'endsAt', message: 'validation.session_end_valid' })
  }
  else if (startsAt && endsAt && endsAt <= startsAt) {
    issues.push({ field: 'endsAt', message: 'validation.session_end_after_start' })
  }

  if (!salesStartAt) {
    issues.push({ field: 'salesStartAt', message: 'validation.sales_start_required' })
  }

  if (!salesEndAt) {
    issues.push({ field: 'salesEndAt', message: 'validation.sales_end_required' })
  }

  if (salesStartAt && salesEndAt && salesEndAt <= salesStartAt) {
    issues.push({ field: 'salesEndAt', message: 'validation.sales_end_after_start' })
  }

  if (startsAt && salesStartAt && salesStartAt >= startsAt) {
    issues.push({ field: 'salesStartAt', message: 'validation.sales_start_before_session' })
  }

  if (startsAt && salesEndAt && salesEndAt >= startsAt) {
    issues.push({ field: 'salesEndAt', message: 'validation.sales_end_before_session' })
  }

  return issues
}

const eventSessionDraftBaseSchema = z.object({
  id: commonSchemaFragments.positiveId.optional(),
  publicId: z.string().trim().optional(),
  label: z.string().trim().min(1, 'validation.session_label_required'),
  venueId: commonSchemaFragments.positiveId,
  status: eventStatusSchema.default(EventStatus.Draft),
  pricingMode: pricingModeSchema.default(PricingMode.Uniform),
  currency: z.string().trim().min(3).max(3).default('VND'),
  startsAt: requiredDateSchema,
  endsAt: optionalDateSchema,
  salesStartAt: requiredDateSchema,
  salesEndAt: requiredDateSchema,
  queueEnabled: z.boolean().default(false),
  sectionPrices: z.array(sessionSectionPriceDraftSchema).default([]),
  seatOverrides: z.array(sessionSeatOverrideDraftSchema).default([]),
  ticketTypes: z.array(ticketTypeDraftSchema).optional(),
})

function addEventSessionTimingIssues(input: EventSessionTimingInput, sessionLabel: string, ctx: z.RefinementCtx) {
  for (const issue of getEventSessionTimingIssues(input, sessionLabel)) {
    ctx.addIssue({
      code: 'custom',
      path: [issue.field],
      message: issue.message,
    })
  }
}

export const eventSessionDraftSchema = eventSessionDraftBaseSchema.superRefine((session, ctx) => {
  const sessionLabel = session.label?.trim() || 'Session'
  addEventSessionTimingIssues(session, sessionLabel, ctx)
  addDuplicateSessionSectionPriceIssues(session.sectionPrices, ctx)
  addDuplicateSessionSeatOverrideIssues(session.seatOverrides, ctx)
})

export const waitingRoomSettingsSchema = z.object({
  queueActivationThreshold: z.coerce.number().int().positive('validation.queue_activation_threshold_min').default(250),
  queueBatchSize: z.coerce.number().int().positive('validation.queue_batch_size_min').default(50),
  queueWindowSeconds: z.coerce.number().int().positive('validation.queue_window_seconds_min').default(180),
})

const eventCoverImageSchema = z.union([z.string().url(), z.literal(''), z.null()])
  .optional()
  .transform(value => value === null ? '' : value)

const eventSessionEditorBaseSchema = eventSessionDraftBaseSchema.extend({
  startsAt: z.string().min(1, 'validation.session_start_required'),
  endsAt: z.string().optional(),
  salesStartAt: z.string().min(1, 'validation.sales_start_required'),
  salesEndAt: z.string().min(1, 'validation.sales_end_required'),
  sectionPrices: z.array(sessionSectionPriceDraftSchema).default([]),
  seatOverrides: z.array(sessionSeatOverrideDraftSchema).default([]),
  ticketTypes: z.array(ticketTypeEditorSchema).optional(),
})

export const eventSessionEditorSchema = eventSessionEditorBaseSchema.superRefine((session, ctx) => {
  const sessionLabel = session.label?.trim() || 'Session'
  addEventSessionTimingIssues(session, sessionLabel, ctx)
  addDuplicateSessionSectionPriceIssues(session.sectionPrices, ctx)
  addDuplicateSessionSeatOverrideIssues(session.seatOverrides, ctx)
})

export const sessionPricingUpdateSchema = z.object({
  pricingMode: pricingModeSchema,
  currency: z.string().trim().min(3).max(3),
  priceCents: z.coerce.number().int().nonnegative().optional(),
  sectionPrices: z.array(sessionSectionPriceDraftSchema).default([]),
}).superRefine((session, ctx) => {
  addDuplicateSessionSectionPriceIssues(session.sectionPrices, ctx)
  if (session.pricingMode === PricingMode.Uniform) {
    if (session.priceCents === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['priceCents'],
        message: 'validation.uniform_pricing_requires_price',
      })
    }

    if (session.sectionPrices.length > 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['sectionPrices'],
        message: 'validation.uniform_pricing_no_section_prices',
      })
    }
  }

  if (session.pricingMode === PricingMode.Section && session.sectionPrices.length === 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['sectionPrices'],
      message: 'validation.section_pricing_requires_section_prices',
    })
  }
})

export const sessionSeatOverridesUpdateSchema = z.object({
  seatOverrides: z.array(sessionSeatOverrideDraftSchema).optional(),
  overrides: z.array(sessionSeatOverrideDraftSchema).optional(),
}).transform(session => ({
  seatOverrides: session.seatOverrides ?? session.overrides ?? [],
})).superRefine((session, ctx) => {
  addDuplicateSessionSeatOverrideIssues(session.seatOverrides, ctx)
})

export const venueLayoutSyncApplySchema = z.object({
  mappings: z.array(z.object({
    venueSectionId: commonSchemaFragments.positiveId,
    sourceVenueSectionId: commonSchemaFragments.positiveId.nullable(),
    priceCents: z.coerce.number().int().nonnegative(),
    currency: z.string().trim().min(3).max(3),
  })).min(1),
})

export const createEventSchema = z.object({
  slug: z.string().trim().min(1, 'validation.event_slug_required'),
  title: z.string().trim().min(1, 'validation.event_title_required'),
  subtitle: z.string().trim().optional(),
  description: z.string().trim().min(1, 'validation.event_description_required'),
  venueId: commonSchemaFragments.positiveId,
  coverImage: eventCoverImageSchema,
  sessions: z.array(eventSessionDraftSchema).min(1, 'validation.session_required'),
})

export const eventComposerSchema = createEventSchema.extend({
  venueId: commonSchemaFragments.positiveId,
  sessions: z.array(eventSessionEditorSchema).min(1, 'validation.session_required'),
})

const eventAutosaveTicketTypeSchema = z.object({
  name: z.string().trim().max(120).optional(),
  venueSectionId: z.coerce.number().int().positive().nullable().optional(),
  priceCents: z.coerce.number().int().nonnegative().optional(),
  currency: z.string().trim().min(3).max(3).optional(),
  color: z.string().trim().max(40).optional(),
  isReservedSeating: z.boolean().optional(),
  capacity: z.coerce.number().int().nonnegative().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
}).strict()

const eventAutosaveSessionSchema = z.object({
  label: z.string().trim().max(120).optional(),
  venueId: z.coerce.number().int().nonnegative().optional(),
  status: eventStatusSchema.optional(),
  pricingMode: pricingModeSchema.optional(),
  currency: z.string().trim().min(3).max(3).optional(),
  queueEnabled: z.boolean().optional(),
  startsAt: z.string().max(40).optional(),
  endsAt: z.string().max(40).optional(),
  salesStartAt: z.string().max(40).optional(),
  salesEndAt: z.string().max(40).optional(),
  ticketTypes: z.array(eventAutosaveTicketTypeSchema).max(50).optional(),
  sectionPrices: z.array(z.object({
    venueSectionId: z.coerce.number().int().positive(),
    priceCents: z.coerce.number().int().nonnegative(),
    currency: z.string().trim().min(3).max(3).optional(),
    sortOrder: z.coerce.number().int().min(0).optional(),
  }).strict()).max(50).optional(),
  seatOverrides: z.array(z.object({
    venueSeatId: z.coerce.number().int().positive(),
    venueSectionId: z.coerce.number().int().positive(),
    priceCents: z.coerce.number().int().nonnegative().nullable().optional(),
    currency: z.string().trim().min(3).max(3).nullable().optional(),
    isDisabled: z.boolean().optional(),
  }).strict()).max(200).optional(),
}).strict()

export const eventAutosavePayloadSchema = z.object({
  slug: z.string().trim().max(120).optional(),
  title: z.string().trim().max(180).optional(),
  subtitle: z.string().trim().max(240).optional(),
  description: z.string().trim().max(5000).optional(),
  venueId: z.coerce.number().int().nonnegative().optional(),
  coverImage: z.string().trim().max(1000).optional(),
  sessions: z.array(eventAutosaveSessionSchema).max(25).optional(),
  pricingMode: pricingModeSchema.optional(),
  currency: z.string().trim().min(3).max(3).optional(),
  sectionPrices: z.array(z.object({
    venueSectionId: z.coerce.number().int().positive(),
    priceCents: z.coerce.number().int().nonnegative(),
    currency: z.string().trim().min(3).max(3).optional(),
    sortOrder: z.coerce.number().int().min(0).optional(),
  }).strict()).max(50).optional(),
  seatOverrides: z.array(z.object({
    venueSeatId: z.coerce.number().int().positive(),
    venueSectionId: z.coerce.number().int().positive(),
    priceCents: z.coerce.number().int().nonnegative().nullable().optional(),
    currency: z.string().trim().min(3).max(3).nullable().optional(),
    isDisabled: z.boolean().optional(),
  }).strict()).max(200).optional(),
}).strict()

export const eventAutosaveDraftSchema = z.object({
  draftKey: z.string().trim().max(120).optional(),
  lastSavedStep: z.coerce.number().int().min(1).max(4).default(1),
  payload: eventAutosavePayloadSchema,
}).strict()

export const eventSessionPricingFormSchema = eventSessionEditorBaseSchema.pick({
  id: true,
  publicId: true,
  label: true,
  venueId: true,
  status: true,
  pricingMode: true,
  currency: true,
  queueEnabled: true,
  startsAt: true,
  endsAt: true,
  salesStartAt: true,
  salesEndAt: true,
  sectionPrices: true,
  seatOverrides: true,
  ticketTypes: true,
}).superRefine((session, ctx) => {
  const sessionLabel = session.label?.trim() || 'Session'
  addEventSessionTimingIssues(session, sessionLabel, ctx)
  addDuplicateSessionSectionPriceIssues(session.sectionPrices, ctx)
  addDuplicateSessionSeatOverrideIssues(session.seatOverrides, ctx)
})

export const eventPricingFormSchema = z.object({
  sessions: z.array(eventSessionPricingFormSchema).min(1, 'validation.session_required'),
})

export const updateEventSchema = createEventSchema.extend({
  id: commonSchemaFragments.positiveId,
  status: eventStatusSchema.default(EventStatus.Draft),
})

const optionalLocalizedShortTextSchema = z.string().trim().max(240).nullable().optional()
const optionalLocalizedLongTextSchema = z.string().trim().max(5000).nullable().optional()

export const ticketTypeTranslationSchema = z.object({
  ticketTypeId: commonSchemaFragments.positiveId,
  name: optionalLocalizedShortTextSchema,
  description: optionalLocalizedLongTextSchema,
})

export const eventTranslationSchema = z.object({
  locale: translatableLocaleSchema,
  title: optionalLocalizedShortTextSchema,
  subtitle: optionalLocalizedShortTextSchema,
  description: optionalLocalizedLongTextSchema,
  ticketTypes: z.array(ticketTypeTranslationSchema).default([]),
})

export const venueTranslationSchema = z.object({
  locale: translatableLocaleSchema,
  name: optionalLocalizedShortTextSchema,
  description: optionalLocalizedLongTextSchema,
  city: optionalLocalizedShortTextSchema,
  address: optionalLocalizedLongTextSchema,
})

export const publishEventSchema = z.object({
  eventId: commonSchemaFragments.positiveId,
})

export const createSeatHoldSchema = z.object({
  eventSessionId: commonSchemaFragments.positiveId,
  eventSeatIds: z.array(commonSchemaFragments.positiveId).min(1).max(10),
  idempotencyKey: z.string().trim().min(1, 'validation.idempotency_key_required'),
  passToken: z.string().trim().optional(),
})

export const releaseSeatHoldSchema = z.object({
  holdPublicId: z.string().trim().min(1, 'validation.hold_id_required'),
})

export const joinQueueSchema = z.object({
  eventSessionId: commonSchemaFragments.positiveId,
})

export const bookingCaptchaPassSchema = z.object({
  'cf-turnstile-response': z.string().trim().min(1, 'validation.captcha_response_required'),
})

export const ticketHolderSourceSchema = z.enum(TicketHolderSource)

export const checkoutTicketHolderSchema = z.object({
  eventSeatId: commonSchemaFragments.positiveId,
  source: ticketHolderSourceSchema,
  savedAttendeeId: commonSchemaFragments.positiveId.optional(),
  holder: savedAttendeeFormSchema.optional(),
  saveAsAttendee: z.boolean().default(false),
}).superRefine((assignment, ctx) => {
  if (assignment.source === TicketHolderSource.SavedAttendee && !assignment.savedAttendeeId) {
    ctx.addIssue({ code: 'custom', path: ['savedAttendeeId'], message: 'validation.choose_saved_attendee' })
  }
  if ((assignment.source === TicketHolderSource.Account || assignment.source === TicketHolderSource.Manual) && !assignment.holder) {
    ctx.addIssue({ code: 'custom', path: ['holder'], message: 'validation.ticket_holder_required' })
  }
})

export const confirmCheckoutSchema = z.object({
  checkoutSessionId: z.string().trim().min(1, 'validation.checkout_session_id_required'),
  holdPublicId: z.string().trim().min(1, 'validation.hold_id_required'),
  customerName: z.string().trim().min(1, 'validation.customer_name_required'),
  customerEmail: z.email({ error: 'validation.email_required' }),
  customerPhone: optionalPhoneSchema(),
  customerAgeBracket: ageBracketSchema.optional(),
  customerGender: genderSchema.optional(),
  payment: orderPaymentMethodSchema,
  ticketHolders: z.array(checkoutTicketHolderSchema).min(1, 'validation.assign_ticket_holder_each_ticket'),
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
export type PricingModeInput = z.infer<typeof pricingModeSchema>
export type SessionSectionPriceDraftInput = z.infer<typeof sessionSectionPriceDraftSchema>
export type SessionSeatOverrideDraftInput = z.infer<typeof sessionSeatOverrideDraftSchema>
export type EventSessionDraftInput = z.infer<typeof eventSessionDraftSchema>
export type EventSessionEditorInput = z.infer<typeof eventSessionEditorSchema>
export type EventSessionPricingFormInput = z.infer<typeof eventSessionPricingFormSchema>
export type WaitingRoomSettingsInput = z.infer<typeof waitingRoomSettingsSchema>
export type EventAutosaveDraftInput = z.infer<typeof eventAutosaveDraftSchema>
export type CreateEventInput = z.infer<typeof createEventSchema>
export type EventComposerInput = z.infer<typeof eventComposerSchema>
export type EventPricingFormInput = z.infer<typeof eventPricingFormSchema>
export type UpdateEventInput = z.infer<typeof updateEventSchema>
export type EventTranslationInput = z.infer<typeof eventTranslationSchema>
export type VenueTranslationInput = z.infer<typeof venueTranslationSchema>
export type PublishEventInput = z.infer<typeof publishEventSchema>
export type CreateSeatHoldInput = z.infer<typeof createSeatHoldSchema>
export type ReleaseSeatHoldInput = z.infer<typeof releaseSeatHoldSchema>
export type JoinQueueInput = z.infer<typeof joinQueueSchema>
export type BookingCaptchaPassInput = z.infer<typeof bookingCaptchaPassSchema>
export type TicketHolderSourceInput = z.infer<typeof ticketHolderSourceSchema>
export type CheckoutTicketHolderInput = z.infer<typeof checkoutTicketHolderSchema>
export type ConfirmCheckoutInput = z.infer<typeof confirmCheckoutSchema>
export type CheckoutCustomerInput = z.infer<typeof checkoutCustomerSchema>
export type VenueLayoutSyncApplySchemaInput = z.infer<typeof venueLayoutSyncApplySchema>
