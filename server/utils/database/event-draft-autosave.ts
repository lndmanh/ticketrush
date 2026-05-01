import { eq } from 'drizzle-orm'
import { eventAutosaveDraftSchema } from '#shared/schemas/ticketingSchema'
import type { EventAutosaveDraftInput } from '#shared/schemas/ticketingSchema'

function createDraftKey() {
  return `event_draft_${crypto.randomUUID()}`
}

class EventDraftAutosaveService {
  private get db() {
    return useDB()
  }

  async save(input: EventAutosaveDraftInput) {
    const draft = eventAutosaveDraftSchema.parse(input)
    const draftKey = draft.draftKey && draft.draftKey.length > 0 ? draft.draftKey : createDraftKey()
    const payload = JSON.stringify(draft.payload)
    const now = new Date()

    const existing = await this.db
      .select()
      .from(tables.eventDraftAutosaves)
      .where(eq(tables.eventDraftAutosaves.draftKey, draftKey))
      .get()

    if (existing) {
      const updated = await this.db
        .update(tables.eventDraftAutosaves)
        .set({
          payload,
          lastSavedStep: draft.lastSavedStep,
          updatedAt: now,
        })
        .where(eq(tables.eventDraftAutosaves.draftKey, draftKey))
        .returning()
        .get()

      if (!updated) {
        throw new Error('Failed to update event autosave draft')
      }

      return updated
    }

    const created = await this.db
      .insert(tables.eventDraftAutosaves)
      .values({
        draftKey,
        payload,
        lastSavedStep: draft.lastSavedStep,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get()

    if (!created) {
      throw new Error('Failed to create event autosave draft')
    }

    return created
  }
}

export default new EventDraftAutosaveService()
