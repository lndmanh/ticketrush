import { and, asc, eq, inArray, like, or } from 'drizzle-orm'
import type { Event, EventSession, Venue } from '#shared/db'
import type { CreateEventInput, EventSessionDraftInput, UpdateEventInput } from '#shared/schemas/ticketingSchema'
import { IDatabaseService } from '~~/types/db/database-service'
import { createPublicEventId } from '~~/server/utils/ticketing/ids'
import eventSessionService from '~~/server/utils/database/event-session'
import type {
  EventCatalogDateFilter,
  EventCatalogItem,
  EventCatalogLocationOptions,
  EventCatalogPublicStatus,
  EventCatalogQueryOptions,
  EventCatalogResult,
  EventCatalogSort,
} from '~~/types/events'

type EventDetail = {
  event: Event
  sessions: Array<EventSession & {
    ticketTypes: typeof tables.ticketTypes.$inferSelect[]
    seats: typeof tables.eventSeats.$inferSelect[]
  }>
}

type Transaction = ReturnType<typeof useDB>

const publicEventStatuses: EventCatalogPublicStatus[] = ['published', 'on_sale', 'sold_out', 'ended']

function getSearchTokens(value: string) {
  return value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(token => token.length > 0)
}

function valuesContainEveryToken(values: string[], tokens: string[]) {
  if (tokens.length === 0) {
    return true
  }

  return tokens.every(token => values.some(value => value.toLowerCase().includes(token)))
}

function getDateWindowBounds(dateFilter: EventCatalogDateFilter | string) {
  const now = new Date()
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateFilter)) {
    const [year, month, day] = dateFilter.split('-').map(Number)
    const start = new Date(year, month - 1, day)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)

    return {
      start: start.getTime(),
      end: end.getTime(),
    }
  }

  if (dateFilter === 'today') {
    const endOfToday = new Date(startOfToday)
    endOfToday.setDate(endOfToday.getDate() + 1)

    return {
      start: startOfToday.getTime(),
      end: endOfToday.getTime(),
    }
  }

  if (dateFilter === 'week') {
    const endOfWeek = new Date(now)
    endOfWeek.setDate(endOfWeek.getDate() + 7)

    return {
      start: startOfToday.getTime(),
      end: endOfWeek.getTime(),
    }
  }

  if (dateFilter === 'month') {
    const endOfMonth = new Date(now)
    endOfMonth.setMonth(endOfMonth.getMonth() + 1)

    return {
      start: startOfToday.getTime(),
      end: endOfMonth.getTime(),
    }
  }

  return null
}

class EventService extends IDatabaseService<Event> {
  private static instance: EventService

  private get db() {
    return useDB()
  }

  public static getInstance(): EventService {
    if (!EventService.instance) {
      EventService.instance = new EventService()
    }

    return EventService.instance
  }

  async getById(id: number) {
    return this.db
      .select()
      .from(tables.events)
      .where(eq(tables.events.id, id))
      .get()
  }

  async getBySlug(slug: string) {
    return this.db
      .select()
      .from(tables.events)
      .where(eq(tables.events.slug, slug))
      .get()
  }

  async getList() {
    return this.db
      .select()
      .from(tables.events)
      .all()
  }

  async getPublishedList() {
    return this.db
      .select()
      .from(tables.events)
      .where(inArray(tables.events.status, ['published', 'on_sale', 'sold_out', 'ended']))
      .all()
  }

  async getDetailBySlug(slug: string): Promise<EventDetail | undefined> {
    const event = await this.getBySlug(slug)
    if (!event) {
      return undefined
    }

    const sessions = await eventSessionService.listByEventId(event.id)
    const sessionsWithDetails = await Promise.all(sessions.map(async session => ({
      ...session,
      ...(await eventSessionService.getSeatMap(session.id)),
    })))

    return {
      event,
      sessions: sessionsWithDetails,
    }
  }

  async create(data: CreateEventInput) {
    const now = new Date()
    const primarySession = data.sessions[0]
    if (!primarySession) {
      throw new Error('At least one event session is required.')
    }

    const db = this.db
    const createdEvent = await db
      .insert(tables.events)
      .values({
        publicId: createPublicEventId(),
        slug: data.slug,
        title: data.title,
        subtitle: data.subtitle ?? null,
        description: data.description,
        status: 'draft',
        venueId: data.venueId,
        coverImage: data.coverImage || null,
        startsAt: primarySession.startsAt,
        endsAt: primarySession.endsAt ?? null,
        salesStartAt: primarySession.salesStartAt,
        salesEndAt: primarySession.salesEndAt,
        publishedAt: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get()

    if (!createdEvent) {
      throw new Error('Failed to create event')
    }

    for (const session of data.sessions) {
      await eventSessionService.createForEventInTransaction(db, createdEvent.id, data.venueId, session, now)
    }

    return createdEvent
  }

  async update(data: UpdateEventInput) {
    const now = new Date()
    const primarySession = data.sessions[0]
    if (!primarySession) {
      throw new Error('At least one event session is required.')
    }

    const db = this.db
    const existingEvent = await db.select().from(tables.events).where(eq(tables.events.id, data.id)).get()
    if (!existingEvent) {
      throw new Error('Event not found')
    }

    const updatedEvent = await db
      .update(tables.events)
      .set({
        slug: data.slug,
        title: data.title,
        subtitle: data.subtitle ?? null,
        description: data.description,
        venueId: data.venueId,
        coverImage: data.coverImage || null,
        startsAt: primarySession.startsAt,
        endsAt: primarySession.endsAt ?? null,
        salesStartAt: primarySession.salesStartAt,
        salesEndAt: primarySession.salesEndAt,
        updatedAt: now,
      })
      .where(eq(tables.events.id, data.id))
      .returning()
      .get()

    if (!updatedEvent) {
      throw new Error('Event not found')
    }

    for (const session of data.sessions) {
      await eventSessionService.updateForEventInTransaction(db, data.id, data.venueId, session, now)
    }

    return updatedEvent
  }

  private toEventCatalogItem(event: Event, venue: Venue | null, sessions: EventSession[]): EventCatalogItem {
    return {
      id: event.id,
      publicId: event.publicId,
      slug: event.slug,
      title: event.title,
      subtitle: event.subtitle,
      description: event.description,
      status: event.status,
      venueId: event.venueId,
      coverImage: event.coverImage,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      salesStartAt: event.salesStartAt,
      salesEndAt: event.salesEndAt,
      publishedAt: event.publishedAt,
      createdAt: event.createdAt,
      venue: venue
        ? {
            id: venue.id,
            publicId: venue.publicId,
            slug: venue.slug,
            name: venue.name,
            description: venue.description,
            city: venue.city,
            country: venue.country,
            address: venue.address,
            capacity: venue.capacity,
            coverImage: venue.coverImage,
          }
        : null,
      sessions: sessions
        .map(session => ({
          publicId: session.publicId,
          label: session.label,
          status: session.status,
          startsAt: session.startsAt,
          endsAt: session.endsAt,
          salesStartAt: session.salesStartAt,
          salesEndAt: session.salesEndAt,
        }))
        .sort((first, second) => new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime()),
    }
  }

  private matchesCatalogSearch(item: EventCatalogItem, searchTokens: string[]) {
    if (searchTokens.length === 0) {
      return true
    }

    const values = [
      item.title,
      item.subtitle,
      item.description,
      item.slug,
      item.venue?.name,
      item.venue?.city,
      item.venue?.country,
      item.venue?.address,
    ].filter((value): value is string => typeof value === 'string' && value.length > 0)

    return valuesContainEveryToken(values, searchTokens)
  }

  private matchesCatalogLocation(item: EventCatalogItem, locationTokens: string[]) {
    if (locationTokens.length === 0) {
      return true
    }

    const values = [
      item.venue?.name,
      item.venue?.address,
      item.venue?.city,
      item.venue?.country,
    ].filter((value): value is string => typeof value === 'string' && value.length > 0)

    return valuesContainEveryToken(values, locationTokens)
  }

  private getAddressAreas(address: string, city: string, country: string) {
    return address
      .split(',')
      .map(part => part.trim())
      .filter((part) => {
        if (!part) return false
        const normalizedPart = part.toLowerCase()
        return normalizedPart !== city.toLowerCase()
          && normalizedPart !== country.toLowerCase()
      })
  }

  private matchesCatalogDate(item: EventCatalogItem, dateFilter: EventCatalogDateFilter | string) {
    const bounds = getDateWindowBounds(dateFilter)
    if (!bounds) {
      return true
    }

    const eventStartsAt = new Date(item.startsAt).getTime()
    if (eventStartsAt >= bounds.start && eventStartsAt < bounds.end) {
      return true
    }

    return item.sessions.some(session => {
      const sessionStartsAt = new Date(session.startsAt).getTime()
      return sessionStartsAt >= bounds.start && sessionStartsAt < bounds.end
    })
  }

  private sortCatalogItems(items: EventCatalogItem[], sort: EventCatalogSort) {
    return items.slice().sort((first, second) => {
      if (sort === 'newest') {
        const firstTime = new Date(first.publishedAt ?? first.createdAt ?? first.startsAt).getTime()
        const secondTime = new Date(second.publishedAt ?? second.createdAt ?? second.startsAt).getTime()

        return secondTime - firstTime
      }

      if (sort === 'ending_soon') {
        return new Date(first.salesEndAt).getTime() - new Date(second.salesEndAt).getTime()
      }

      return new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime()
    })
  }

  private async getPublicEventCatalogItems() {
    const events = await this.db
      .select()
      .from(tables.events)
      .where(inArray(tables.events.status, publicEventStatuses))
      .all()

    const venueIds = Array.from(new Set(events.map(event => event.venueId)))
    const venues = venueIds.length > 0
      ? await this.db
          .select()
          .from(tables.venues)
          .where(inArray(tables.venues.id, venueIds))
          .all()
      : []

    const venueById = new Map(venues.map(venue => [venue.id, venue]))
    const eventIds = events.map(event => event.id)
    const sessions = eventIds.length > 0
      ? await this.db
          .select()
          .from(tables.eventSessions)
          .where(inArray(tables.eventSessions.eventId, eventIds))
          .all()
      : []
    const sessionsByEventId = new Map<number, EventSession[]>()

    for (const session of sessions) {
      const currentSessions = sessionsByEventId.get(session.eventId) ?? []
      currentSessions.push(session)
      sessionsByEventId.set(session.eventId, currentSessions)
    }

    return events.map(event => this.toEventCatalogItem(
      event,
      venueById.get(event.venueId) ?? null,
      sessionsByEventId.get(event.id) ?? [],
    ))
  }

  async getEventCatalog(options: EventCatalogQueryOptions): Promise<EventCatalogResult> {
    const normalizedCountry = options.country.trim().toLowerCase()
    const normalizedCity = options.city.trim().toLowerCase()
    const normalizedVenue = options.venue.trim().toLowerCase()
    const searchTokens = getSearchTokens(options.q)
    const locationTokens = getSearchTokens(options.location || options.area)
    const items = await this.getPublicEventCatalogItems()

    const filteredItems = items.filter((item) => {
      const statusMatches = options.status === 'all' || item.status === options.status
      const countryMatches = normalizedCountry === 'all' || item.venue?.country.toLowerCase() === normalizedCountry
      const cityMatches = normalizedCity === 'all' || item.venue?.city.toLowerCase() === normalizedCity
      const venueMatches = normalizedVenue === 'all' || item.venue?.slug.toLowerCase() === normalizedVenue

      return statusMatches
        && countryMatches
        && cityMatches
        && venueMatches
        && this.matchesCatalogLocation(item, locationTokens)
        && this.matchesCatalogDate(item, options.date)
        && this.matchesCatalogSearch(item, searchTokens)
    })

    const sortedItems = this.sortCatalogItems(filteredItems, options.sort)
    const start = (options.page - 1) * options.pageSize
    const end = start + options.pageSize

    return {
      items: sortedItems.slice(start, end),
      totalItems: filteredItems.length,
    }
  }

  async getEventCatalogLocationOptions(): Promise<EventCatalogLocationOptions> {
    const items = await this.getPublicEventCatalogItems()
    const countries = new Set<string>()
    const cities = new Set<string>()
    const areas = new Set<string>()
    const venueBySlug = new Map<string, EventCatalogLocationOptions['venues'][number]>()

    for (const item of items) {
      const venue = item.venue
      if (!venue) {
        continue
      }

      countries.add(venue.country)
      cities.add(venue.city)
      for (const area of this.getAddressAreas(venue.address, venue.city, venue.country)) {
        areas.add(area)
      }
      venueBySlug.set(venue.slug, {
        slug: venue.slug,
        name: venue.name,
        city: venue.city,
        country: venue.country,
        address: venue.address,
      })
    }

    return {
      countries: Array.from(countries).sort((left, right) => left.localeCompare(right)),
      cities: Array.from(cities).sort((left, right) => left.localeCompare(right)),
      areas: Array.from(areas).sort((left, right) => left.localeCompare(right)),
      venues: Array.from(venueBySlug.values()).sort((left, right) => left.name.localeCompare(right.name)),
    }
  }

  async getEventCatalogCities() {
    const items = await this.getPublicEventCatalogItems()
    const cities = new Set<string>()

    for (const item of items) {
      if (item.venue?.city) {
        cities.add(item.venue.city)
      }
    }

    return Array.from(cities).sort((left, right) => left.localeCompare(right))
  }

  private async updateParentSummaryFieldsInTransaction(tx: Transaction, eventId: number, now: Date) {
    const sessions = await tx
      .select()
      .from(tables.eventSessions)
      .where(eq(tables.eventSessions.eventId, eventId))
      .orderBy(asc(tables.eventSessions.startsAt))
      .all()

    const primarySession = sessions[0]
    if (!primarySession) {
      throw new Error('At least one event session is required.')
    }

    const updatedEvent = await tx
      .update(tables.events)
      .set({
        startsAt: primarySession.startsAt,
        endsAt: primarySession.endsAt ?? null,
        salesStartAt: primarySession.salesStartAt,
        salesEndAt: primarySession.salesEndAt,
        updatedAt: now,
      })
      .where(eq(tables.events.id, eventId))
      .returning()
      .get()

    if (!updatedEvent) {
      throw new Error('Event not found')
    }

    return updatedEvent
  }

  async createSession(eventId: number, input: EventSessionDraftInput) {
    const now = new Date()
    const db = this.db
    const parent = await db.select().from(tables.events).where(eq(tables.events.id, eventId)).get()
    if (!parent) {
      throw new Error('Event not found')
    }

    const created = await eventSessionService.createForEventInTransaction(db, eventId, parent.venueId, input, now)
    await this.updateParentSummaryFieldsInTransaction(db, eventId, now)
    return created
  }

  async updateSession(eventId: number, sessionId: number, input: EventSessionDraftInput) {
    const now = new Date()
    const db = this.db
    const parent = await db.select().from(tables.events).where(eq(tables.events.id, eventId)).get()
    if (!parent) {
      throw new Error('Event not found')
    }

    const updated = await eventSessionService.updateForEventInTransaction(db, eventId, parent.venueId, { ...input, id: sessionId }, now)
    await this.updateParentSummaryFieldsInTransaction(db, eventId, now)
    return updated
  }

  async publish(eventId: number) {
    const now = new Date()

    const db = this.db
    const event = await db.select().from(tables.events).where(eq(tables.events.id, eventId)).get()
    if (!event) {
      throw new Error('Event not found')
    }

    const sessions = await db
      .select()
      .from(tables.eventSessions)
      .where(eq(tables.eventSessions.eventId, eventId))
      .orderBy(asc(tables.eventSessions.startsAt))
      .all()
    if (sessions.length === 0) {
      throw new Error('At least one event session is required before publishing.')
    }

    for (const session of sessions) {
      await eventSessionService.assertCanPublishSessionInTransaction(db, session.id)
    }

    for (const session of sessions) {
      await eventSessionService.publishSessionInTransaction(db, session.id, now)
    }

    const publishedEvent = await db
      .update(tables.events)
      .set({
        status: 'published',
        publishedAt: event.publishedAt ?? now,
        updatedAt: now,
      })
      .where(eq(tables.events.id, eventId))
      .returning()
      .get()

    if (!publishedEvent) {
      throw new Error('Failed to publish event')
    }

    return publishedEvent
  }

  async delete(id: number) {
    await this.db
      .delete(tables.events)
      .where(eq(tables.events.id, id))
  }

  async bulkDelete(ids: number[]) {
    if (ids.length === 0) {
      return
    }

    await this.db
      .delete(tables.events)
      .where(inArray(tables.events.id, ids))
  }

  async setStatus(eventId: number, status: typeof tables.events.$inferSelect['status']) {
    return this.db
      .update(tables.events)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(tables.events.id, eventId))
      .returning()
      .get()
  }

  async unpublish(eventId: number) {
    return this.db
      .update(tables.events)
      .set({
        status: 'draft',
        publishedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(tables.events.id, eventId))
      .returning()
      .get()
  }

  async getEventCardList() {
    const events = await this.db
      .select()
      .from(tables.events)
      .where(inArray(tables.events.status, ['published', 'on_sale', 'sold_out', 'ended']))
      .all()

    const venueIds = events.map(event => event.venueId)
    const venues = venueIds.length > 0
      ? await this.db
          .select()
          .from(tables.venues)
          .where(inArray(tables.venues.id, venueIds))
          .all()
      : []

    const venueById = new Map(venues.map(venue => [venue.id, venue]))
    const eventIds = events.map(event => event.id)
    const sessions = eventIds.length > 0
      ? await this.db
          .select()
          .from(tables.eventSessions)
          .where(inArray(tables.eventSessions.eventId, eventIds))
          .all()
      : []
    const sessionsByEventId = new Map<number, typeof sessions>()

    for (const session of sessions) {
      const currentSessions = sessionsByEventId.get(session.eventId) ?? []
      currentSessions.push(session)
      sessionsByEventId.set(session.eventId, currentSessions)
    }

    return events.map(event => ({
      ...event,
      venue: venueById.get(event.venueId) ?? null,
      sessions: (sessionsByEventId.get(event.id) ?? []).sort((first, second) => {
        return new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime()
      }),
    }))
  }

  async searchEventCardList(searchTerm: string, limit: number) {
    const normalizedSearchTerm = searchTerm.trim()
    if (!normalizedSearchTerm) {
      return []
    }

    const searchPattern = `%${normalizedSearchTerm}%`
    const publishedStatuses: Event['status'][] = ['published', 'on_sale', 'sold_out', 'ended']

    const events = await this.db
      .select()
      .from(tables.events)
      .where(and(
        inArray(tables.events.status, publishedStatuses),
        or(
          like(tables.events.title, searchPattern),
          like(tables.events.subtitle, searchPattern),
          like(tables.events.description, searchPattern),
          like(tables.events.slug, searchPattern),
        ),
      ))
      .limit(Math.max(limit, 1))
      .all()

    const venueIds = events.map(event => event.venueId)
    const venues = venueIds.length > 0
      ? await this.db
          .select()
          .from(tables.venues)
          .where(inArray(tables.venues.id, venueIds))
          .all()
      : []

    const venueById = new Map(venues.map(venue => [venue.id, venue]))
    const eventIds = events.map(event => event.id)
    const sessions = eventIds.length > 0
      ? await this.db
          .select()
          .from(tables.eventSessions)
          .where(inArray(tables.eventSessions.eventId, eventIds))
          .all()
      : []
    const sessionsByEventId = new Map<number, typeof sessions>()

    for (const session of sessions) {
      const currentSessions = sessionsByEventId.get(session.eventId) ?? []
      currentSessions.push(session)
      sessionsByEventId.set(session.eventId, currentSessions)
    }

    return events.map(event => ({
      ...event,
      venue: venueById.get(event.venueId) ?? null,
      sessions: (sessionsByEventId.get(event.id) ?? []).sort((first, second) => {
        return new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime()
      }),
    }))
  }
}

export default EventService.getInstance()
