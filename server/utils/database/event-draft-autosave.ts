import { and, eq } from 'drizzle-orm'
import { eventAutosaveDraftSchema } from '#shared/schemas/ticketingSchema'
import type { EventAutosaveDraftInput } from '#shared/schemas/ticketingSchema'
import { EventDraftAutosaveStatus } from '#shared/commonEnums'

function createDraftKey(userId: number) {
  return `event_draft_user_${userId}_active`
}

class EventDraftAutosaveService {
  private get db() {
    return useDB()
  }

  private async updateActiveDraft(id: number, userId: number, input: {
    titleSnapshot: string | null
    slugSnapshot: string | null
    venueId: number | null
    payload: string
    lastSavedStep: number
    updatedAt: Date
  }) {
    return this.db
      .update(tables.eventDraftAutosaves)
      .set({
        titleSnapshot: input.titleSnapshot,
        slugSnapshot: input.slugSnapshot,
        venueId: input.venueId,
        payload: input.payload,
        lastSavedStep: input.lastSavedStep,
        updatedAt: input.updatedAt,
      })
      .where(and(
        eq(tables.eventDraftAutosaves.id, id),
        eq(tables.eventDraftAutosaves.userId, userId),
        eq(tables.eventDraftAutosaves.status, EventDraftAutosaveStatus.Active),
      ))
      .returning()
      .get()
  }

  async save(input: EventAutosaveDraftInput, userId: number) {
    const draft = eventAutosaveDraftSchema.parse(input)
    const payload = JSON.stringify(draft.payload)
    const now = new Date()
    const titleSnapshot = draft.payload.title?.trim() || null
    const slugSnapshot = draft.payload.slug?.trim() || null
    const venueId = draft.payload.venueId && draft.payload.venueId > 0 ? draft.payload.venueId : null

    const existing = await this.db
      .select()
      .from(tables.eventDraftAutosaves)
      .where(and(
        eq(tables.eventDraftAutosaves.userId, userId),
        eq(tables.eventDraftAutosaves.status, EventDraftAutosaveStatus.Active),
      ))
      .get()

    if (existing) {
      const updated = await this.updateActiveDraft(existing.id, userId, {
        titleSnapshot,
        slugSnapshot,
        venueId,
        payload,
        lastSavedStep: draft.lastSavedStep,
        updatedAt: now,
      })

      if (!updated) {
        throw new Error('Autosave draft is no longer active')
      }

      return updated
    }

    const draftKey = createDraftKey(userId)

    let created = null
    try {
      created = await this.db
        .insert(tables.eventDraftAutosaves)
        .values({
          draftKey,
          userId,
          status: EventDraftAutosaveStatus.Active,
          convertedEventId: null,
          titleSnapshot,
          slugSnapshot,
          venueId,
          payload,
          lastSavedStep: draft.lastSavedStep,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
        .get()
    }
    catch {
      const active = await this.getActiveByUserId(userId)
      if (active) {
        const updated = await this.updateActiveDraft(active.id, userId, {
          titleSnapshot,
          slugSnapshot,
          venueId,
          payload,
          lastSavedStep: draft.lastSavedStep,
          updatedAt: now,
        })

        if (updated) {
          return updated
        }
      }
    }

    if (!created) {
      throw new Error('Failed to create event autosave draft')
    }

    return created
  }

  async getActiveByUserId(userId: number) {
    return this.db
      .select()
      .from(tables.eventDraftAutosaves)
      .where(and(
        eq(tables.eventDraftAutosaves.userId, userId),
        eq(tables.eventDraftAutosaves.status, EventDraftAutosaveStatus.Active),
      ))
      .get()
  }

  async getActiveByDraftKey(draftKey: string, userId: number) {
    return this.db
      .select()
      .from(tables.eventDraftAutosaves)
      .where(and(
        eq(tables.eventDraftAutosaves.draftKey, draftKey),
        eq(tables.eventDraftAutosaves.userId, userId),
        eq(tables.eventDraftAutosaves.status, EventDraftAutosaveStatus.Active),
      ))
      .get()
  }

  async markDiscarded(draftKey: string, userId: number) {
    const now = new Date()
    return this.db
      .update(tables.eventDraftAutosaves)
      .set({
        draftKey: `${draftKey}_discarded_${now.getTime()}`,
        status: EventDraftAutosaveStatus.Discarded,
        updatedAt: now,
      })
      .where(and(
        eq(tables.eventDraftAutosaves.draftKey, draftKey),
        eq(tables.eventDraftAutosaves.userId, userId),
        eq(tables.eventDraftAutosaves.status, EventDraftAutosaveStatus.Active),
      ))
      .returning()
      .get()
  }

  async markConverted(draftKey: string, userId: number, eventId: number) {
    const now = new Date()
    return this.db
      .update(tables.eventDraftAutosaves)
      .set({
        draftKey: `${draftKey}_converted_${eventId}`,
        status: EventDraftAutosaveStatus.Converted,
        convertedEventId: eventId,
        updatedAt: now,
      })
      .where(and(
        eq(tables.eventDraftAutosaves.draftKey, draftKey),
        eq(tables.eventDraftAutosaves.userId, userId),
        eq(tables.eventDraftAutosaves.status, EventDraftAutosaveStatus.Active),
      ))
      .returning()
      .get()
  }
}

export default new EventDraftAutosaveService()
