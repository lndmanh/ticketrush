import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import type { CreateSavedAttendeeInput, UpdateSavedAttendeeInput, SavedAttendeeGender } from '#shared/schemas/savedAttendeeSchema'
import { getMissingSelfAttendeeFields } from '#shared/utils/selfAttendee'
import type { SavedAttendeeModel, SelfAttendeeStatusModel } from '~~/types/models/saved-attendee'

type DeleteSavedAttendeeResult = 'deleted' | 'not-found' | 'self-attendee'

type SavedAttendeeRow = typeof tables.savedAttendees.$inferSelect
type Transaction = ReturnType<typeof useDB>

function cleanText(value: string | null | undefined) {
  if (value === undefined || value === null) {
    return null
  }

  const text = value.trim()
  return text ? text : null
}

function cleanTextValue(value: string | null | undefined, current: string | null) {
  if (value === undefined) {
    return current
  }

  return cleanText(value)
}

function cleanGender(value: SavedAttendeeGender | null | undefined) {
  if (value === undefined) {
    return null
  }

  return value
}

function cleanGenderValue(value: SavedAttendeeGender | null | undefined, current: SavedAttendeeGender | null) {
  if (value === undefined) {
    return current
  }

  return cleanGender(value)
}

function getTimestamp(value: Date | null) {
  return value?.getTime() ?? 0
}

function getSelfCompletenessScore(row: SavedAttendeeRow) {
  return getMissingSelfAttendeeFields({
    legalName: row.legalName,
    email: row.email,
    phone: row.phone,
    birthDate: row.birthDate,
    gender: row.gender,
  }).length
}

function chooseCanonicalSelfAttendee(rows: SavedAttendeeRow[]) {
  return [...rows].sort((left, right) => {
    const scoreDelta = getSelfCompletenessScore(left) - getSelfCompletenessScore(right)
    if (scoreDelta !== 0) {
      return scoreDelta
    }

    const updatedDelta = getTimestamp(right.updatedAt) - getTimestamp(left.updatedAt)
    if (updatedDelta !== 0) {
      return updatedDelta
    }

    return left.id - right.id
  })[0] ?? null
}

function toModel(row: SavedAttendeeRow): SavedAttendeeModel {
  return {
    id: row.id,
    userId: row.userId,
    legalName: row.legalName,
    preferredName: row.preferredName,
    email: row.email,
    phone: row.phone,
    birthDate: row.birthDate,
    gender: row.gender,
    guardianName: row.guardianName,
    guardianEmail: row.guardianEmail,
    guardianPhone: row.guardianPhone,
    notes: row.notes,
    accessibilityNeeds: row.accessibilityNeeds,
    isSelf: row.isSelf,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

class SavedAttendeeService {
  private static instance: SavedAttendeeService

  private get db() {
    return useDB()
  }

  public static getInstance(): SavedAttendeeService {
    if (!SavedAttendeeService.instance) {
      SavedAttendeeService.instance = new SavedAttendeeService()
    }

    return SavedAttendeeService.instance
  }

  async listForUser(userId: number): Promise<SavedAttendeeModel[]> {
    const selfAttendee = await this.ensureSelfAttendee(userId)
    const rows = await this.db
      .select()
      .from(tables.savedAttendees)
      .where(eq(tables.savedAttendees.userId, userId))
      .orderBy(desc(tables.savedAttendees.isSelf), asc(tables.savedAttendees.id))
      .all()

    const orderedRows = rows.filter(row => row.id !== selfAttendee.id && !row.isSelf)
    return [selfAttendee, ...orderedRows.map(toModel)]
  }

  async ensureSelfAttendee(userId: number, now = new Date()): Promise<SavedAttendeeModel> {
    const rows = await this.db
      .select()
      .from(tables.savedAttendees)
      .where(and(eq(tables.savedAttendees.userId, userId), eq(tables.savedAttendees.isSelf, true)))
      .orderBy(asc(tables.savedAttendees.id))
      .all()

    const canonical = chooseCanonicalSelfAttendee(rows)

    if (canonical) {
      const duplicateIds = rows.filter(row => row.id !== canonical.id).map(row => row.id)
      if (duplicateIds.length > 0) {
        await this.db
          .update(tables.savedAttendees)
          .set({ isSelf: false, updatedAt: now })
          .where(and(eq(tables.savedAttendees.userId, userId), inArray(tables.savedAttendees.id, duplicateIds)))
      }

      const refreshedRows = await this.db
        .select()
        .from(tables.savedAttendees)
        .where(and(eq(tables.savedAttendees.userId, userId), eq(tables.savedAttendees.isSelf, true)))
        .orderBy(asc(tables.savedAttendees.id))
        .all()

      const refreshedCanonical = chooseCanonicalSelfAttendee(refreshedRows)

      if (refreshedCanonical) {
        const refreshedDuplicateIds = refreshedRows.filter(row => row.id !== refreshedCanonical.id).map(row => row.id)
        if (refreshedDuplicateIds.length > 0) {
          await this.db
            .update(tables.savedAttendees)
            .set({ isSelf: false, updatedAt: now })
            .where(and(eq(tables.savedAttendees.userId, userId), inArray(tables.savedAttendees.id, refreshedDuplicateIds)))
        }

        return toModel(refreshedCanonical)
      }

      return toModel(canonical)
    }

    const user = await this.db
      .select({ name: tables.users.name, email: tables.users.email })
      .from(tables.users)
      .where(eq(tables.users.id, userId))
      .get()

    if (!user) {
      throw new Error('Cannot create a self attendee for a missing user')
    }

    const row = await this.db.insert(tables.savedAttendees).values({
      userId,
      legalName: user.name.trim(),
      preferredName: null,
      email: user.email.trim(),
      phone: null,
      birthDate: null,
      gender: null,
      guardianName: null,
      guardianEmail: null,
      guardianPhone: null,
      notes: null,
      accessibilityNeeds: null,
      isSelf: true,
      createdAt: now,
      updatedAt: now,
    }).returning().get()

    if (!row) {
      throw new Error('Failed to create self attendee')
    }

    const refreshedRows = await this.db
      .select()
      .from(tables.savedAttendees)
      .where(and(eq(tables.savedAttendees.userId, userId), eq(tables.savedAttendees.isSelf, true)))
      .orderBy(asc(tables.savedAttendees.id))
      .all()

    const refreshedCanonical = chooseCanonicalSelfAttendee(refreshedRows)

    if (!refreshedCanonical) {
      throw new Error('Failed to create self attendee')
    }

    const duplicateIds = refreshedRows.filter(savedAttendee => savedAttendee.id !== refreshedCanonical.id).map(savedAttendee => savedAttendee.id)
    if (duplicateIds.length > 0) {
      await this.db
        .update(tables.savedAttendees)
        .set({ isSelf: false, updatedAt: now })
        .where(and(eq(tables.savedAttendees.userId, userId), inArray(tables.savedAttendees.id, duplicateIds)))
    }

    return toModel(refreshedCanonical)
  }

  async getSelfAttendeeStatus(userId: number): Promise<SelfAttendeeStatusModel> {
    const attendee = await this.ensureSelfAttendee(userId)
    const missingFields = getMissingSelfAttendeeFields({
      legalName: attendee.legalName,
      email: attendee.email,
      phone: attendee.phone,
      birthDate: attendee.birthDate,
      gender: attendee.gender,
    })

    return {
      attendee,
      missingFields,
      isComplete: missingFields.length === 0,
    }
  }

  async getForUser(id: number, userId: number): Promise<SavedAttendeeModel | null> {
    const row = await this.db
      .select()
      .from(tables.savedAttendees)
      .where(and(eq(tables.savedAttendees.id, id), eq(tables.savedAttendees.userId, userId)))
      .get()

    return row ? toModel(row) : null
  }

  async create(userId: number, input: CreateSavedAttendeeInput): Promise<SavedAttendeeModel> {
    return this.createInTransaction(this.db, userId, input)
  }

  async createInTransaction(tx: Transaction, userId: number, input: CreateSavedAttendeeInput, now = new Date()) {
    const row = await tx.insert(tables.savedAttendees).values({
      userId,
      legalName: input.legalName.trim(),
      preferredName: cleanText(input.preferredName),
      email: cleanText(input.email),
      phone: cleanText(input.phone),
      birthDate: input.birthDate ?? null,
      gender: input.gender ?? null,
      guardianName: cleanText(input.guardianName),
      guardianEmail: cleanText(input.guardianEmail),
      guardianPhone: cleanText(input.guardianPhone),
      notes: cleanText(input.notes),
      accessibilityNeeds: cleanText(input.accessibilityNeeds),
      isSelf: false,
      createdAt: now,
      updatedAt: now,
    }).returning().get()

    if (!row) {
      throw new Error('Failed to create saved attendee')
    }

    return toModel(row)
  }

  async update(userId: number, input: UpdateSavedAttendeeInput): Promise<SavedAttendeeModel | null> {
    return this.updateInTransaction(this.db, userId, input)
  }

  async updateInTransaction(tx: Transaction, userId: number, input: UpdateSavedAttendeeInput, now = new Date()) {
    const existing = await tx
      .select()
      .from(tables.savedAttendees)
      .where(and(eq(tables.savedAttendees.id, input.id), eq(tables.savedAttendees.userId, userId)))
      .get()

    if (!existing) {
      return null
    }

    const row = await tx.update(tables.savedAttendees).set({
      legalName: input.legalName?.trim() ?? existing.legalName,
      preferredName: cleanTextValue(input.preferredName, existing.preferredName),
      email: cleanTextValue(input.email, existing.email),
      phone: cleanTextValue(input.phone, existing.phone),
      birthDate: input.birthDate === undefined ? existing.birthDate : input.birthDate,
      gender: cleanGenderValue(input.gender, existing.gender),
      guardianName: cleanTextValue(input.guardianName, existing.guardianName),
      guardianEmail: cleanTextValue(input.guardianEmail, existing.guardianEmail),
      guardianPhone: cleanTextValue(input.guardianPhone, existing.guardianPhone),
      notes: cleanTextValue(input.notes, existing.notes),
      accessibilityNeeds: cleanTextValue(input.accessibilityNeeds, existing.accessibilityNeeds),
      isSelf: existing.isSelf,
      updatedAt: now,
    }).where(and(eq(tables.savedAttendees.id, input.id), eq(tables.savedAttendees.userId, userId))).returning().get()

    return row ? toModel(row) : null
  }

  async delete(userId: number, id: number): Promise<DeleteSavedAttendeeResult> {
    const db = this.db
    const existing = await db
      .select()
      .from(tables.savedAttendees)
      .where(and(eq(tables.savedAttendees.id, id), eq(tables.savedAttendees.userId, userId)))
      .get()

    if (!existing) {
      return 'not-found'
    }

    if (existing.isSelf) {
      return 'self-attendee'
    }

    await db
      .update(tables.tickets)
      .set({ savedAttendeeId: null })
      .where(eq(tables.tickets.savedAttendeeId, id))

    await db.delete(tables.savedAttendees).where(and(eq(tables.savedAttendees.id, id), eq(tables.savedAttendees.userId, userId)))

    return 'deleted'
  }
}

export default SavedAttendeeService.getInstance()
