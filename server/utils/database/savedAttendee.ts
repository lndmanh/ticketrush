import { and, eq } from 'drizzle-orm'
import type { CreateSavedAttendeeInput, UpdateSavedAttendeeInput, SavedAttendeeGender } from '#shared/schemas/savedAttendeeSchema'
import type { SavedAttendeeModel } from '~~/types/models/saved-attendee'

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
    const rows = await this.db
      .select()
      .from(tables.savedAttendees)
      .where(eq(tables.savedAttendees.userId, userId))
      .all()

    return rows.map(toModel)
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
    if (input.isSelf) {
      await tx
        .update(tables.savedAttendees)
        .set({ isSelf: false, updatedAt: now })
        .where(and(eq(tables.savedAttendees.userId, userId), eq(tables.savedAttendees.isSelf, true)))
    }

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
      isSelf: input.isSelf ?? false,
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

    if (input.isSelf) {
      await tx
        .update(tables.savedAttendees)
        .set({ isSelf: false, updatedAt: now })
        .where(and(eq(tables.savedAttendees.userId, userId), eq(tables.savedAttendees.isSelf, true)))
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
      isSelf: input.isSelf ?? existing.isSelf,
      updatedAt: now,
    }).where(and(eq(tables.savedAttendees.id, input.id), eq(tables.savedAttendees.userId, userId))).returning().get()

    return row ? toModel(row) : null
  }

  async delete(userId: number, id: number): Promise<boolean> {
    const db = this.db
    const existing = await db
      .select()
      .from(tables.savedAttendees)
      .where(and(eq(tables.savedAttendees.id, id), eq(tables.savedAttendees.userId, userId)))
      .get()

    if (!existing) {
      return false
    }

    await db
      .update(tables.tickets)
      .set({ savedAttendeeId: null })
      .where(eq(tables.tickets.savedAttendeeId, id))

    await db.delete(tables.savedAttendees).where(and(eq(tables.savedAttendees.id, id), eq(tables.savedAttendees.userId, userId)))

    return true
  }
}

export default SavedAttendeeService.getInstance()
