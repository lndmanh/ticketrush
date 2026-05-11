import { and, eq, inArray } from 'drizzle-orm'
import type { Venue } from '#shared/db'
import type { CreateVenueInput, UpdateVenueInput, VenueRowDraftInput, VenueSeatDraftInput, VenueSectionDraftInput, VenueTranslationInput } from '#shared/schemas/ticketingSchema'
import { IDatabaseService } from '~~/types/db/database-service'
import { createPublicVenueId } from '~~/server/utils/ticketing/ids'
import type { VenueDetail } from '~~/types/venues'
import { sourceLocale } from '~~/i18n-constants'
import { localizeVenue, normalizeTranslationText, resolveContentLocale } from '~~/server/utils/i18n/content-localization'

const D1_INSERT_BATCH_SIZE = 5
type VenueTransaction = ReturnType<typeof useDB>

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

  async getDetail(id: number, locale: string = sourceLocale): Promise<VenueDetail | undefined> {
    const venue = await this.getById(id)
    if (!venue) {
      return undefined
    }

    const contentLocale = resolveContentLocale(locale)
    const translation = contentLocale === sourceLocale
      ? undefined
      : await this.db
          .select()
          .from(tables.venueTranslations)
          .where(and(
            eq(tables.venueTranslations.venueId, id),
            eq(tables.venueTranslations.locale, contentLocale),
          ))
          .get()

    const sections = await this.db
      .select()
      .from(tables.venueSections)
      .where(and(
        eq(tables.venueSections.venueId, id),
        eq(tables.venueSections.layoutVersion, venue.layoutVersion),
      ))
      .all()

    const sectionIds = sections.map(section => section.id)
    const rows = sectionIds.length > 0
      ? await this.db
          .select()
          .from(tables.venueRows)
          .where(and(
            inArray(tables.venueRows.sectionId, sectionIds),
            eq(tables.venueRows.layoutVersion, venue.layoutVersion),
          ))
          .all()
      : []

    const rowIds = rows.map(row => row.id)
    const seats = rowIds.length > 0
      ? await this.db
          .select()
          .from(tables.venueSeats)
          .where(and(
            inArray(tables.venueSeats.rowId, rowIds),
            eq(tables.venueSeats.layoutVersion, venue.layoutVersion),
          ))
          .all()
      : []

    return {
      venue: localizeVenue(venue, translation),
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
    this.validateSubmittedLineage(data.sections)

    const db = this.db
    const createdVenue = await db
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
        layoutVersion: 1,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get()

    if (!createdVenue) {
      throw new Error('Failed to create venue')
    }

    try {
      await this.insertVenueTree(db, createdVenue.id, createdVenue.layoutVersion, data.sections, now, false)
    }
    catch (error) {
      await db.delete(tables.venues).where(eq(tables.venues.id, createdVenue.id))
      throw error
    }

    return createdVenue
  }

  async update(data: UpdateVenueInput) {
    const now = new Date()
    this.validateSubmittedLineage(data.sections)

    const db = this.db
    const currentVenue = await this.getById(data.id)
    if (!currentVenue) {
      throw new Error('Venue not found')
    }

    const currentTree = await this.loadVenueLayoutTree(db, data.id, currentVenue.layoutVersion)
    this.validateLineageAgainstCurrentTree(currentTree, data.sections)
    const layoutChanged = this.hasLayoutChanged(currentTree, data.sections)

    const updatedVenue = await db
      .update(tables.venues)
      .set({
        slug: data.slug,
        name: data.name,
        description: data.description ?? null,
        city: data.city,
        country: data.country,
        address: data.address,
        coverImage: data.coverImage || null,
        updatedAt: now,
      })
      .where(eq(tables.venues.id, data.id))
      .returning()
      .get()

    if (!updatedVenue) {
      throw new Error('Venue not found')
    }

    if (layoutChanged) {
      const nextLayoutVersion = currentVenue.layoutVersion + 1
      try {
        await this.insertVenueTree(db, data.id, nextLayoutVersion, data.sections, now, true)

        await db
          .update(tables.venues)
          .set({
            capacity: this.calculateCapacity(data.sections),
            layoutVersion: nextLayoutVersion,
            updatedAt: now,
          })
          .where(eq(tables.venues.id, data.id))
      }
      catch (error) {
        await this.deleteVenueLayoutSnapshot(db, data.id, nextLayoutVersion)
        throw error
      }
    }
    else {
      await db
        .update(tables.venues)
        .set({
          capacity: this.calculateCapacity(data.sections),
          updatedAt: now,
        })
        .where(eq(tables.venues.id, data.id))
    }

    return updatedVenue
  }

  async getTranslations(venueId: number) {
    return this.db
      .select()
      .from(tables.venueTranslations)
      .where(eq(tables.venueTranslations.venueId, venueId))
      .all()
  }

  async saveTranslation(venueId: number, input: VenueTranslationInput) {
    const now = new Date()
    const existingTranslation = await this.db
      .select()
      .from(tables.venueTranslations)
      .where(and(
        eq(tables.venueTranslations.venueId, venueId),
        eq(tables.venueTranslations.locale, input.locale),
      ))
      .get()

    const translationValues = {
      name: normalizeTranslationText(input.name),
      description: normalizeTranslationText(input.description),
      city: normalizeTranslationText(input.city),
      address: normalizeTranslationText(input.address),
      updatedAt: now,
    }

    if (existingTranslation) {
      await this.db
        .update(tables.venueTranslations)
        .set(translationValues)
        .where(eq(tables.venueTranslations.id, existingTranslation.id))
    }
    else {
      await this.db
        .insert(tables.venueTranslations)
        .values({
          venueId,
          locale: input.locale,
          ...translationValues,
          createdAt: now,
        })
    }

    return this.getTranslations(venueId)
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
    tx: VenueTransaction,
    venueId: number,
    layoutVersion: number,
    sections: VenueSectionDraftInput[],
    timestamp: Date,
    preserveLineage: boolean,
  ) {
    for (const section of sections) {
      const createdSection = await tx
        .insert(tables.venueSections)
        .values({
          venueId,
          layoutVersion,
          previousSectionId: preserveLineage ? section.id ?? null : null,
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

      await this.insertRows(tx, createdSection.id, layoutVersion, section.rows, timestamp, preserveLineage)
    }
  }

  private async deleteVenueLayoutSnapshot(tx: VenueTransaction, venueId: number, layoutVersion: number) {
    await tx.delete(tables.venueSections).where(and(
      eq(tables.venueSections.venueId, venueId),
      eq(tables.venueSections.layoutVersion, layoutVersion),
    ))
  }

  private async insertRows(
    tx: VenueTransaction,
    sectionId: number,
    layoutVersion: number,
    rows: VenueRowDraftInput[],
    timestamp: Date,
    preserveLineage: boolean,
  ) {
    for (const row of rows) {
      const createdRow = await tx
        .insert(tables.venueRows)
        .values({
          sectionId,
          layoutVersion,
          previousRowId: preserveLineage ? row.id ?? null : null,
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

      for (let start = 0; start < row.seats.length; start += D1_INSERT_BATCH_SIZE) {
        const seatBatch = row.seats.slice(start, start + D1_INSERT_BATCH_SIZE)
        await tx.insert(tables.venueSeats).values(
          seatBatch.map(seat => ({
            rowId: createdRow.id,
            layoutVersion,
            previousSeatId: preserveLineage ? seat.id ?? null : null,
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

  private validateSubmittedLineage(sections: VenueSectionDraftInput[]) {
    const sectionIds = new Set<number>()
    for (const section of sections) {
      if (section.id && sectionIds.has(section.id)) {
        throw new Error('Duplicate submitted section IDs are not allowed')
      }
      if (section.id) {
        sectionIds.add(section.id)
      }

      const rowIds = new Set<number>()
      for (const row of section.rows) {
        if (row.id && rowIds.has(row.id)) {
          throw new Error('Duplicate submitted row IDs are not allowed')
        }
        if (row.id) {
          rowIds.add(row.id)
        }

        const seatIds = new Set<number>()
        for (const seat of row.seats) {
          if (seat.id && seatIds.has(seat.id)) {
            throw new Error('Duplicate submitted seat IDs are not allowed')
          }
          if (seat.id) {
            seatIds.add(seat.id)
          }
        }
      }
    }
  }

  private async loadVenueLayoutTree(tx: VenueTransaction, venueId: number, layoutVersion: number) {
    const sections = await tx
      .select()
      .from(tables.venueSections)
      .where(and(
        eq(tables.venueSections.venueId, venueId),
        eq(tables.venueSections.layoutVersion, layoutVersion),
      ))
      .all()

    const sectionIds = sections.map(section => section.id)
    const rows = sectionIds.length > 0
      ? await tx
          .select()
          .from(tables.venueRows)
          .where(and(
            inArray(tables.venueRows.sectionId, sectionIds),
            eq(tables.venueRows.layoutVersion, layoutVersion),
          ))
          .all()
      : []

    const rowIds = rows.map(row => row.id)
    const seats = rowIds.length > 0
      ? await tx
          .select()
          .from(tables.venueSeats)
          .where(and(
            inArray(tables.venueSeats.rowId, rowIds),
            eq(tables.venueSeats.layoutVersion, layoutVersion),
          ))
          .all()
      : []

    return { sections, rows, seats }
  }

  private normalizeLayoutForComparison(sections: Array<typeof tables.venueSections.$inferSelect>, rows: Array<typeof tables.venueRows.$inferSelect>, seats: Array<typeof tables.venueSeats.$inferSelect>) {
    return sections
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map(section => ({
        code: section.code,
        name: section.name,
        color: section.color,
        sortOrder: section.sortOrder,
        rows: rows
          .filter(row => row.sectionId === section.id)
          .sort((left, right) => left.sortOrder - right.sortOrder)
          .map(row => ({
            label: row.label,
            sortOrder: row.sortOrder,
            seats: seats
              .filter(seat => seat.rowId === row.id)
              .sort((left, right) => left.sortOrder - right.sortOrder)
              .map(seat => ({
                label: seat.label,
                seatNumber: seat.seatNumber,
                x: seat.x,
                y: seat.y,
                sortOrder: seat.sortOrder,
                accessibilityLabel: seat.accessibilityLabel ?? '',
                isAccessible: seat.isAccessible,
              })),
          })),
      }))
  }

  private normalizeSubmittedLayout(sections: VenueSectionDraftInput[]) {
    return sections.map(section => ({
      code: section.code,
      name: section.name,
      color: section.color,
      sortOrder: section.sortOrder,
      rows: section.rows.map(row => ({
        label: row.label,
        sortOrder: row.sortOrder,
        seats: row.seats.map(seat => ({
          label: seat.label,
          seatNumber: seat.seatNumber,
          x: seat.x,
          y: seat.y,
          sortOrder: seat.sortOrder,
          accessibilityLabel: seat.accessibilityLabel ?? '',
          isAccessible: seat.isAccessible,
        })),
      })),
    }))
  }

  private hasLayoutChanged(currentTree: { sections: Array<typeof tables.venueSections.$inferSelect>, rows: Array<typeof tables.venueRows.$inferSelect>, seats: Array<typeof tables.venueSeats.$inferSelect> }, sections: VenueSectionDraftInput[]) {
    return JSON.stringify(this.normalizeLayoutForComparison(currentTree.sections, currentTree.rows, currentTree.seats)) !== JSON.stringify(this.normalizeSubmittedLayout(sections))
  }

  private validateLineageAgainstCurrentTree(currentTree: { sections: Array<typeof tables.venueSections.$inferSelect>, rows: Array<typeof tables.venueRows.$inferSelect>, seats: Array<typeof tables.venueSeats.$inferSelect> }, sections: VenueSectionDraftInput[]) {
    const sectionsById = new Map<number, typeof currentTree.sections[number]>()
    for (const section of currentTree.sections) {
      sectionsById.set(section.id, section)
    }

    const rowsById = new Map<number, typeof currentTree.rows[number]>()
    for (const row of currentTree.rows) {
      rowsById.set(row.id, row)
    }

    const seatsById = new Map<number, typeof currentTree.seats[number]>()
    for (const seat of currentTree.seats) {
      seatsById.set(seat.id, seat)
    }

    for (const section of sections) {
      if (section.id) {
        const currentSection = sectionsById.get(section.id)
        if (!currentSection) {
          throw new Error('Submitted section does not belong to the current venue layout')
        }
      }

      for (const row of section.rows) {
        if (row.id) {
          const currentRow = rowsById.get(row.id)
          if (!currentRow) {
            throw new Error('Submitted row does not belong to the current venue layout')
          }

          if (!section.id || currentRow.sectionId !== section.id) {
            throw new Error('Submitted row does not belong to the current venue layout')
          }
        }

        for (const seat of row.seats) {
          if (seat.id) {
            const currentSeat = seatsById.get(seat.id)
            if (!currentSeat) {
              throw new Error('Submitted seat does not belong to the current venue layout')
            }

            if (!row.id || currentSeat.rowId !== row.id) {
              throw new Error('Submitted seat does not belong to the current venue layout')
            }
          }
        }
      }
    }
  }
}

export default VenueService.getInstance()
