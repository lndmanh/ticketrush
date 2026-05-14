import { PricingMode } from '#shared/commonEnums'
import type { CreateEventInput, CreateVenueInput } from '#shared/schemas/ticketingSchema'
import type { VenueDetail } from '~~/types/venues'
import eventService from '~~/server/utils/database/event'
import venueService from '~~/server/utils/database/venue'

const LEGACY_DEMO_VENUE_SLUG = 'ticketrush-showcase-hall'

type DemoVenueInput = {
  slug: string
  name: string
  city: string
  address: string
}

const eventTitles = [
  'Neon Skyline Festival',
  'Midnight Arcade Live',
  'Saigon Indie Weekender',
  'Aurora Chamber Night',
  'Future Beats Summit',
  'Golden Hour Jazz Club',
  'Pixel Pop Carnival',
  'Lotus Stage Showcase',
  'Cosmic Strings Concert',
  'Electric Lantern Gala',
]

const demoVenueInputs: DemoVenueInput[] = [
  { slug: 'saigon-riverside-arena', name: 'Saigon Riverside Arena', city: 'Ho Chi Minh City', address: '02 Ton Duc Thang, District 1' },
  { slug: 'hanoi-old-quarter-theatre', name: 'Hanoi Old Quarter Theatre', city: 'Hanoi', address: '16 Hang Bac, Hoan Kiem' },
  { slug: 'thao-dien-sky-stage', name: 'Thao Dien Sky Stage', city: 'Ho Chi Minh City', address: '25 Xuan Thuy, Thu Duc City' },
  { slug: 'west-lake-music-hall', name: 'West Lake Music Hall', city: 'Hanoi', address: '08 Dang Thai Mai, Tay Ho' },
  { slug: 'ben-thanh-live-house', name: 'Ben Thanh Live House', city: 'Ho Chi Minh City', address: '101 Le Loi, District 1' },
  { slug: 'long-bien-culture-yard', name: 'Long Bien Culture Yard', city: 'Hanoi', address: '42 Ngoc Thuy, Long Bien' },
  { slug: 'district-seven-pop-dome', name: 'District Seven Pop Dome', city: 'Ho Chi Minh City', address: '19 Nguyen Luong Bang, District 7' },
  { slug: 'truc-bach-lotus-stage', name: 'Truc Bach Lotus Stage', city: 'Hanoi', address: '12 Tran Vu, Ba Dinh' },
  { slug: 'gia-dinh-cosmic-hall', name: 'Gia Dinh Cosmic Hall', city: 'Ho Chi Minh City', address: '88 Phan Dang Luu, Binh Thanh' },
  { slug: 'ba-dinh-lantern-palace', name: 'Ba Dinh Lantern Palace', city: 'Hanoi', address: '30 Hoang Dieu, Ba Dinh' },
]

const eventSubtitles = [
  'City lights, open-air sound, and high-energy performances.',
  'A retro-futuristic night of games, synths, and live acts.',
  'Independent artists across three immersive stage concepts.',
  'A cinematic orchestral program for a quiet evening crowd.',
  'Talks, showcases, and late-night electronic sets.',
  'Warm brass, intimate vocals, and a slow-burning club room.',
  'Bright pop performances with playful digital stage design.',
  'A curated showcase of rising local performers.',
  'Strings, visuals, and cosmic soundscapes in one hall.',
  'A formal live gala with lantern-lit stage moments.',
]

const eventDescriptions = [
  'Neon Skyline Festival brings city energy into a premium seated showcase with three balanced ticket sections.',
  'Midnight Arcade Live mixes nostalgic visuals with modern live performance for a high-impact night.',
  'Saigon Indie Weekender highlights distinctive local voices across one carefully paced session.',
  'Aurora Chamber Night focuses on atmosphere, acoustics, and a refined seated concert experience.',
  'Future Beats Summit combines creator talks and live electronic showcases for a future-facing audience.',
  'Golden Hour Jazz Club creates an intimate evening around jazz standards and contemporary arrangements.',
  'Pixel Pop Carnival is a colorful live show designed around playful staging and bright pop moments.',
  'Lotus Stage Showcase presents a fresh lineup of performers in a compact seated venue format.',
  'Cosmic Strings Concert blends orchestral textures with ambient production and visual storytelling.',
  'Electric Lantern Gala offers a polished evening event with elegant stage direction and reserved seating.',
]

export async function reseedDemoEvents() {
  const db = useDB()
  await clearEventData(db)

  for (const slug of [LEGACY_DEMO_VENUE_SLUG, ...demoVenueInputs.map(venue => venue.slug)]) {
    const existingDemoVenue = await venueService.getBySlug(slug)
    if (existingDemoVenue) {
      await venueService.delete(existingDemoVenue.id)
    }
  }

  const venueDetails: VenueDetail[] = []
  for (const venueInput of demoVenueInputs) {
    const venue = await venueService.create(createDemoVenueInput(venueInput))
    const venueDetail = await venueService.getDetail(venue.id)
    if (!venueDetail) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to load demo venue layout.' })
    }

    venueDetails.push(venueDetail)
  }

  const createdEventTitles: string[] = []
  for (const [index, title] of eventTitles.entries()) {
    const venueDetail = venueDetails[index]
    if (!venueDetail) {
      throw createError({ statusCode: 500, statusMessage: 'Missing demo venue for event.' })
    }

    const createdEvent = await eventService.create(createDemoEventInput({
      index,
      title,
      venueId: venueDetail.venue.id,
      sections: venueDetail.sections,
    }))
    const publishedEvent = await eventService.publish(createdEvent.id)
    createdEventTitles.push(publishedEvent.title)
  }

  return {
    deletedEvents: true,
    venuesCreated: venueDetails.length,
    cities: Array.from(new Set(venueDetails.map(venueDetail => venueDetail.venue.city))),
    eventsCreated: createdEventTitles.length,
    seatsPerType: 20,
    eventTitles: createdEventTitles,
  }
}

async function clearEventData(db: ReturnType<typeof useDB>) {
  await db.delete(tables.seatHoldItems)
  await db.delete(tables.tickets)
  await db.delete(tables.orderItems)
  await db.delete(tables.orders)
  await db.delete(tables.queueEntries)
  await db.delete(tables.eventMetricBuckets)
  await db.delete(tables.seatHolds)
  await db.delete(tables.sessionSeatOverrides)
  await db.delete(tables.eventSeats)
  await db.delete(tables.sessionSectionPrices)
  await db.delete(tables.ticketTypeTranslations)
  await db.delete(tables.ticketTypes)
  await db.delete(tables.eventTranslations)
  await db.update(tables.events).set({ primarySessionId: null })
  await db.delete(tables.eventSessions)
  await db.delete(tables.events)
  await db.delete(tables.eventDraftAutosaves)
}

function createDemoVenueInput(input: DemoVenueInput): CreateVenueInput {
  return {
    slug: input.slug,
    name: input.name,
    description: `A seeded ${input.city} venue with balanced ticket sections for demo events.`,
    city: input.city,
    country: 'Vietnam',
    address: input.address,
    coverImage: '',
    sections: [
      createSection({ code: 'STD', name: 'Standard', color: '#34D399', sortOrder: 0 }),
      createSection({ code: 'VIP', name: 'VIP', color: '#8B5CF6', sortOrder: 1 }),
      createSection({ code: 'PRM', name: 'Premium', color: '#F59E0B', sortOrder: 2 }),
    ],
  }
}

function createSection(input: { code: string, name: string, color: string, sortOrder: number }) {
  return {
    code: input.code,
    name: input.name,
    color: input.color,
    sortOrder: input.sortOrder,
    rows: [
      {
        label: 'A',
        sortOrder: 0,
        seats: Array.from({ length: 20 }, (_, index) => ({
          label: `${input.code}-${index + 1}`,
          seatNumber: index + 1,
          x: 64 + index * 28,
          y: 80 + input.sortOrder * 72,
          sortOrder: index,
          accessibilityLabel: '',
          isAccessible: false,
        })),
      },
    ],
  }
}

function createDemoEventInput(input: { index: number, title: string, venueId: number, sections: Array<{ id: number, sortOrder: number }> }): CreateEventInput {
  const startsAt = addDays(new Date(), input.index + 7)
  startsAt.setHours(19 + (input.index % 3), input.index % 2 === 0 ? 0 : 30, 0, 0)

  const endsAt = new Date(startsAt)
  endsAt.setHours(startsAt.getHours() + 3)

  const salesStartAt = addDays(new Date(), -1)
  salesStartAt.setHours(9, 0, 0, 0)

  const salesEndAt = new Date(startsAt)
  salesEndAt.setHours(startsAt.getHours() - 2)

  return {
    slug: slugify(input.title),
    title: input.title,
    subtitle: eventSubtitles[input.index] ?? 'A TicketRush live event experience.',
    description: eventDescriptions[input.index] ?? 'A fresh event seeded for browsing, ticket selection, and checkout demos.',
    venueId: input.venueId,
    coverImage: '',
    sessions: [
      {
        label: `${input.title} Session`,
        venueId: input.venueId,
        pricingMode: PricingMode.Section,
        currency: 'VND',
        startsAt,
        endsAt,
        salesStartAt,
        salesEndAt,
        queueEnabled: false,
        sectionPrices: input.sections.map(section => ({
          venueSectionId: section.id,
          priceCents: getSectionPrice(section.sortOrder),
          currency: 'VND',
          sortOrder: section.sortOrder,
        })),
        seatOverrides: [],
      },
    ],
  }
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getSectionPrice(sortOrder: number) {
  if (sortOrder === 0) return 45000000
  if (sortOrder === 1) return 90000000
  return 135000000
}
