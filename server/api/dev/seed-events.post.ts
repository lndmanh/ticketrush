import { eq, inArray } from 'drizzle-orm'
import { success } from '~~/server/utils/apiResponse'
import { createPublicEventId, createPublicEventSessionId, createPublicVenueId } from '~~/server/utils/ticketing/ids'

type SampleEventSeed = {
  slug: string
  title: string
  subtitle: string
  description: string
  coverImage: string
  startsAtOffsetDays: number
  durationHours: number
  sessionLabel: string
}

const venueSlug = 'saigon-river-stage'

const sampleEvents: SampleEventSeed[] = [
  {
    slug: 'sunset-beats-saigon-2026',
    title: 'Sunset Beats Saigon 2026',
    subtitle: 'Open-air electronic night by the river',
    description: 'An electronic showcase featuring regional DJs, immersive visuals, and sunset city views.',
    coverImage: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
    startsAtOffsetDays: 5,
    durationHours: 5,
    sessionLabel: 'Opening Night',
  },
  {
    slug: 'indie-lights-festival-ho-chi-minh',
    title: 'Indie Lights Festival',
    subtitle: 'Two-stage lineup with local breakout artists',
    description: 'A curated indie festival with genre-blending performances and interactive food-lane experiences.',
    coverImage: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
    startsAtOffsetDays: 12,
    durationHours: 6,
    sessionLabel: 'Main Festival Day',
  },
  {
    slug: 'city-jazz-under-stars',
    title: 'City Jazz Under Stars',
    subtitle: 'Contemporary jazz night with skyline backdrop',
    description: 'A premium seated jazz experience with curated acts, themed cocktails, and ambient lighting.',
    coverImage: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=1200&q=80',
    startsAtOffsetDays: 18,
    durationHours: 4,
    sessionLabel: 'Evening Session',
  },
]

function createDateRange(offsetDays: number, durationHours: number) {
  const startsAt = new Date()
  startsAt.setDate(startsAt.getDate() + offsetDays)
  startsAt.setHours(19, 30, 0, 0)

  const endsAt = new Date(startsAt)
  endsAt.setHours(endsAt.getHours() + durationHours)

  const salesStartAt = new Date()
  salesStartAt.setDate(salesStartAt.getDate() - 1)

  const salesEndAt = new Date(startsAt)
  salesEndAt.setHours(salesEndAt.getHours() - 1)

  return {
    startsAt,
    endsAt,
    salesStartAt,
    salesEndAt,
  }
}

export default defineEventHandler(async () => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const db = useDB()
  const now = new Date()

  let venue = await db
    .select()
    .from(tables.venues)
    .where(eq(tables.venues.slug, venueSlug))
    .get()

  if (!venue) {
    venue = await db
      .insert(tables.venues)
      .values({
        publicId: createPublicVenueId(),
        slug: venueSlug,
        name: 'Saigon River Stage',
        description: 'Outdoor multi-format venue for concerts and festivals.',
        city: 'Ho Chi Minh City',
        country: 'Vietnam',
        address: '2 Ton Duc Thang, District 1, Ho Chi Minh City, Vietnam',
        capacity: 4500,
        coverImage: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1200&q=80',
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get()
  }

  if (!venue) {
    throw createError({ statusCode: 500, statusMessage: 'Unable to seed sample venue' })
  }

  const slugs = sampleEvents.map(event => event.slug)
  const existingEvents = await db
    .select({ id: tables.events.id, slug: tables.events.slug })
    .from(tables.events)
    .where(inArray(tables.events.slug, slugs))
    .all()

  const existingSlugSet = new Set(existingEvents.map(event => event.slug))

  let createdEvents = 0

  for (const seed of sampleEvents) {
    if (existingSlugSet.has(seed.slug)) {
      continue
    }

    const { startsAt, endsAt, salesStartAt, salesEndAt } = createDateRange(seed.startsAtOffsetDays, seed.durationHours)

    const createdEvent = await db
      .insert(tables.events)
      .values({
        publicId: createPublicEventId(),
        slug: seed.slug,
        title: seed.title,
        subtitle: seed.subtitle,
        description: seed.description,
        status: 'on_sale',
        venueId: venue.id,
        coverImage: seed.coverImage,
        startsAt,
        endsAt,
        salesStartAt,
        salesEndAt,
        publishedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get()

    if (!createdEvent) {
      continue
    }

    await db
      .insert(tables.eventSessions)
      .values({
        publicId: createPublicEventSessionId(),
        eventId: createdEvent.id,
        venueId: venue.id,
        label: seed.sessionLabel,
        status: 'on_sale',
        startsAt,
        endsAt,
        salesStartAt,
        salesEndAt,
        queueEnabled: false,
        publishedAt: now,
        createdAt: now,
        updatedAt: now,
      })

    createdEvents += 1
  }

  return success({
    result: 'Sample events seeding completed',
    venue: venue.name,
    createdEvents,
    totalRequested: sampleEvents.length,
  })
})
