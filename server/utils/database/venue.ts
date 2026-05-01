import { eq, inArray } from 'drizzle-orm'
import type { Venue } from '#shared/db'
import type { CreateVenueInput, UpdateVenueInput, VenueRowDraftInput, VenueSectionDraftInput } from '#shared/schemas/ticketingSchema'
import { IDatabaseService } from '~~/types/db/database-service'
import { createPublicVenueId } from '~~/server/utils/ticketing/ids'

type VenueDetail = {
  venue: Venue
  sections: Array<{
    id: number
    code: string
    name: string
    color: string
    sortOrder: number
    rows: Array<{
      id: number
      label: string
      sortOrder: number
      seats: Array<{
        id: number
        label: string
        seatNumber: number
        x: number
        y: number
        sortOrder: number
        accessibilityLabel: string | null
        isAccessible: boolean
      }>
    }>
  }>
}

class VenueService extends IDatabaseService<Venue> {
  private static instance: VenueService

  private get db() {
    return useDB()
  }

  public static getInstance(): VenueService {
    if (!VenueService.instance) {
      VenueService.instance = new VenueService()
    }

    return VenueService.instance
  }

  async getById(id: number) {
    return this.db
      .select()
      .from(tables.venues)
      .where(eq(tables.venues.id, id))
      .get()
  }

  async getBySlug(slug: string) {
    return this.db
      .select()
      .from(tables.venues)
      .where(eq(tables.venues.slug, slug))
      .get()
  }

  async getList() {
    return this.db
      .select()
      .from(tables.venues)
      .all()
  }

  async getDetail(id: number): Promise<VenueDetail | undefined> {
    const venue = await this.getById(id)
    if (!venue) {
      return undefined
    }

    const sections = await this.db
      .select()
      .from(tables.venueSections)
      .where(eq(tables.venueSections.venueId, id))
      .all()

    const sectionIds = sections.map(section => section.id)
    const rows = sectionIds.length > 0
      ? await this.db
          .select()
          .from(tables.venueRows)
          .where(inArray(tables.venueRows.sectionId, sectionIds))
          .all()
      : []

    const rowIds = rows.map(row => row.id)
    const seats = rowIds.length > 0
      ? await this.db
          .select()
          .from(tables.venueSeats)
          .where(inArray(tables.venueSeats.rowId, rowIds))
          .all()
      : []

    return {
      venue,
      sections: sections
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map(section => ({
          id: section.id,
          code: section.code,
          name: section.name,
          color: section.color,
          sortOrder: section.sortOrder,
          rows: rows
            .filter(row => row.sectionId === section.id)
            .sort((left, right) => left.sortOrder - right.sortOrder)
            .map(row => ({
              id: row.id,
              label: row.label,
              sortOrder: row.sortOrder,
              seats: seats
                .filter(seat => seat.rowId === row.id)
                .sort((left, right) => left.sortOrder - right.sortOrder)
                .map(seat => ({
                  id: seat.id,
                  label: seat.label,
                  seatNumber: seat.seatNumber,
                  x: seat.x,
                  y: seat.y,
                  sortOrder: seat.sortOrder,
                  accessibilityLabel: seat.accessibilityLabel,
                  isAccessible: seat.isAccessible,
                })),
            })),
        })),
    }
  }

  async create(data: CreateVenueInput) {
    const now = new Date()

    const venue = await this.db.transaction(async (tx) => {
      const createdVenue = await tx
        .insert(tables.venues)
        .values({
          publicId: createPublicVenueId(),
          slug: data.slug,
          name: data.name,
          description: data.description ?? null,
          city: data.city,
          country: data.country,
          address: data.address,
          coverImage: data.coverImage || null,
          capacity: this.calculateCapacity(data.sections),
          createdAt: now,
          updatedAt: now,
        })
        .returning()
        .get()

      if (!createdVenue) {
        throw new Error('Failed to create venue')
      }

      await this.insertVenueTree(tx, createdVenue.id, data.sections, now)

      return createdVenue
    })

    return venue
  }

  async update(data: UpdateVenueInput) {
    const now = new Date()

    const venue = await this.db.transaction(async (tx) => {
      const updatedVenue = await tx
        .update(tables.venues)
        .set({
          slug: data.slug,
          name: data.name,
          description: data.description ?? null,
          city: data.city,
          country: data.country,
          address: data.address,
          coverImage: data.coverImage || null,
          capacity: this.calculateCapacity(data.sections),
          updatedAt: now,
        })
        .where(eq(tables.venues.id, data.id))
        .returning()
        .get()

      if (!updatedVenue) {
        throw new Error('Venue not found')
      }

      const existingSections = await tx
        .select({ id: tables.venueSections.id })
        .from(tables.venueSections)
        .where(eq(tables.venueSections.venueId, data.id))
        .all()

      const sectionIds = existingSections.map(section => section.id)
      if (sectionIds.length > 0) {
        const existingRows = await tx
          .select({ id: tables.venueRows.id })
          .from(tables.venueRows)
          .where(inArray(tables.venueRows.sectionId, sectionIds))
          .all()

        const rowIds = existingRows.map(row => row.id)
        if (rowIds.length > 0) {
          await tx
            .delete(tables.venueSeats)
            .where(inArray(tables.venueSeats.rowId, rowIds))
        }

        await tx
          .delete(tables.venueRows)
          .where(inArray(tables.venueRows.sectionId, sectionIds))

        await tx
          .delete(tables.venueSections)
          .where(eq(tables.venueSections.venueId, data.id))
      }

      await this.insertVenueTree(tx, data.id, data.sections, now)

      return updatedVenue
    })

    return venue
  }

  async delete(id: number) {
    await this.db
      .delete(tables.venues)
      .where(eq(tables.venues.id, id))
  }

  async bulkDelete(ids: number[]) {
    if (ids.length === 0) {
      return
    }

    await this.db
      .delete(tables.venues)
      .where(inArray(tables.venues.id, ids))
  }

  private calculateCapacity(sections: VenueSectionDraftInput[]) {
    return sections.reduce((sectionTotal, section) => {
      const rowCapacity = section.rows.reduce((rowTotal, row) => rowTotal + row.seats.length, 0)
      return sectionTotal + rowCapacity
    }, 0)
  }

  private async insertVenueTree(
    tx: ReturnType<typeof useDB>,
    venueId: number,
    sections: VenueSectionDraftInput[],
    timestamp: Date,
  ) {
    for (const section of sections) {
      const createdSection = await tx
        .insert(tables.venueSections)
        .values({
          venueId,
          code: section.code,
          name: section.name,
          color: section.color,
          sortOrder: section.sortOrder,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .returning()
        .get()

      if (!createdSection) {
        throw new Error('Failed to create venue section')
      }

      await this.insertRows(tx, createdSection.id, section.rows, timestamp)
    }
  }

  private async insertRows(
    tx: ReturnType<typeof useDB>,
    sectionId: number,
    rows: VenueRowDraftInput[],
    timestamp: Date,
  ) {
    for (const row of rows) {
      const createdRow = await tx
        .insert(tables.venueRows)
        .values({
          sectionId,
          label: row.label,
          sortOrder: row.sortOrder,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .returning()
        .get()

      if (!createdRow) {
        throw new Error('Failed to create venue row')
      }

      await tx.insert(tables.venueSeats).values(
        row.seats.map(seat => ({
          rowId: createdRow.id,
          label: seat.label,
          seatNumber: seat.seatNumber,
          x: seat.x,
          y: seat.y,
          sortOrder: seat.sortOrder,
          accessibilityLabel: seat.accessibilityLabel ?? null,
          isAccessible: seat.isAccessible,
          createdAt: timestamp,
          updatedAt: timestamp,
        })),
      )
    }
  }
}

export default VenueService.getInstance()
