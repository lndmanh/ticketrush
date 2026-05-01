import type { tables } from '~~/server/utils/db'

export type User = typeof tables.users.$inferSelect
export type DBPasskey = typeof tables.credentials.$inferSelect
export type DBOAuthAccount = typeof tables.oauthAccounts.$inferSelect
export type Venue = typeof tables.venues.$inferSelect
export type EventSession = typeof tables.eventSessions.$inferSelect
export type VenueSection = typeof tables.venueSections.$inferSelect
export type VenueRow = typeof tables.venueRows.$inferSelect
export type VenueSeat = typeof tables.venueSeats.$inferSelect
export type Event = typeof tables.events.$inferSelect
export type SystemSetting = typeof tables.systemSettings.$inferSelect
export type EventDraftAutosave = typeof tables.eventDraftAutosaves.$inferSelect
export type TicketType = typeof tables.ticketTypes.$inferSelect
export type EventSeat = typeof tables.eventSeats.$inferSelect
export type SeatHold = typeof tables.seatHolds.$inferSelect
export type Order = typeof tables.orders.$inferSelect
export type OrderItem = typeof tables.orderItems.$inferSelect
export type Ticket = typeof tables.tickets.$inferSelect
export type QueueEntry = typeof tables.queueEntries.$inferSelect
export type EventMetricBucket = typeof tables.eventMetricBuckets.$inferSelect
