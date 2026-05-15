import { and, asc, eq, inArray } from 'drizzle-orm'
import type { Event, EventSession, OrderItem, TicketTypeTranslation, Venue } from '#shared/db'
import type { CreateEventInput, EventSessionDraftInput, EventTranslationInput, UpdateEventInput } from '#shared/schemas/ticketingSchema'
import { IDatabaseService } from '~~/types/db/database-service'
import { createPublicEventId } from '~~/server/utils/ticketing/ids'
import eventSessionService from '~~/server/utils/database/event-session'
import { sourceLocale } from '~~/i18n-constants'
import {
  EventCatalogDateFilter as EventCatalogDateFilterValue,
  EventCatalogSort as EventCatalogSortValue,
  EventCatalogStatusFilter,
  EventStatus,
} from '#shared/commonEnums'
import {
  localizeEvent,
  localizeTicketType,
  localizeVenue,
  mapEventTranslationsByEventId,
  mapTicketTypeTranslationsByTicketTypeId,
  mapVenueTranslationsByVenueId,
  normalizeTranslationText,
  resolveContentLocale,
} from '~~/server/utils/i18n/content-localization'
import type { SeatmapRealtimeNamespace } from '~~/server/utils/ticketing/seatmap-realtime'
import { broadcastSeatmapResyncRequiredWithKnownVersion } from '~~/server/utils/ticketing/seatmap-realtime'
import type {
  EventCatalogItem,
  EventCatalogDateFilter,
  EventCatalogLocationOptions,
  EventCatalogQueryOptions,
  EventCatalogResult,
  EventCatalogSort,
} from '~~/types/events'

type EventDetail = {
  event: Event
  sessions: Array<EventSession & {
    sectionPrices: typeof tables.sessionSectionPrices.$inferSelect[]
    seatOverrides: typeof tables.sessionSeatOverrides.$inferSelect[]
    seats: typeof tables.eventSeats.$inferSelect[]
    sections: typeof tables.venueSections.$inferSelect[]
  }>
}

type Transaction = ReturnType<typeof useDB>

const publicEventStatuses: EventStatus[] = [EventStatus.Published, EventStatus.OnSale, EventStatus.SoldOut, EventStatus.Ended]

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

  if (dateFilter === EventCatalogDateFilterValue.Today) {
    const endOfToday = new Date(startOfToday)
    endOfToday.setDate(endOfToday.getDate() + 1)

    return {
      start: startOfToday.getTime(),
      end: endOfToday.getTime(),
    }
  }

  if (dateFilter === EventCatalogDateFilterValue.Week) {
    const endOfWeek = new Date(now)
    endOfWeek.setDate(endOfWeek.getDate() + 7)

    return {
      start: startOfToday.getTime(),
      end: endOfWeek.getTime(),
    }
  }

  if (dateFilter === EventCatalogDateFilterValue.Month) {
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

  async getLocalizedById(id: number, locale: string) {
    const event = await this.getById(id)
    if (!event) {
      return undefined
    }

    const contentLocale = resolveContentLocale(locale)
    if (contentLocale === sourceLocale) {
      return event
    }

    const translation = await this.db
      .select()
      .from(tables.eventTranslations)
      .where(and(
        eq(tables.eventTranslations.eventId, id),
        eq(tables.eventTranslations.locale, contentLocale),
      ))
      .get()

    return localizeEvent(event, translation)
  }

  async localizeTicketTypesForLocale<TicketTypeRow extends typeof tables.ticketTypes.$inferSelect>(ticketTypes: TicketTypeRow[], locale: string) {
    const translations = await this.listTicketTypeTranslationsByIds(
      ticketTypes.map(ticketType => ticketType.id),
      locale,
    )
    const translationByTicketTypeId = mapTicketTypeTranslationsByTicketTypeId(translations)

    return ticketTypes.map(ticketType => localizeTicketType(
      ticketType,
      translationByTicketTypeId.get(ticketType.id),
    ))
  }

  async localizeOrderItemsForLocale<OrderItemRow extends OrderItem>(orderItems: OrderItemRow[], locale: string) {
    const ticketTypeIds = [...new Set(orderItems.flatMap((orderItem) => {
      return typeof orderItem.ticketTypeId === 'number' ? [orderItem.ticketTypeId] : []
    }))]

    if (ticketTypeIds.length === 0) {
      return orderItems
    }

    const ticketTypes = await this.db
      .select()
      .from(tables.ticketTypes)
      .where(inArray(tables.ticketTypes.id, ticketTypeIds))
      .all()
    const localizedTicketTypes = await this.localizeTicketTypesForLocale(ticketTypes, locale)
    const ticketTypeById = new Map(localizedTicketTypes.map(ticketType => [ticketType.id, ticketType]))

    return orderItems.map((orderItem) => {
      if (typeof orderItem.ticketTypeId !== 'number') {
        return orderItem
      }

      const ticketType = ticketTypeById.get(orderItem.ticketTypeId)
      if (!ticketType) {
        return orderItem
      }

      return {
        ...orderItem,
        ticketLabel: ticketType.name,
      }
    })
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
      .where(inArray(tables.events.status, publicEventStatuses))
      .all()
  }

  async getDetailBySlug(slug: string, locale: string = sourceLocale): Promise<EventDetail | undefined> {
    const event = await this.getBySlug(slug)
    if (!event) {
      return undefined
    }

    const contentLocale = resolveContentLocale(locale)
    const eventTranslation = contentLocale === sourceLocale
      ? undefined
      : await this.db
          .select()
          .from(tables.eventTranslations)
          .where(and(
            eq(tables.eventTranslations.eventId, event.id),
            eq(tables.eventTranslations.locale, contentLocale),
          ))
          .get()

    const sessions = await eventSessionService.listByEventId(event.id)
    const sessionsWithDetails = await Promise.all(sessions.map(async (session) => {
      const seatMap = await eventSessionService.getSeatMap(session.id)
      return {
        ...session,
        ...seatMap,
      }
    }))

    return {
      event: localizeEvent(event, eventTranslation),
      sessions: sessionsWithDetails.map(session => ({
        ...session,
        sectionPrices: session.sectionPrices,
        seatOverrides: session.seatOverrides,
      })),
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
        status: EventStatus.Draft,
        venueId: data.venueId,
        primarySessionId: null,
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

    let primarySessionId: number | null = null
    let primaryPricing: Pick<EventSessionDraftInput, 'pricingMode' | 'currency' | 'sectionPrices' | 'seatOverrides'> | null = null

    for (const [index, session] of data.sessions.entries()) {
      const input = index === 0 && primaryPricing === null
        ? session
        : {
            ...session,
            sectionPrices: session.sectionPrices.length > 0 || primaryPricing === null ? session.sectionPrices : primaryPricing.sectionPrices,
            seatOverrides: session.seatOverrides.length > 0 || primaryPricing === null ? session.seatOverrides : primaryPricing.seatOverrides,
          }

      const createdSession = await eventSessionService.createForEventInTransaction(db, createdEvent.id, data.venueId, input, now)
      if (index === 0) {
        primarySessionId = createdSession.id
        primaryPricing = {
          pricingMode: session.pricingMode,
          currency: session.currency,
          sectionPrices: session.sectionPrices,
          seatOverrides: session.seatOverrides,
        }
      }
    }

    if (primarySessionId) {
      const refreshedEvent = await db
        .update(tables.events)
        .set({ primarySessionId, updatedAt: now })
        .where(eq(tables.events.id, createdEvent.id))
        .returning()
        .get()

      if (!refreshedEvent) {
        throw new Error('Failed to update event primary session')
      }

      return refreshedEvent
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
        primarySessionId: existingEvent.primarySessionId ?? primarySession.id ?? null,
        updatedAt: now,
      })
      .where(eq(tables.events.id, data.id))
      .returning()
      .get()

    if (!updatedEvent) {
      throw new Error('Event not found')
    }

    const sessions = data.sessions.map(session => ({
      ...session,
      status: existingEvent.status === EventStatus.Draft ? EventStatus.Draft : session.status,
    }))

    const primaryPricing = sessions[0]
      ? {
          pricingMode: sessions[0].pricingMode,
          currency: sessions[0].currency,
          sectionPrices: sessions[0].sectionPrices,
          seatOverrides: sessions[0].seatOverrides,
        }
      : null

    if (existingEvent.status === EventStatus.Draft) {
      const sessionIds = sessions
        .map(session => session.id)
        .filter((sessionId): sessionId is number => typeof sessionId === 'number')

      await this.resetEventSessionsByIdToDraftInTransaction(db, data.id, sessionIds, now)
    }

    for (const session of sessions) {
      const input = session.id === primarySession.id || primaryPricing === null
        ? session
        : {
            ...session,
            sectionPrices: session.sectionPrices.length > 0 ? session.sectionPrices : primaryPricing.sectionPrices,
            seatOverrides: session.seatOverrides.length > 0 ? session.seatOverrides : primaryPricing.seatOverrides,
          }

      await eventSessionService.updateForEventInTransaction(db, data.id, data.venueId, input, now)
    }

    return updatedEvent
  }

  private async listEventTranslationsByIds(eventIds: number[], locale: string) {
    const contentLocale = resolveContentLocale(locale)
    if (contentLocale === sourceLocale || eventIds.length === 0) {
      return []
    }

    return this.db
      .select()
      .from(tables.eventTranslations)
      .where(and(
        inArray(tables.eventTranslations.eventId, eventIds),
        eq(tables.eventTranslations.locale, contentLocale),
      ))
      .all()
  }

  private async listVenueTranslationsByIds(venueIds: number[], locale: string) {
    const contentLocale = resolveContentLocale(locale)
    if (contentLocale === sourceLocale || venueIds.length === 0) {
      return []
    }

    return this.db
      .select()
      .from(tables.venueTranslations)
      .where(and(
        inArray(tables.venueTranslations.venueId, venueIds),
        eq(tables.venueTranslations.locale, contentLocale),
      ))
      .all()
  }

  private async listTicketTypeTranslationsByIds(ticketTypeIds: number[], locale: string): Promise<TicketTypeTranslation[]> {
    const contentLocale = resolveContentLocale(locale)
    if (contentLocale === sourceLocale || ticketTypeIds.length === 0) {
      return []
    }

    return this.db
      .select()
      .from(tables.ticketTypeTranslations)
      .where(and(
        inArray(tables.ticketTypeTranslations.ticketTypeId, ticketTypeIds),
        eq(tables.ticketTypeTranslations.locale, contentLocale),
      ))
      .all()
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

    return item.sessions.some((session) => {
      const sessionStartsAt = new Date(session.startsAt).getTime()
      return sessionStartsAt >= bounds.start && sessionStartsAt < bounds.end
    })
  }

  private sortCatalogItems(items: EventCatalogItem[], sort: EventCatalogSort) {
    return items.slice().sort((first, second) => {
      if (sort === EventCatalogSortValue.Newest) {
        const firstTime = new Date(first.publishedAt ?? first.createdAt ?? first.startsAt).getTime()
        const secondTime = new Date(second.publishedAt ?? second.createdAt ?? second.startsAt).getTime()

        return secondTime - firstTime
      }

      if (sort === EventCatalogSortValue.EndingSoon) {
        return new Date(first.salesEndAt).getTime() - new Date(second.salesEndAt).getTime()
      }

      return new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime()
    })
  }

  private async getPublicEventCatalogItems(locale: string = sourceLocale) {
    const contentLocale = resolveContentLocale(locale)
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

    const eventTranslations = await this.listEventTranslationsByIds(events.map(event => event.id), contentLocale)
    const venueTranslations = await this.listVenueTranslationsByIds(venueIds, contentLocale)
    const eventTranslationByEventId = mapEventTranslationsByEventId(eventTranslations)
    const venueTranslationByVenueId = mapVenueTranslationsByVenueId(venueTranslations)
    const venueById = new Map(venues.map(venue => [venue.id, localizeVenue(
      venue,
      venueTranslationByVenueId.get(venue.id),
    )]))
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
      localizeEvent(event, eventTranslationByEventId.get(event.id)),
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
    const items = await this.getPublicEventCatalogItems(options.locale)

    const filteredItems = items.filter((item) => {
      const statusMatches = options.status === EventCatalogStatusFilter.All || item.status === options.status
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

  async getEventCatalogLocationOptions(locale: string = sourceLocale): Promise<EventCatalogLocationOptions> {
    const items = await this.getPublicEventCatalogItems(locale)
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

  async getEventCatalogCities(locale: string = sourceLocale) {
    const items = await this.getPublicEventCatalogItems(locale)
    const cities = new Set<string>()

    for (const item of items) {
      if (item.venue?.city) {
        cities.add(item.venue.city)
      }
    }

    return Array.from(cities).sort((left, right) => left.localeCompare(right))
  }

  private async updateParentSummaryFieldsInTransaction(tx: Transaction, eventId: number, now: Date) {
    const event = await tx.select().from(tables.events).where(eq(tables.events.id, eventId)).get()
    if (!event) {
      throw new Error('Event not found')
    }

    const sessions = await tx
      .select()
      .from(tables.eventSessions)
      .where(eq(tables.eventSessions.eventId, eventId))
      .orderBy(asc(tables.eventSessions.startsAt))
      .all()

    const primarySession = event.primarySessionId
      ? sessions.find(session => session.id === event.primarySessionId) ?? sessions[0]
      : sessions[0]
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
        primarySessionId: primarySession.id,
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

  private async resetEventSessionsToDraftInTransaction(tx: Transaction, eventId: number, now: Date) {
    await tx
      .update(tables.eventSessions)
      .set({
        status: EventStatus.Draft,
        publishedAt: null,
        updatedAt: now,
      })
      .where(eq(tables.eventSessions.eventId, eventId))
  }

  private async resetEventSessionsByIdToDraftInTransaction(tx: Transaction, eventId: number, sessionIds: number[], now: Date) {
    if (sessionIds.length === 0) {
      return
    }

    await tx
      .update(tables.eventSessions)
      .set({
        status: EventStatus.Draft,
        publishedAt: null,
        updatedAt: now,
      })
      .where(and(
        eq(tables.eventSessions.eventId, eventId),
        inArray(tables.eventSessions.id, sessionIds),
      ))
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

  async publish(eventId: number, realtimeNamespace?: SeatmapRealtimeNamespace) {
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

    const publishedSessions: Array<Awaited<ReturnType<typeof eventSessionService.publishSessionInTransaction>>> = []

    for (const session of sessions) {
      const publishedSessionResult = await eventSessionService.publishSessionInTransaction(db, session.id, now)
      if (publishedSessionResult.rebuilt) {
        publishedSessions.push(publishedSessionResult)
      }
    }

    const publishedEvent = await db
      .update(tables.events)
      .set({
        status: EventStatus.Published,
        publishedAt: event.publishedAt ?? now,
        updatedAt: now,
      })
      .where(eq(tables.events.id, eventId))
      .returning()
      .get()

    if (!publishedEvent) {
      throw new Error('Failed to publish event')
    }

    for (const publishedSessionResult of publishedSessions) {
      const publishedSession = publishedSessionResult.session
      await broadcastSeatmapResyncRequiredWithKnownVersion(realtimeNamespace, {
        eventSessionId: publishedSession.id,
        sessionPublicId: publishedSession.publicId,
      }, publishedSession.seatmapVersion, 'layout-rebuilt')
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
    const now = new Date()
    const db = this.db
    const unpublished = await db
      .update(tables.events)
      .set({
        status: EventStatus.Draft,
        publishedAt: null,
        updatedAt: now,
      })
      .where(eq(tables.events.id, eventId))
      .returning()
      .get()

    await this.resetEventSessionsToDraftInTransaction(db, eventId, now)

    return unpublished
  }

  async getTranslations(eventId: number) {
    const [eventTranslations, ticketTypes] = await Promise.all([
      this.db
        .select()
        .from(tables.eventTranslations)
        .where(eq(tables.eventTranslations.eventId, eventId))
        .all(),
      this.db
        .select()
        .from(tables.ticketTypes)
        .where(eq(tables.ticketTypes.eventId, eventId))
        .all(),
    ])

    const ticketTypeIds = ticketTypes.map(ticketType => ticketType.id)
    const ticketTypeTranslations = ticketTypeIds.length > 0
      ? await this.db
          .select()
          .from(tables.ticketTypeTranslations)
          .where(inArray(tables.ticketTypeTranslations.ticketTypeId, ticketTypeIds))
          .all()
      : []

    return {
      eventTranslations,
      ticketTypes,
      ticketTypeTranslations,
    }
  }

  async saveTranslation(eventId: number, input: EventTranslationInput) {
    const now = new Date()
    const ticketTypes = await this.db
      .select({ id: tables.ticketTypes.id })
      .from(tables.ticketTypes)
      .where(eq(tables.ticketTypes.eventId, eventId))
      .all()
    const validTicketTypeIds = new Set(ticketTypes.map(ticketType => ticketType.id))
    const invalidTicketTypeTranslation = input.ticketTypes.find(ticketTypeTranslation => !validTicketTypeIds.has(ticketTypeTranslation.ticketTypeId))
    if (invalidTicketTypeTranslation) {
      throw new Error('Ticket type does not belong to this event')
    }

    const existingEventTranslation = await this.db
      .select()
      .from(tables.eventTranslations)
      .where(and(
        eq(tables.eventTranslations.eventId, eventId),
        eq(tables.eventTranslations.locale, input.locale),
      ))
      .get()

    const eventTranslationValues = {
      title: normalizeTranslationText(input.title),
      subtitle: normalizeTranslationText(input.subtitle),
      description: normalizeTranslationText(input.description),
      updatedAt: now,
    }

    if (existingEventTranslation) {
      await this.db
        .update(tables.eventTranslations)
        .set(eventTranslationValues)
        .where(eq(tables.eventTranslations.id, existingEventTranslation.id))
    }
    else {
      await this.db
        .insert(tables.eventTranslations)
        .values({
          eventId,
          locale: input.locale,
          ...eventTranslationValues,
          createdAt: now,
        })
    }

    for (const ticketTypeTranslation of input.ticketTypes) {
      const existingTicketTypeTranslation = await this.db
        .select()
        .from(tables.ticketTypeTranslations)
        .where(and(
          eq(tables.ticketTypeTranslations.ticketTypeId, ticketTypeTranslation.ticketTypeId),
          eq(tables.ticketTypeTranslations.locale, input.locale),
        ))
        .get()

      const ticketTypeTranslationValues = {
        name: normalizeTranslationText(ticketTypeTranslation.name),
        description: normalizeTranslationText(ticketTypeTranslation.description),
        updatedAt: now,
      }

      if (existingTicketTypeTranslation) {
        await this.db
          .update(tables.ticketTypeTranslations)
          .set(ticketTypeTranslationValues)
          .where(eq(tables.ticketTypeTranslations.id, existingTicketTypeTranslation.id))
      }
      else {
        await this.db
          .insert(tables.ticketTypeTranslations)
          .values({
            ticketTypeId: ticketTypeTranslation.ticketTypeId,
            locale: input.locale,
            ...ticketTypeTranslationValues,
            createdAt: now,
          })
      }
    }

    return this.getTranslations(eventId)
  }

  async getEventCardList(locale: string = sourceLocale) {
    return this.getPublicEventCatalogItems(locale)
  }

  async searchEventCardList(searchTerm: string, limit: number, locale: string = sourceLocale) {
    const searchTokens = getSearchTokens(searchTerm)
    if (searchTokens.length === 0) {
      return []
    }

    const items = await this.getPublicEventCatalogItems(locale)
    return items
      .filter(item => this.matchesCatalogSearch(item, searchTokens))
      .slice(0, Math.max(limit, 1))
  }
}

export default EventService.getInstance()
