import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import type { EventSession } from '#shared/db'
import type { EventSessionDraftInput, PricingModeInput, SessionSeatOverrideDraftInput, SessionSectionPriceDraftInput } from '#shared/schemas/ticketingSchema'
import type { VenueLayoutSyncApplyMapping, VenueLayoutSyncPreview, VenueLayoutSyncSuggestion } from '~~/types/admin-events'
import { IDatabaseService } from '~~/types/db/database-service'
import type { SeatmapRealtimeNamespace } from '~~/server/utils/ticketing/seatmap-realtime'
import { broadcastSeatmapResyncRequiredWithKnownVersion } from '~~/server/utils/ticketing/seatmap-realtime'
import { createPublicEventSessionId } from '~~/server/utils/ticketing/ids'
import { resolveSessionSeatPrice, validateCompleteSectionPricing } from '~~/server/utils/ticketing/pricing'
import { EventStatus, PricingMode, SeatStatus } from '#shared/commonEnums'

const D1_INSERT_BATCH_SIZE = 5

type Transaction = ReturnType<typeof useDB>

type EventSessionSeatMap = {
  seats: typeof tables.eventSeats.$inferSelect[]
  sections: typeof tables.venueSections.$inferSelect[]
  sectionPrices: typeof tables.sessionSectionPrices.$inferSelect[]
  seatOverrides: typeof tables.sessionSeatOverrides.$inferSelect[]
}

type PublishSessionResult = {
  session: typeof tables.eventSessions.$inferSelect
  rebuilt: boolean
}

type LegacyTicketTypeInput = NonNullable<EventSessionDraftInput['ticketTypes']>[number]

type SectionCountSummary = {
  rowCount: number
  seatCount: number
}

type VenueLayoutTree = {
  sections: typeof tables.venueSections.$inferSelect[]
  rows: typeof tables.venueRows.$inferSelect[]
  seats: typeof tables.venueSeats.$inferSelect[]
}

class EventSessionService extends IDatabaseService<typeof tables.eventSessions.$inferSelect> {
  private static instance: EventSessionService

  private get db() {
    return useDB()
  }

  public static getInstance(): EventSessionService {
    if (!EventSessionService.instance) {
      EventSessionService.instance = new EventSessionService()
    }

    return EventSessionService.instance
  }

  async getById(id: number) {
    return this.db.select().from(tables.eventSessions).where(eq(tables.eventSessions.id, id)).get()
  }

  async getByPublicId(publicId: string) {
    return this.db.select().from(tables.eventSessions).where(eq(tables.eventSessions.publicId, publicId)).get()
  }

  async getSeatmapVersionState(id: number) {
    return this.db
      .select({
        status: tables.eventSessions.status,
        seatmapVersion: tables.eventSessions.seatmapVersion,
      })
      .from(tables.eventSessions)
      .where(eq(tables.eventSessions.id, id))
      .get()
  }

  async getList() {
    return this.db
      .select()
      .from(tables.eventSessions)
      .all()
  }

  async listByEventId(eventId: number) {
    return this.db
      .select()
      .from(tables.eventSessions)
      .where(eq(tables.eventSessions.eventId, eventId))
      .orderBy(asc(tables.eventSessions.startsAt))
      .all()
  }

  async getTicketTypes(eventSessionId: number) {
    return this.db
      .select()
      .from(tables.ticketTypes)
      .where(eq(tables.ticketTypes.eventSessionId, eventSessionId))
      .orderBy(asc(tables.ticketTypes.sortOrder))
      .all()
  }

  async getSeatMap(eventSessionId: number): Promise<EventSessionSeatMap> {
    const seats = await this.db
      .select()
      .from(tables.eventSeats)
      .where(eq(tables.eventSeats.eventSessionId, eventSessionId))
      .all()

    const sectionIds = [...new Set(seats.flatMap((seat) => {
      return typeof seat.venueSectionId === 'number' ? [seat.venueSectionId] : []
    }))]

    const sections = sectionIds.length > 0
      ? await this.db
          .select()
          .from(tables.venueSections)
          .where(inArray(tables.venueSections.id, sectionIds))
          .all()
      : []

    const sectionPrices = await this.db
      .select()
      .from(tables.sessionSectionPrices)
      .where(eq(tables.sessionSectionPrices.eventSessionId, eventSessionId))
      .orderBy(asc(tables.sessionSectionPrices.sortOrder))
      .all()

    const seatOverrides = await this.db
      .select()
      .from(tables.sessionSeatOverrides)
      .where(eq(tables.sessionSeatOverrides.eventSessionId, eventSessionId))
      .all()

    return { seats, sections, sectionPrices, seatOverrides }
  }

  async listSessionSectionPrices(eventSessionId: number) {
    return this.db.select().from(tables.sessionSectionPrices).where(eq(tables.sessionSectionPrices.eventSessionId, eventSessionId)).orderBy(asc(tables.sessionSectionPrices.sortOrder)).all()
  }

  async listSessionSeatOverrides(eventSessionId: number) {
    return this.db.select().from(tables.sessionSeatOverrides).where(eq(tables.sessionSeatOverrides.eventSessionId, eventSessionId)).all()
  }

  async updateSessionPricing(eventSessionId: number, eventId: number, venueId: number, pricingMode: PricingModeInput, currency: string, priceCents: number | undefined, sectionPrices: SessionSectionPriceDraftInput[]) {
    const now = new Date()
    const tx = this.db
    const session = await this.assertDraftSessionOwnershipInTransaction(tx, eventSessionId, eventId, venueId)
    const venue = await tx.select().from(tables.venues).where(eq(tables.venues.id, venueId)).get()
    if (!venue) {
      throw new Error('Venue not found')
    }
    if (session.venueLayoutVersion !== venue.layoutVersion) {
      throw new Error('Session venue layout is stale. Sync the venue layout before editing session pricing.')
    }
    await this.replaceSessionSectionPricesInTransaction(tx, eventId, venueId, eventSessionId, pricingMode, currency, priceCents, sectionPrices, now)
    await tx.update(tables.eventSessions).set({ pricingMode, currency, updatedAt: now }).where(eq(tables.eventSessions.id, eventSessionId))
    return this.getById(eventSessionId)
  }

  async updateSeatOverrides(eventSessionId: number, eventId: number, venueId: number, seatOverrides: SessionSeatOverrideDraftInput[]) {
    const now = new Date()
    const tx = this.db
    const session = await this.assertDraftSessionOwnershipInTransaction(tx, eventSessionId, eventId, venueId)
    const venue = await tx.select().from(tables.venues).where(eq(tables.venues.id, venueId)).get()
    if (!venue) {
      throw new Error('Venue not found')
    }
    if (session.venueLayoutVersion !== venue.layoutVersion) {
      throw new Error('Session venue layout is stale. Sync the venue layout before editing session pricing.')
    }
    await this.replaceSessionSeatOverridesInTransaction(tx, eventId, venueId, eventSessionId, seatOverrides, now)
    await tx.update(tables.eventSessions).set({ updatedAt: now }).where(eq(tables.eventSessions.id, eventSessionId))
    return this.getById(eventSessionId)
  }

  private deriveLegacySectionPrices(ticketTypes: LegacyTicketTypeInput[] | undefined, venueSections: typeof tables.venueSections.$inferSelect[]) {
    if (!ticketTypes || ticketTypes.length === 0) {
      return []
    }

    const sectionTicketTypes = ticketTypes.filter(ticketType => ticketType.venueSectionId !== null && ticketType.venueSectionId !== undefined)
    const fallbackTicketType = ticketTypes.find(ticketType => ticketType.venueSectionId === null || ticketType.venueSectionId === undefined)
    const sectionById = new Map(venueSections.map(section => [section.id, section]))

    const rows = venueSections.map((section) => {
      const ticketType = sectionTicketTypes.find(item => item.venueSectionId === section.id) ?? fallbackTicketType
      if (!ticketType) {
        return null
      }

      if (ticketType.venueSectionId !== null && ticketType.venueSectionId !== section.id) {
        return null
      }

      return {
        venueSectionId: section.id,
        priceCents: ticketType.priceCents,
        currency: ticketType.currency,
        sortOrder: ticketType.sortOrder,
        sectionNameSnapshot: sectionById.get(section.id)?.name ?? section.name,
        sectionColorSnapshot: sectionById.get(section.id)?.color ?? section.color,
      }
    }).filter((row): row is { venueSectionId: number, priceCents: number, currency: string, sortOrder: number, sectionNameSnapshot: string, sectionColorSnapshot: string } => row !== null)

    if (rows.length !== venueSections.length) {
      throw new Error('Legacy ticket types must provide a price for every venue section or a fallback price')
    }

    return rows
  }

  private async listVenueSectionsForVersion(tx: Transaction, venueId: number, layoutVersion: number) {
    return tx
      .select()
      .from(tables.venueSections)
      .where(and(eq(tables.venueSections.venueId, venueId), eq(tables.venueSections.layoutVersion, layoutVersion)))
      .orderBy(asc(tables.venueSections.sortOrder))
      .all()
  }

  private async loadVenueLayoutTreeForVersion(tx: Transaction, venueId: number, layoutVersion: number): Promise<VenueLayoutTree> {
    const sections = await this.listVenueSectionsForVersion(tx, venueId, layoutVersion)
    const sectionIds = sections.map(section => section.id)
    const rows = sectionIds.length > 0
      ? await tx.select().from(tables.venueRows).where(and(inArray(tables.venueRows.sectionId, sectionIds), eq(tables.venueRows.layoutVersion, layoutVersion))).all()
      : []
    const rowIds = rows.map(row => row.id)
    const seats = rowIds.length > 0
      ? await tx.select().from(tables.venueSeats).where(and(inArray(tables.venueSeats.rowId, rowIds), eq(tables.venueSeats.layoutVersion, layoutVersion))).all()
      : []

    return { sections, rows, seats }
  }

  private summarizeSections(tree: VenueLayoutTree) {
    const rowCounts = new Map<number, number>()
    const seatCounts = new Map<number, number>()

    for (const row of tree.rows) {
      rowCounts.set(row.sectionId, (rowCounts.get(row.sectionId) ?? 0) + 1)
    }

    const rowById = new Map(tree.rows.map(row => [row.id, row]))
    for (const seat of tree.seats) {
      const row = rowById.get(seat.rowId)
      if (!row) continue
      seatCounts.set(row.sectionId, (seatCounts.get(row.sectionId) ?? 0) + 1)
    }

    return new Map(tree.sections.map(section => [section.id, { rowCount: rowCounts.get(section.id) ?? 0, seatCount: seatCounts.get(section.id) ?? 0 }]))
  }

  private async loadHistoricalSectionsByIds(tx: Transaction, sectionIds: number[]) {
    if (sectionIds.length === 0) {
      return []
    }

    return tx.select().from(tables.venueSections).where(inArray(tables.venueSections.id, sectionIds)).all()
  }

  private buildSectionSuggestion(
    currentSection: typeof tables.venueSections.$inferSelect,
    pricedOldSectionIds: Set<number>,
    allOldSectionsById: Map<number, typeof tables.venueSections.$inferSelect>,
  ) {
    if (currentSection.previousSectionId !== null && currentSection.previousSectionId !== undefined) {
      if (pricedOldSectionIds.has(currentSection.previousSectionId)) {
        return { sourceVenueSectionId: currentSection.previousSectionId, confidence: 'high', reason: 'lineage' } satisfies VenueLayoutSyncSuggestion
      }

      let ancestorId = currentSection.previousSectionId
      while (ancestorId !== null && ancestorId !== undefined) {
        const ancestor = allOldSectionsById.get(ancestorId)
        if (!ancestor) break
        if (pricedOldSectionIds.has(ancestor.id)) {
          return { sourceVenueSectionId: ancestor.id, confidence: 'high', reason: 'ancestor-lineage' } satisfies VenueLayoutSyncSuggestion
        }
        ancestorId = ancestor.previousSectionId ?? null
      }
    }

    return { sourceVenueSectionId: null, confidence: 'none', reason: 'new-section' } satisfies VenueLayoutSyncSuggestion
  }

  private async assertDraftSessionOwnershipInTransaction(tx: Transaction, eventSessionId: number, eventId: number, venueId: number) {
    const session = await tx.select().from(tables.eventSessions).where(eq(tables.eventSessions.id, eventSessionId)).get()
    if (!session) {
      throw new Error('Event session not found')
    }
    if (session.eventId !== eventId) {
      throw new Error('Event session does not belong to event')
    }
    if (session.status !== EventStatus.Draft) {
      throw new Error('Session pricing can only be changed while draft.')
    }
    if (session.venueId !== venueId) {
      throw new Error('Venue does not match session')
    }
    return session
  }

  private async replaceSessionSectionPricesInTransaction(
    tx: Transaction,
    eventId: number,
    venueId: number,
    eventSessionId: number,
    pricingMode: PricingModeInput,
    currency: string,
    priceCents: number | undefined,
    sectionPrices: SessionSectionPriceDraftInput[],
    now: Date,
  ) {
    const venue = await tx.select().from(tables.venues).where(eq(tables.venues.id, venueId)).get()
    if (!venue) {
      throw new Error('Venue not found')
    }

    const venueSections = await this.listVenueSectionsForVersion(tx, venueId, venue.layoutVersion)
    const venueSectionById = new Map(venueSections.map(section => [section.id, section]))
    if (pricingMode === PricingMode.Section) {
      validateCompleteSectionPricing(venueSections, sectionPrices)
    }

    await tx.delete(tables.sessionSectionPrices).where(eq(tables.sessionSectionPrices.eventSessionId, eventSessionId))

    const rows = pricingMode === PricingMode.Uniform
      ? venueSections.map(venueSection => ({
          eventId,
          eventSessionId,
          venueSectionId: venueSection.id,
          sectionNameSnapshot: venueSection.name,
          sectionColorSnapshot: venueSection.color,
          priceCents: priceCents ?? sectionPrices[0]?.priceCents ?? 0,
          currency,
          sortOrder: venueSection.sortOrder,
          createdAt: now,
          updatedAt: now,
        }))
      : sectionPrices.length > 0
        ? sectionPrices.map((sectionPrice) => {
            const venueSection = venueSectionById.get(sectionPrice.venueSectionId)
            if (!venueSection) {
              throw new Error(`Section pricing references unknown venue section ${sectionPrice.venueSectionId}`)
            }

            return {
              eventId,
              eventSessionId,
              venueSectionId: sectionPrice.venueSectionId,
              sectionNameSnapshot: venueSection.name,
              sectionColorSnapshot: venueSection.color,
              priceCents: sectionPrice.priceCents,
              currency: sectionPrice.currency,
              sortOrder: sectionPrice.sortOrder,
              createdAt: now,
              updatedAt: now,
            }
          })
        : []

    if (rows.length > 0) {
      await tx.insert(tables.sessionSectionPrices).values(rows)
    }
  }

  private async replaceSessionSeatOverridesInTransaction(
    tx: Transaction,
    eventId: number,
    venueId: number,
    eventSessionId: number,
    seatOverrides: SessionSeatOverrideDraftInput[],
    now: Date,
  ) {
    const venue = await tx.select().from(tables.venues).where(eq(tables.venues.id, venueId)).get()
    if (!venue) {
      throw new Error('Venue not found')
    }

    const tree = await this.loadVenueLayoutTreeForVersion(tx, venueId, venue.layoutVersion)
    const venueSections = tree.sections
    const venueRows = tree.rows
    const venueSeats = tree.seats
    const sectionById = new Map(venueSections.map(section => [section.id, section]))
    const rowById = new Map(venueRows.map(row => [row.id, row]))
    const seatById = new Map(venueSeats.map(seat => [seat.id, seat]))
    const rows: typeof tables.sessionSeatOverrides.$inferInsert[] = []

    for (const override of seatOverrides) {
      const seat = seatById.get(override.venueSeatId)
      if (!seat) {
        throw new Error(`Seat override references unknown venue seat ${override.venueSeatId}`)
      }

      const row = rowById.get(seat.rowId)
      if (!row) {
        throw new Error(`Seat override references seat ${override.venueSeatId} without a row`)
      }

      const seatSection = sectionById.get(row.sectionId)
      if (!seatSection) {
        throw new Error(`Seat override references seat ${override.venueSeatId} without a section`)
      }

      if (override.venueSectionId !== seatSection.id) {
        throw new Error(`Seat override section ${override.venueSectionId} does not match seat ${override.venueSeatId}`)
      }

      rows.push({
        eventId,
        eventSessionId,
        venueSeatId: override.venueSeatId,
        venueSectionId: override.venueSectionId,
        priceCents: override.priceCents ?? null,
        currency: override.currency ?? null,
        isDisabled: override.isDisabled,
        createdAt: now,
        updatedAt: now,
      })
    }

    await tx.delete(tables.sessionSeatOverrides).where(eq(tables.sessionSeatOverrides.eventSessionId, eventSessionId))
    if (rows.length > 0) {
      await tx.insert(tables.sessionSeatOverrides).values(rows)
    }
  }

  async createForEvent(eventId: number, fallbackVenueId: number, input: EventSessionDraftInput) {
    return this.createForEventInTransaction(this.db, eventId, fallbackVenueId, input)
  }

  async createForEventInTransaction(tx: Transaction, eventId: number, fallbackVenueId: number, input: EventSessionDraftInput, now = new Date()) {
    const venueId = input.venueId || fallbackVenueId

    const venue = await tx.select().from(tables.venues).where(eq(tables.venues.id, venueId)).get()
    if (!venue) {
      throw new Error('Venue not found')
    }

    const session = await tx.insert(tables.eventSessions).values({
      publicId: input.publicId ?? createPublicEventSessionId(),
      eventId,
      venueId,
      label: input.label,
      status: input.status,
      pricingMode: input.pricingMode,
      currency: input.currency,
      venueLayoutVersion: venue.layoutVersion,
      venueSyncedAt: now,
      startsAt: input.startsAt,
      endsAt: input.endsAt ?? null,
      salesStartAt: input.salesStartAt,
      salesEndAt: input.salesEndAt,
      queueEnabled: input.queueEnabled,
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
    }).returning().get()

    if (!session) {
      throw new Error('Failed to create event session')
    }

    const venueSections = await this.listVenueSectionsForVersion(tx, venueId, venue.layoutVersion)
    const sectionPrices = input.sectionPrices.length > 0 ? input.sectionPrices : this.deriveLegacySectionPrices(input.ticketTypes, venueSections)
    if (sectionPrices.length === 0) {
      throw new Error('Session pricing requires section prices or legacy ticket types')
    }
    await this.replaceSessionSectionPricesInTransaction(tx, eventId, venueId, session.id, input.pricingMode, input.currency, undefined, sectionPrices, now)
    await this.replaceSessionSeatOverridesInTransaction(tx, eventId, venueId, session.id, input.seatOverrides, now)

    return session
  }

  async updateForEvent(eventId: number, fallbackVenueId: number, input: EventSessionDraftInput) {
    if (!input.id) {
      return this.createForEvent(eventId, fallbackVenueId, input)
    }

    return this.updateForEventInTransaction(this.db, eventId, fallbackVenueId, input)
  }

  async updateForEventInTransaction(tx: Transaction, eventId: number, fallbackVenueId: number, input: EventSessionDraftInput, now = new Date()) {
    if (!input.id) {
      return this.createForEventInTransaction(tx, eventId, fallbackVenueId, input, now)
    }

    const venueId = input.venueId || fallbackVenueId

    const existing = await tx.select().from(tables.eventSessions).where(eq(tables.eventSessions.id, input.id)).get()
    if (!existing) {
      throw new Error('Event session not found')
    }

    if (existing.eventId !== eventId) {
      throw new Error('Event session does not belong to event')
    }

    if (existing.status !== EventStatus.Draft) {
      throw new Error('Session pricing can only be changed while draft.')
    }

    const venue = await tx.select().from(tables.venues).where(eq(tables.venues.id, venueId)).get()
    if (!venue) {
      throw new Error('Venue not found')
    }

    const keepLayoutVersion = existing.venueId === venueId
    if (keepLayoutVersion && existing.venueLayoutVersion !== venue.layoutVersion) {
      throw new Error('Session venue layout is stale. Sync the venue layout before editing session pricing.')
    }
    const venueLayoutVersion = keepLayoutVersion ? existing.venueLayoutVersion : venue.layoutVersion
    const venueSyncedAt = keepLayoutVersion ? existing.venueSyncedAt : now

    const session = await tx.update(tables.eventSessions).set({
      venueId,
      label: input.label,
      status: input.status,
      pricingMode: input.pricingMode,
      currency: input.currency,
      venueLayoutVersion,
      venueSyncedAt,
      startsAt: input.startsAt,
      endsAt: input.endsAt ?? null,
      salesStartAt: input.salesStartAt,
      salesEndAt: input.salesEndAt,
      queueEnabled: input.queueEnabled,
      updatedAt: now,
    }).where(eq(tables.eventSessions.id, input.id)).returning().get()

    if (!session) {
      throw new Error('Failed to update event session')
    }

    const venueSections = await this.listVenueSectionsForVersion(tx, venueId, venue.layoutVersion)
    const sectionPrices = input.sectionPrices.length > 0 ? input.sectionPrices : this.deriveLegacySectionPrices(input.ticketTypes, venueSections)
    if (sectionPrices.length === 0) {
      throw new Error('Session pricing requires section prices or legacy ticket types')
    }
    await this.replaceSessionSectionPricesInTransaction(tx, eventId, venueId, input.id, input.pricingMode, input.currency, undefined, sectionPrices, now)
    await this.replaceSessionSeatOverridesInTransaction(tx, eventId, venueId, input.id, input.seatOverrides, now)

    return session
  }

  async getVenueLayoutSyncPreview(eventId: number, eventSessionId: number): Promise<VenueLayoutSyncPreview> {
    const session = await this.db.select().from(tables.eventSessions).where(eq(tables.eventSessions.id, eventSessionId)).get()
    if (!session) {
      throw new Error('Event session not found')
    }
    if (session.eventId !== eventId) {
      throw new Error('Event session does not belong to event')
    }

    const venue = await this.db.select().from(tables.venues).where(eq(tables.venues.id, session.venueId)).get()
    if (!venue) {
      throw new Error('Venue not found')
    }

    const oldSectionPrices = await this.db.select().from(tables.sessionSectionPrices).where(eq(tables.sessionSectionPrices.eventSessionId, eventSessionId)).orderBy(asc(tables.sessionSectionPrices.sortOrder)).all()
    const oldSections = await this.loadHistoricalSectionsByIds(this.db, oldSectionPrices.map(price => price.venueSectionId))
    const oldSectionById = new Map(oldSections.map(section => [section.id, section]))
    const allOldSections = await this.db.select().from(tables.venueSections).where(eq(tables.venueSections.venueId, session.venueId)).all()
    const allOldSectionsById = new Map(allOldSections.map(section => [section.id, section]))
    const oldRows = oldSections.length > 0
      ? await this.db.select().from(tables.venueRows).where(inArray(tables.venueRows.sectionId, oldSections.map(section => section.id))).all()
      : []
    const oldSeats = oldRows.length > 0
      ? await this.db.select().from(tables.venueSeats).where(inArray(tables.venueSeats.rowId, oldRows.map(row => row.id))).all()
      : []
    const oldTree = { sections: oldSections, rows: oldRows, seats: oldSeats } satisfies VenueLayoutTree
    const currentTree = await this.loadVenueLayoutTreeForVersion(this.db, session.venueId, venue.layoutVersion)
    const oldSummary = this.summarizeSections(oldTree)
    const currentSummary = this.summarizeSections(currentTree)
    const oldSectionIds = new Set(oldSections.map(section => section.id))

    const suggestions = currentTree.sections.map((currentSection) => {
      const suggestion = this.buildSectionSuggestion(currentSection, oldSectionIds, allOldSectionsById)
      if (suggestion.sourceVenueSectionId !== null) {
        return { venueSectionId: currentSection.id, ...suggestion }
      }

      const normalizedCurrentName = currentSection.name.trim().toLowerCase()
      const match = oldSections.find((oldSection) => {
        const countsMatch = (oldSummary.get(oldSection.id)?.seatCount ?? 0) === (currentSummary.get(currentSection.id)?.seatCount ?? 0)
        const colorMatch = oldSection.color === currentSection.color
        return oldSection.name.trim().toLowerCase() === normalizedCurrentName && (colorMatch || countsMatch)
      })

      if (match) {
        return { venueSectionId: currentSection.id, sourceVenueSectionId: match.id, confidence: 'medium', reason: 'display-match' } satisfies VenueLayoutSyncSuggestion
      }

      return { venueSectionId: currentSection.id, sourceVenueSectionId: null, confidence: 'none', reason: 'new-section' } satisfies VenueLayoutSyncSuggestion
    })

    return {
      sessionId: session.id,
      eventId: session.eventId,
      venueId: session.venueId,
      sessionLayoutVersion: session.venueLayoutVersion,
      currentLayoutVersion: venue.layoutVersion,
      status: session.venueLayoutVersion === venue.layoutVersion ? 'current' : 'stale',
      oldSections: oldSectionPrices.map((price) => {
        const section = oldSectionById.get(price.venueSectionId)
        const counts = oldSummary.get(price.venueSectionId) ?? { rowCount: 0, seatCount: 0 }
        return {
          venueSectionId: price.venueSectionId,
          name: section?.name ?? price.sectionNameSnapshot,
          color: section?.color ?? price.sectionColorSnapshot,
          sortOrder: price.sortOrder,
          priceCents: price.priceCents,
          currency: price.currency,
          rowCount: counts.rowCount,
          seatCount: counts.seatCount,
        }
      }),
      currentSections: currentTree.sections.map(section => ({
        venueSectionId: section.id,
        name: section.name,
        color: section.color,
        sortOrder: section.sortOrder,
        rowCount: currentSummary.get(section.id)?.rowCount ?? 0,
        seatCount: currentSummary.get(section.id)?.seatCount ?? 0,
      })),
      suggestions,
      clearsSeatOverrides: (await this.db.select().from(tables.sessionSeatOverrides).where(eq(tables.sessionSeatOverrides.eventSessionId, eventSessionId)).all()).length > 0,
    }
  }

  async applyVenueLayoutSync(eventId: number, eventSessionId: number, mappings: VenueLayoutSyncApplyMapping[]) {
    const now = new Date()
    const session = await this.db.select().from(tables.eventSessions).where(eq(tables.eventSessions.id, eventSessionId)).get()
    if (!session) {
      throw new Error('Event session not found')
    }
    if (session.eventId !== eventId) {
      throw new Error('Event session does not belong to event')
    }
    if (session.status !== EventStatus.Draft) {
      throw new Error('Session pricing can only be changed while draft.')
    }

    await this.assertCanPublishSessionInTransaction(this.db, eventSessionId)

    const venue = await this.db.select().from(tables.venues).where(eq(tables.venues.id, session.venueId)).get()
    if (!venue) {
      throw new Error('Venue not found')
    }

    const currentSections = await this.listVenueSectionsForVersion(this.db, session.venueId, venue.layoutVersion)
    if (mappings.length !== currentSections.length) {
      throw new Error('Venue layout sync mappings must cover every current section exactly once')
    }

    const mappedIds = new Set<number>()
    for (const mapping of mappings) {
      if (mappedIds.has(mapping.venueSectionId)) {
        throw new Error('Venue layout sync mappings must not duplicate current sections')
      }
      mappedIds.add(mapping.venueSectionId)
    }

    if (currentSections.some(section => !mappedIds.has(section.id))) {
      throw new Error('Venue layout sync mappings must include every current section')
    }

    const oldSectionPrices = await this.db.select().from(tables.sessionSectionPrices).where(eq(tables.sessionSectionPrices.eventSessionId, eventSessionId)).all()
    const oldSectionIds = new Set(oldSectionPrices.map(price => price.venueSectionId))
    for (const mapping of mappings) {
      if (mapping.sourceVenueSectionId !== null && mapping.sourceVenueSectionId !== undefined && !oldSectionIds.has(mapping.sourceVenueSectionId)) {
        throw new Error(`Venue layout sync mapping references unknown source section ${mapping.sourceVenueSectionId}`)
      }
    }

    const currentById = new Map(currentSections.map(section => [section.id, section]))
    const replacementSectionPrices = mappings.map((mapping) => {
      const section = currentById.get(mapping.venueSectionId)
      if (!section) {
        throw new Error(`Venue layout sync mapping references unknown current section ${mapping.venueSectionId}`)
      }

      return {
        eventId,
        eventSessionId,
        venueSectionId: section.id,
        sectionNameSnapshot: section.name,
        sectionColorSnapshot: section.color,
        priceCents: mapping.priceCents,
        currency: mapping.currency,
        sortOrder: section.sortOrder,
        createdAt: now,
        updatedAt: now,
      }
    })

    await this.db.batch([
      this.db.delete(tables.sessionSectionPrices).where(eq(tables.sessionSectionPrices.eventSessionId, eventSessionId)),
      this.db.delete(tables.sessionSeatOverrides).where(eq(tables.sessionSeatOverrides.eventSessionId, eventSessionId)),
      this.db.insert(tables.sessionSectionPrices).values(replacementSectionPrices),
      this.db.update(tables.eventSessions).set({
        venueLayoutVersion: venue.layoutVersion,
        venueSyncedAt: now,
        updatedAt: now,
      }).where(eq(tables.eventSessions.id, eventSessionId)),
    ])

    const updatedSession = await this.getById(eventSessionId)
    if (!updatedSession) {
      throw new Error('Failed to update event session')
    }

    return updatedSession
  }

  async publishSession(eventSessionId: number, realtimeNamespace?: SeatmapRealtimeNamespace) {
    const result = await this.publishSessionInTransaction(this.db, eventSessionId)
    const publishedSession = result.session

    if (result.rebuilt) {
      await broadcastSeatmapResyncRequiredWithKnownVersion(realtimeNamespace, {
        eventSessionId: publishedSession.id,
        sessionPublicId: publishedSession.publicId,
      }, publishedSession.seatmapVersion, 'layout-rebuilt')
    }

    return publishedSession
  }

  async publishSessionInTransaction(tx: Transaction, eventSessionId: number, now = new Date()): Promise<PublishSessionResult> {
    const session = await tx.select().from(tables.eventSessions).where(eq(tables.eventSessions.id, eventSessionId)).get()
    if (!session) {
      throw new Error('Event session not found')
    }

    if (session.status !== EventStatus.Draft) {
      return { session, rebuilt: false }
    }

    await this.assertCanPublishSessionInTransaction(tx, eventSessionId)

    const venue = await tx.select().from(tables.venues).where(eq(tables.venues.id, session.venueId)).get()
    if (!venue) {
      throw new Error('Venue not found while publishing session')
    }
    if (session.venueLayoutVersion !== venue.layoutVersion) {
      throw new Error('Session venue layout is stale. Sync the venue layout before publishing.')
    }

    const layoutTree = await this.loadVenueLayoutTreeForVersion(tx, session.venueId, venue.layoutVersion)
    const venueSections = layoutTree.sections
    const venueRows = layoutTree.rows
    const venueSeats = layoutTree.seats
    const sectionById = new Map(venueSections.map(section => [section.id, section]))
    const rowById = new Map(venueRows.map(row => [row.id, row]))
    const sectionPrices = await tx.select().from(tables.sessionSectionPrices).where(eq(tables.sessionSectionPrices.eventSessionId, eventSessionId)).all()
    const seatOverrides = await tx.select().from(tables.sessionSeatOverrides).where(eq(tables.sessionSeatOverrides.eventSessionId, eventSessionId)).all()
    validateCompleteSectionPricing(venueSections, sectionPrices)
    const sectionPriceById = new Map(sectionPrices.map(sectionPrice => [sectionPrice.venueSectionId, sectionPrice]))
    const seatOverrideById = new Map(seatOverrides.map(override => [override.venueSeatId, override]))

    await tx.delete(tables.eventSeats).where(eq(tables.eventSeats.eventSessionId, eventSessionId))

    if (venueSeats.length > 0) {
      for (let start = 0; start < venueSeats.length; start += D1_INSERT_BATCH_SIZE) {
        const seatBatch = venueSeats.slice(start, start + D1_INSERT_BATCH_SIZE)
        await tx.insert(tables.eventSeats).values(
          seatBatch.map((seat) => {
            const row = rowById.get(seat.rowId)
            if (!row) {
              throw new Error('Venue row not found while publishing session')
            }

            const section = sectionById.get(row.sectionId)
            if (!section) {
              throw new Error('Venue section not found while publishing session')
            }

            const resolvedPrice = resolveSessionSeatPrice({ venueSeatId: seat.id, venueSectionId: section.id }, sectionPriceById, seatOverrideById)

            return {
              eventId: session.eventId,
              eventSessionId,
              venueSeatId: seat.id,
              venueSectionId: section.id,
              ticketTypeId: null,
              holdId: null,
              orderId: null,
              sectionNameSnapshot: section.name,
              rowLabelSnapshot: row.label,
              seatLabelSnapshot: seat.label,
              displayX: seat.x,
              displayY: seat.y,
              priceCents: resolvedPrice.priceCents,
              currency: resolvedPrice.currency,
              status: resolvedPrice.isDisabled ? SeatStatus.Unavailable : SeatStatus.Available,
              lockedAt: null,
              soldAt: null,
              createdAt: now,
              updatedAt: now,
            }
          }),
        )
      }
    }

    const publishedSession = await tx.update(tables.eventSessions).set({
      status: EventStatus.Published,
      publishedAt: now,
      updatedAt: now,
      seatmapVersion: sql`${tables.eventSessions.seatmapVersion} + 1`,
    }).where(eq(tables.eventSessions.id, eventSessionId)).returning().get()

    if (!publishedSession) {
      throw new Error('Failed to publish event session')
    }

    return { session: publishedSession, rebuilt: true }
  }

  async assertCanPublishSession(eventSessionId: number) {
    return this.assertCanPublishSessionInTransaction(this.db, eventSessionId)
  }

  async assertCanPublishSessionInTransaction(tx: Transaction, eventSessionId: number) {
    const session = await tx.select().from(tables.eventSessions).where(eq(tables.eventSessions.id, eventSessionId)).get()
    if (!session) {
      throw new Error('Event session not found')
    }

    if (session.status !== EventStatus.Draft) {
      return session
    }

    const existingSeats = await tx
      .select()
      .from(tables.eventSeats)
      .where(eq(tables.eventSeats.eventSessionId, eventSessionId))
      .all()

    if (existingSeats.some(seat => seat.status !== SeatStatus.Available || seat.holdId !== null || seat.orderId !== null)) {
      throw new Error('Session inventory cannot be regenerated after activity starts.')
    }

    return session
  }

  async create(_data: Partial<EventSession>): Promise<EventSession> {
    throw new Error('Use createForEvent to create event sessions')
  }

  async update(_data: Partial<EventSession>): Promise<EventSession> {
    throw new Error('Use updateForEvent to update event sessions')
  }

  async delete(id: number | string): Promise<void> {
    await this.db.delete(tables.eventSessions).where(eq(tables.eventSessions.id, Number(id)))
  }

  async bulkDelete(ids: number[] | string[]): Promise<void> {
    const numericIds = ids.map(id => Number(id))
    if (numericIds.length === 0) {
      return
    }

    await this.db.delete(tables.eventSessions).where(inArray(tables.eventSessions.id, numericIds))
  }
}

export default EventSessionService.getInstance()
