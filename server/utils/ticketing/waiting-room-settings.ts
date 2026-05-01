import { eq } from 'drizzle-orm'
import { waitingRoomSettingsSchema } from '#shared/schemas/ticketingSchema'
import type { WaitingRoomSettingsInput } from '#shared/schemas/ticketingSchema'

const WAITING_ROOM_SETTINGS_KEY = 'waiting-room'

export const DEFAULT_WAITING_ROOM_SETTINGS: WaitingRoomSettingsInput = {
  queueActivationThreshold: 250,
  queueBatchSize: 50,
  queueWindowSeconds: 180,
}

class WaitingRoomSettingsService {
  private get db() {
    return useDB()
  }

  async getSettings() {
    const row = await this.db
      .select()
      .from(tables.systemSettings)
      .where(eq(tables.systemSettings.key, WAITING_ROOM_SETTINGS_KEY))
      .get()

    if (!row) {
      return this.updateSettings(DEFAULT_WAITING_ROOM_SETTINGS)
    }

    try {
      const parsed = waitingRoomSettingsSchema.safeParse(JSON.parse(row.value))
      if (parsed.success) {
        return parsed.data
      }
    }
    catch {
      return DEFAULT_WAITING_ROOM_SETTINGS
    }

    return DEFAULT_WAITING_ROOM_SETTINGS
  }

  async updateSettings(input: WaitingRoomSettingsInput) {
    const settings = waitingRoomSettingsSchema.parse(input)
    const now = new Date()
    const payload = JSON.stringify(settings)
    const existing = await this.db
      .select()
      .from(tables.systemSettings)
      .where(eq(tables.systemSettings.key, WAITING_ROOM_SETTINGS_KEY))
      .get()

    if (existing) {
      await this.db
        .update(tables.systemSettings)
        .set({
          value: payload,
          updatedAt: now,
        })
        .where(eq(tables.systemSettings.key, WAITING_ROOM_SETTINGS_KEY))
    }
    else {
      await this.db
        .insert(tables.systemSettings)
        .values({
          key: WAITING_ROOM_SETTINGS_KEY,
          value: payload,
          createdAt: now,
          updatedAt: now,
        })
    }

    return settings
  }
}

export default new WaitingRoomSettingsService()
