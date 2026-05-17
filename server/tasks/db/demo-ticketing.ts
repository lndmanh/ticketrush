import { asc, eq, sql } from 'drizzle-orm'
import { EventStatus, PricingMode, SeatLayoutMode } from '#shared/commonEnums'
import type { CreateVenueInput, EventSessionDraftInput, TicketTypeDraftInput, VenueSectionDraftInput } from '#shared/schemas/ticketingSchema'
import eventService from '~~/server/utils/database/event'
import venueService from '~~/server/utils/database/venue'

const DEMO_EVENT_COUNT = 20
const SEATS_PER_EVENT = 40
const SECTIONS_PER_VENUE = 4
const ROWS_PER_SECTION = 2
const SEATS_PER_ROW = 5
const CURRENCY = 'VND'

const cityOptions = [
  { city: 'Ho Chi Minh City', area: 'District 1' },
  { city: 'Ha Noi', area: 'Hoan Kiem' },
  { city: 'Da Nang', area: 'Hai Chau' },
  { city: 'Can Tho', area: 'Ninh Kieu' },
]

const eventThemes = [
  'Midnight Arcade Live',
  'Neon River Festival',
  'Golden Hour Sessions',
  'Electric Lotus Night',
  'Skyline Acoustic Club',
  'Indie Market Stage',
  'Dreamwave Arena',
  'Saigon Bass Garden',
  'Northern Lights Showcase',
  'City Pop Weekend',
]

const sectionBlueprints = [
  { code: 'VIP', name: 'VIP', color: '#f97316', gridX: 0, gridY: 0, gridW: 12, gridH: 2, basePriceCents: 180000000 },
  { code: 'PREM', name: 'Premium', color: '#8b5cf6', gridX: 13, gridY: 0, gridW: 12, gridH: 2, basePriceCents: 120000000 },
  { code: 'STD', name: 'Standard', color: '#22c55e', gridX: 0, gridY: 3, gridW: 12, gridH: 2, basePriceCents: 75000000 },
  { code: 'BAL', name: 'Balcony', color: '#06b6d4', gridX: 13, gridY: 3, gridW: 12, gridH: 2, basePriceCents: 50000000 },
]

function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function addDays(base: Date, days: number) {
  const date = new Date(base)
  date.setDate(date.getDate() + days)
  return date
}

function buildDemoSessionTiming(eventIndex: number) {
  const now = new Date()
  const startsAt = addDays(now, 14 + eventIndex * 3)
  startsAt.setHours(19 + (eventIndex % 3), 30, 0, 0)

  const endsAt = new Date(startsAt)
  endsAt.setHours(startsAt.getHours() + 3)

  const salesStartAt = addDays(now, -1)
  salesStartAt.setHours(9, 0, 0, 0)

  const salesEndAt = addDays(startsAt, -1)
  salesEndAt.setHours(23, 0, 0, 0)

  return { startsAt, endsAt, salesStartAt, salesEndAt }
}

function buildVenueSections(eventIndex: number): VenueSectionDraftInput[] {
  return sectionBlueprints.map((section, sectionIndex) => ({
    code: `${section.code}-${eventIndex + 1}`,
    name: section.name,
    color: section.color,
    sortOrder: sectionIndex,
    gridX: section.gridX,
    gridY: section.gridY,
    gridW: section.gridW,
    gridH: section.gridH,
    seatLayoutMode: SeatLayoutMode.Automatic,
    rows: Array.from({ length: ROWS_PER_SECTION }, (_, rowIndex) => ({
      label: String.fromCharCode(65 + sectionIndex * ROWS_PER_SECTION + rowIndex),
      sortOrder: rowIndex,
      seats: Array.from({ length: SEATS_PER_ROW }, (_, seatIndex) => ({
        label: String(seatIndex + 1),
        seatNumber: seatIndex + 1,
        x: seatIndex,
        y: rowIndex,
        sortOrder: seatIndex,
        accessibilityLabel: '',
        isAccessible: seatIndex === 0 && rowIndex === 0 && sectionIndex === 2,
      })),
    })),
  }))
}

function buildVenueInput(eventIndex: number, eventName: string): CreateVenueInput {
  const location = cityOptions[eventIndex % cityOptions.length]
  return {
    slug: `demo-venue-${eventIndex + 1}-${toSlug(eventName)}`,
    name: `${eventName} Venue`,
    description: `Demo ${SEATS_PER_EVENT}-seat venue for ${eventName}.`,
    city: location.city,
    country: 'Vietnam',
    address: `${12 + eventIndex} Demo Street, ${location.area}, ${location.city}`,
    coverImage: '',
    sections: buildVenueSections(eventIndex),
  }
}

function buildEventSubtitle() {
  return `${SEATS_PER_EVENT} seats - ${sectionBlueprints.map(section => section.name).join(', ')}`
}

function buildTicketTypes(eventIndex: number, sections: Array<typeof tables.venueSections.$inferSelect>): TicketTypeDraftInput[] {
  return sections.map((section, sectionIndex) => {
    const blueprint = sectionBlueprints[sectionIndex % sectionBlueprints.length]
    return {
      venueSectionId: section.id,
      name: `${blueprint.name} Reserved`,
      description: `${blueprint.name} reserved seating for demo event ${eventIndex + 1}.`,
      priceCents: blueprint.basePriceCents + eventIndex * 2500000,
      currency: CURRENCY,
      capacity: ROWS_PER_SECTION * SEATS_PER_ROW,
      color: blueprint.color,
      isReservedSeating: true,
      sortOrder: sectionIndex,
    }
  })
}

function buildSessionInput(eventIndex: number, venueId: number, sections: Array<typeof tables.venueSections.$inferSelect>): EventSessionDraftInput {
  const { startsAt, endsAt, salesStartAt, salesEndAt } = buildDemoSessionTiming(eventIndex)
  const ticketTypes = buildTicketTypes(eventIndex, sections)

  return {
    label: 'Main show',
    venueId,
    status: EventStatus.OnSale,
    pricingMode: PricingMode.Section,
    currency: CURRENCY,
    startsAt,
    endsAt,
    salesStartAt,
    salesEndAt,
    queueEnabled: eventIndex % 3 === 0,
    sectionPrices: ticketTypes.map((ticketType) => {
      if (!ticketType.venueSectionId) {
        throw new Error(`Ticket type ${ticketType.name} is missing a venue section.`)
      }

      return {
        venueSectionId: ticketType.venueSectionId,
        priceCents: ticketType.priceCents,
        currency: ticketType.currency,
        sortOrder: ticketType.sortOrder,
      }
    }),
    seatOverrides: [],
    ticketTypes,
  }
}

async function listCurrentVenueSections(venueId: number) {
  const db = useDB()
  const venue = await venueService.getById(venueId)
  if (!venue) {
    throw new Error(`Venue ${venueId} was not found after creation.`)
  }

  return db
    .select()
    .from(tables.venueSections)
    .where(eq(tables.venueSections.venueId, venueId))
    .orderBy(asc(tables.venueSections.sortOrder))
    .all()
}

async function insertTicketTypes(eventId: number, sessionId: number, ticketTypes: TicketTypeDraftInput[]) {
  const now = new Date()
  const db = useDB()
  const rows: Array<typeof tables.ticketTypes.$inferInsert> = ticketTypes.map(ticketType => ({
    eventId,
    eventSessionId: sessionId,
    venueSectionId: ticketType.venueSectionId ?? null,
    name: ticketType.name,
    description: ticketType.description ?? null,
    priceCents: ticketType.priceCents,
    currency: ticketType.currency,
    capacity: ticketType.capacity,
    color: ticketType.color,
    isReservedSeating: ticketType.isReservedSeating,
    sortOrder: ticketType.sortOrder,
    createdAt: now,
    updatedAt: now,
  }))

  if (rows.length > 0) {
    await db.insert(tables.ticketTypes).values(rows)
  }
}

async function findPrimarySessionId(eventId: number) {
  const db = useDB()
  const session = await db
    .select({ id: tables.eventSessions.id })
    .from(tables.eventSessions)
    .where(eq(tables.eventSessions.eventId, eventId))
    .orderBy(asc(tables.eventSessions.startsAt))
    .get()

  if (!session) {
    throw new Error(`Event ${eventId} has no session after creation.`)
  }

  return session.id
}

async function updateExistingDemoEvent(eventIndex: number, eventId: number) {
  const now = new Date()
  const { startsAt, endsAt, salesStartAt, salesEndAt } = buildDemoSessionTiming(eventIndex)
  const db = useDB()

  await db
    .update(tables.eventSessions)
    .set({
      status: EventStatus.OnSale,
      startsAt,
      endsAt,
      salesStartAt,
      salesEndAt,
      updatedAt: now,
    })
    .where(eq(tables.eventSessions.eventId, eventId))

  await db
    .update(tables.events)
    .set({
      status: EventStatus.OnSale,
      subtitle: buildEventSubtitle(),
      startsAt,
      endsAt,
      salesStartAt,
      salesEndAt,
      updatedAt: now,
    })
    .where(eq(tables.events.id, eventId))
}

async function ensureVenueSectionLayoutColumns() {
  const db = useDB()
  const statements = [
    'ALTER TABLE venue_sections ADD COLUMN grid_x integer DEFAULT 0 NOT NULL',
    'ALTER TABLE venue_sections ADD COLUMN grid_y integer DEFAULT 0 NOT NULL',
    'ALTER TABLE venue_sections ADD COLUMN grid_w integer DEFAULT 6 NOT NULL',
    'ALTER TABLE venue_sections ADD COLUMN grid_h integer DEFAULT 4 NOT NULL',
    "ALTER TABLE venue_sections ADD COLUMN seat_layout_mode text DEFAULT 'automatic' NOT NULL",
  ]

  for (const statement of statements) {
    try {
      await db.run(sql.raw(statement))
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const normalizedMessage = message.toLowerCase()
      if (!normalizedMessage.includes('duplicate column') && !normalizedMessage.includes('already exists')) {
        console.warn(`Skipping schema guard statement after SQLite rejected it: ${statement}`)
      }
    }
  }
}

export async function seedDemoTicketingData() {
    console.log('🌱 Starting demo ticketing seed...')
    await ensureVenueSectionLayoutColumns()

    const createdEvents: Array<{ id: number, slug: string, title: string }> = []
    const skippedSlugs: string[] = []

    for (let eventIndex = 0; eventIndex < DEMO_EVENT_COUNT; eventIndex += 1) {
      const theme = eventThemes[eventIndex % eventThemes.length]
      const title = `${theme} ${eventIndex + 1}`
      const eventSlug = `demo-${eventIndex + 1}-${toSlug(theme)}`
      const existingEvent = await eventService.getBySlug(eventSlug)

      if (existingEvent) {
        await updateExistingDemoEvent(eventIndex, existingEvent.id)
        skippedSlugs.push(eventSlug)
        continue
      }

      const venueInput = buildVenueInput(eventIndex, title)
      const existingVenue = await venueService.getBySlug(venueInput.slug)
      const venue = existingVenue ?? await venueService.create(venueInput)
      const sections = await listCurrentVenueSections(venue.id)

      if (sections.length !== SECTIONS_PER_VENUE) {
        throw new Error(`Expected ${SECTIONS_PER_VENUE} sections for ${venue.slug}, found ${sections.length}.`)
      }

      const session = buildSessionInput(eventIndex, venue.id, sections)
      const event = await eventService.create({
        slug: eventSlug,
        title,
        subtitle: buildEventSubtitle(),
        description: `Demo event generated for TicketRush testing. Includes ${SEATS_PER_EVENT} reserved seats across ${SECTIONS_PER_VENUE} ticket categories with section-based pricing.`,
        venueId: venue.id,
        coverImage: '',
        sessions: [session],
      })

      const sessionId = await findPrimarySessionId(event.id)
      await insertTicketTypes(event.id, sessionId, session.ticketTypes ?? [])
      await eventService.publish(event.id)

      createdEvents.push({ id: event.id, slug: event.slug, title: event.title })
      console.log(`✅ Created ${event.title} (${event.slug})`)
    }

    console.log('━'.repeat(50))
    console.log(`Created events: ${createdEvents.length}`)
    console.log(`Skipped existing events: ${skippedSlugs.length}`)
    console.log('━'.repeat(50))

    return {
      result: 'Demo ticketing seed completed',
      createdCount: createdEvents.length,
      skippedCount: skippedSlugs.length,
      createdEvents,
      skippedSlugs,
    }
}

export default defineTask({
  meta: {
    name: 'db:demo-ticketing',
    description: 'Seed demo ticketing data with 20 published events and 40 seats each',
  },
  async run() {
    return seedDemoTicketingData()
  },
})
