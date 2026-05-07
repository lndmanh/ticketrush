import { sqliteTable, text, integer, unique, index, foreignKey } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'
import type { WebAuthnCredential } from '#auth-utils'
import type { SavedAttendeeGender } from '#shared/schemas/savedAttendeeSchema'

const timestampColumns = {
  createdAt: integer('created_at', { mode: 'timestamp' })
    .$defaultFn(() => new Date()), // Auto-set on create
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .$defaultFn(() => new Date()), // Auto-set on create (needs trigger or manual update for 'on update')
}

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  name: text('name').notNull(),
  password: text('password').notNull(),
  email: text('email').notNull().unique(),
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  lastLoginAt: integer('last_login_at', { mode: 'timestamp' }), // Can be null if never logged in
  phone: text('phone'),
  birthDate: integer('birth_date', { mode: 'timestamp' }),
  gender: text('gender').$type<SavedAttendeeGender>(),
  ...timestampColumns,
})

export const savedAttendees = sqliteTable('saved_attendees', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  legalName: text('legal_name').notNull(),
  preferredName: text('preferred_name'),
  email: text('email'),
  phone: text('phone'),
  birthDate: integer('birth_date', { mode: 'timestamp' }),
  gender: text('gender').$type<SavedAttendeeGender>(),
  guardianName: text('guardian_name'),
  guardianEmail: text('guardian_email'),
  guardianPhone: text('guardian_phone'),
  notes: text('notes'),
  accessibilityNeeds: text('accessibility_needs'),
  isSelf: integer('is_self', { mode: 'boolean' }).notNull().default(false),
  ...timestampColumns,
}, table => [
  index('saved_attendees_user_idx').on(table.userId),
  index('saved_attendees_user_self_idx').on(table.userId, table.isSelf),
])

export const venues = sqliteTable('venues', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  publicId: text('public_id').notNull().unique(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  city: text('city').notNull(),
  country: text('country').notNull().default('Vietnam'),
  address: text('address').notNull(),
  capacity: integer('capacity').notNull().default(0),
  coverImage: text('cover_image'),
  ...timestampColumns,
})

export const venueSections = sqliteTable('venue_sections', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  venueId: integer('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
  code: text('code').notNull(),
  name: text('name').notNull(),
  color: text('color').notNull().default('#8B5CF6'),
  sortOrder: integer('sort_order').notNull().default(0),
  ...timestampColumns,
}, table => [
  unique().on(table.venueId, table.code),
  index('venue_sections_venue_idx').on(table.venueId),
])

export const venueRows = sqliteTable('venue_rows', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sectionId: integer('section_id').notNull().references(() => venueSections.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  ...timestampColumns,
}, table => [
  unique().on(table.sectionId, table.label),
  index('venue_rows_section_idx').on(table.sectionId),
])

export const venueSeats = sqliteTable('venue_seats', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  rowId: integer('row_id').notNull().references(() => venueRows.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  seatNumber: integer('seat_number').notNull(),
  x: integer('x').notNull().default(0),
  y: integer('y').notNull().default(0),
  sortOrder: integer('sort_order').notNull().default(0),
  accessibilityLabel: text('accessibility_label'),
  isAccessible: integer('is_accessible', { mode: 'boolean' }).notNull().default(false),
  ...timestampColumns,
}, table => [
  unique().on(table.rowId, table.label),
  unique().on(table.rowId, table.seatNumber),
  index('venue_seats_row_idx').on(table.rowId),
])

export const events = sqliteTable('events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  publicId: text('public_id').notNull().unique(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  description: text('description').notNull(),
  status: text('status').notNull().default('draft'),
  venueId: integer('venue_id').notNull().references(() => venues.id, { onDelete: 'restrict' }),
  coverImage: text('cover_image'),
  startsAt: integer('starts_at', { mode: 'timestamp' }).notNull(),
  endsAt: integer('ends_at', { mode: 'timestamp' }),
  salesStartAt: integer('sales_start_at', { mode: 'timestamp' }).notNull(),
  salesEndAt: integer('sales_end_at', { mode: 'timestamp' }).notNull(),
  publishedAt: integer('published_at', { mode: 'timestamp' }),
  ...timestampColumns,
}, table => [
  index('events_venue_idx').on(table.venueId),
  index('events_status_idx').on(table.status),
  index('events_sales_window_idx').on(table.salesStartAt, table.salesEndAt),
])

export const eventSessions = sqliteTable('event_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  publicId: text('public_id').notNull().unique(),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  venueId: integer('venue_id').notNull().references(() => venues.id, { onDelete: 'restrict' }),
  label: text('label').notNull(),
  status: text('status').notNull().default('draft'),
  startsAt: integer('starts_at', { mode: 'timestamp' }).notNull(),
  endsAt: integer('ends_at', { mode: 'timestamp' }),
  salesStartAt: integer('sales_start_at', { mode: 'timestamp' }).notNull(),
  salesEndAt: integer('sales_end_at', { mode: 'timestamp' }).notNull(),
  queueEnabled: integer('queue_enabled', { mode: 'boolean' }).notNull().default(false),
  publishedAt: integer('published_at', { mode: 'timestamp' }),
  ...timestampColumns,
}, table => [
  index('event_sessions_event_idx').on(table.eventId),
  index('event_sessions_public_idx').on(table.publicId),
  index('event_sessions_status_idx').on(table.status),
  index('event_sessions_sales_window_idx').on(table.salesStartAt, table.salesEndAt),
])

export const systemSettings = sqliteTable('system_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  ...timestampColumns,
})

export const eventDraftAutosaves = sqliteTable('event_draft_autosaves', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  draftKey: text('draft_key').notNull().unique(),
  userId: integer('user_id').notNull().default(0),
  status: text('status').notNull().default('active'),
  convertedEventId: integer('converted_event_id'),
  titleSnapshot: text('title_snapshot'),
  slugSnapshot: text('slug_snapshot'),
  venueId: integer('venue_id'),
  payload: text('payload').notNull(),
  lastSavedStep: integer('last_saved_step').notNull().default(1),
  ...timestampColumns,
}, table => [
  index('event_draft_autosaves_draft_key_idx').on(table.draftKey),
  index('event_draft_autosaves_user_status_idx').on(table.userId, table.status),
])

export const ticketTypes = sqliteTable('ticket_types', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  eventSessionId: integer('event_session_id'),
  venueSectionId: integer('venue_section_id').references(() => venueSections.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  description: text('description'),
  priceCents: integer('price_cents').notNull(),
  currency: text('currency').notNull().default('VND'),
  capacity: integer('capacity').notNull().default(0),
  color: text('color').notNull().default('#8B5CF6'),
  isReservedSeating: integer('is_reserved_seating', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  ...timestampColumns,
}, table => [
  index('ticket_types_event_idx').on(table.eventId),
  index('ticket_types_session_idx').on(table.eventSessionId),
  index('ticket_types_section_idx').on(table.venueSectionId),
  foreignKey({
    columns: [table.eventSessionId],
    foreignColumns: [eventSessions.id],
  }).onDelete('cascade'),
])

export const seatHolds = sqliteTable('seat_holds', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  publicId: text('public_id').notNull().unique(),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  eventSessionId: integer('event_session_id'),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  sessionKey: text('session_key').notNull(),
  idempotencyKey: text('idempotency_key').notNull(),
  status: text('status').notNull().default('active'),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  checkoutStartedAt: integer('checkout_started_at', { mode: 'timestamp' }),
  releasedAt: integer('released_at', { mode: 'timestamp' }),
  ...timestampColumns,
}, table => [
  index('seat_holds_event_idx').on(table.eventId),
  index('seat_holds_session_idx').on(table.eventSessionId),
  index('seat_holds_session_key_idx').on(table.sessionKey),
  index('seat_holds_status_idx').on(table.status),
  index('seat_holds_expires_idx').on(table.expiresAt),
  unique().on(table.eventSessionId, table.sessionKey, table.idempotencyKey),
  foreignKey({
    columns: [table.eventSessionId],
    foreignColumns: [eventSessions.id],
  }).onDelete('cascade'),
])

export const orders = sqliteTable('orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  publicId: text('public_id').notNull().unique(),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'restrict' }),
  eventSessionId: integer('event_session_id'),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  holdId: integer('hold_id').references(() => seatHolds.id, { onDelete: 'set null' }),
  customerName: text('customer_name'),
  customerEmail: text('customer_email'),
  customerPhone: text('customer_phone'),
  customerAgeBracket: text('customer_age_bracket'),
  customerGender: text('customer_gender'),
  amountCents: integer('amount_cents').notNull().default(0),
  currency: text('currency').notNull().default('VND'),
  status: text('status').notNull().default('pending'),
  checkoutSessionId: text('checkout_session_id').notNull().unique(),
  confirmedAt: integer('confirmed_at', { mode: 'timestamp' }),
  cancelledAt: integer('cancelled_at', { mode: 'timestamp' }),
  ...timestampColumns,
}, table => [
  index('orders_event_idx').on(table.eventId),
  index('orders_session_idx').on(table.eventSessionId),
  index('orders_hold_idx').on(table.holdId),
  index('orders_user_idx').on(table.userId),
  index('orders_status_idx').on(table.status),
  unique().on(table.holdId),
  foreignKey({
    columns: [table.eventSessionId],
    foreignColumns: [eventSessions.id],
  }).onDelete('restrict'),
])

export const eventSeats = sqliteTable('event_seats', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  eventSessionId: integer('event_session_id'),
  venueSeatId: integer('venue_seat_id').references(() => venueSeats.id, { onDelete: 'set null' }),
  venueSectionId: integer('venue_section_id').references(() => venueSections.id, { onDelete: 'set null' }),
  ticketTypeId: integer('ticket_type_id').references(() => ticketTypes.id, { onDelete: 'set null' }),
  holdId: integer('hold_id').references(() => seatHolds.id, { onDelete: 'set null' }),
  orderId: integer('order_id').references(() => orders.id, { onDelete: 'set null' }),
  sectionNameSnapshot: text('section_name_snapshot').notNull(),
  rowLabelSnapshot: text('row_label_snapshot'),
  seatLabelSnapshot: text('seat_label_snapshot').notNull(),
  displayX: integer('display_x').notNull().default(0),
  displayY: integer('display_y').notNull().default(0),
  priceCents: integer('price_cents').notNull(),
  currency: text('currency').notNull().default('VND'),
  status: text('status').notNull().default('available'),
  lockedAt: integer('locked_at', { mode: 'timestamp' }),
  soldAt: integer('sold_at', { mode: 'timestamp' }),
  ...timestampColumns,
}, table => [
  unique().on(table.eventSessionId, table.venueSeatId),
  index('event_seats_event_idx').on(table.eventId),
  index('event_seats_session_idx').on(table.eventSessionId),
  index('event_seats_session_status_idx').on(table.eventSessionId, table.status),
  index('event_seats_ticket_type_idx').on(table.ticketTypeId),
  index('event_seats_hold_idx').on(table.holdId),
  index('event_seats_order_idx').on(table.orderId),
  index('event_seats_status_idx').on(table.eventId, table.status),
  foreignKey({
    columns: [table.eventSessionId],
    foreignColumns: [eventSessions.id],
  }).onDelete('cascade'),
])

export const orderItems = sqliteTable('order_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderId: integer('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  eventSeatId: integer('event_seat_id').references(() => eventSeats.id, { onDelete: 'set null' }),
  ticketTypeId: integer('ticket_type_id').references(() => ticketTypes.id, { onDelete: 'set null' }),
  ticketLabel: text('ticket_label').notNull(),
  sectionLabel: text('section_label'),
  rowLabel: text('row_label'),
  seatLabel: text('seat_label'),
  unitPriceCents: integer('unit_price_cents').notNull(),
  quantity: integer('quantity').notNull().default(1),
  ...timestampColumns,
}, table => [
  index('order_items_order_idx').on(table.orderId),
  index('order_items_event_seat_idx').on(table.eventSeatId),
])

export const tickets = sqliteTable('tickets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  publicId: text('public_id').notNull().unique(),
  orderId: integer('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  orderItemId: integer('order_item_id').notNull().references(() => orderItems.id, { onDelete: 'cascade' }),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  eventSessionId: integer('event_session_id'),
  eventSeatId: integer('event_seat_id').references(() => eventSeats.id, { onDelete: 'set null' }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  savedAttendeeId: integer('saved_attendee_id'),
  attendeeName: text('attendee_name').notNull(),
  attendeeEmail: text('attendee_email').notNull(),
  attendeePhone: text('attendee_phone'),
  attendeeBirthDate: integer('attendee_birth_date', { mode: 'timestamp' }),
  attendeeGender: text('attendee_gender').$type<SavedAttendeeGender>(),
  attendeeGuardianName: text('attendee_guardian_name'),
  attendeeGuardianEmail: text('attendee_guardian_email'),
  attendeeGuardianPhone: text('attendee_guardian_phone'),
  attendeeNotes: text('attendee_notes'),
  attendeeAccessibilityNeeds: text('attendee_accessibility_needs'),
  qrToken: text('qr_token').notNull().unique(),
  status: text('status').notNull().default('issued'),
  issuedAt: integer('issued_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  checkedInAt: integer('checked_in_at', { mode: 'timestamp' }),
  ...timestampColumns,
}, table => [
  index('tickets_order_idx').on(table.orderId),
  index('tickets_event_idx').on(table.eventId),
  index('tickets_session_idx').on(table.eventSessionId),
  index('tickets_user_idx').on(table.userId),
  index('tickets_saved_attendee_idx').on(table.savedAttendeeId),
  index('tickets_status_idx').on(table.status),
  foreignKey({
    columns: [table.eventSessionId],
    foreignColumns: [eventSessions.id],
  }).onDelete('cascade'),
  foreignKey({
    columns: [table.savedAttendeeId],
    foreignColumns: [savedAttendees.id],
  }).onDelete('set null'),
])

export const queueEntries = sqliteTable('queue_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  eventSessionId: integer('event_session_id'),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  customerKey: text('customer_key').notNull(),
  status: text('status').notNull().default('waiting'),
  passToken: text('pass_token').unique(),
  admittedAt: integer('admitted_at', { mode: 'timestamp' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  ...timestampColumns,
}, table => [
  unique().on(table.eventSessionId, table.customerKey),
  index('queue_entries_event_idx').on(table.eventId),
  index('queue_entries_session_idx').on(table.eventSessionId),
  index('queue_entries_status_idx').on(table.eventId, table.status),
  index('queue_entries_session_status_idx').on(table.eventSessionId, table.status),
  foreignKey({
    columns: [table.eventSessionId],
    foreignColumns: [eventSessions.id],
  }).onDelete('cascade'),
])

export const eventMetricBuckets = sqliteTable('event_metric_buckets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  eventSessionId: integer('event_session_id'),
  bucketDate: text('bucket_date').notNull(),
  soldTicketsCount: integer('sold_tickets_count').notNull().default(0),
  revenueCents: integer('revenue_cents').notNull().default(0),
  activeHoldsCount: integer('active_holds_count').notNull().default(0),
  queuedUsersCount: integer('queued_users_count').notNull().default(0),
  age18To24Count: integer('age_18_24_count').notNull().default(0),
  age25To34Count: integer('age_25_34_count').notNull().default(0),
  age35To44Count: integer('age_35_44_count').notNull().default(0),
  age45PlusCount: integer('age_45_plus_count').notNull().default(0),
  femaleCount: integer('female_count').notNull().default(0),
  maleCount: integer('male_count').notNull().default(0),
  nonBinaryCount: integer('non_binary_count').notNull().default(0),
  undisclosedCount: integer('undisclosed_count').notNull().default(0),
  ...timestampColumns,
}, table => [
  unique().on(table.eventSessionId, table.bucketDate),
  index('event_metric_buckets_event_idx').on(table.eventId),
  index('event_metric_buckets_session_idx').on(table.eventSessionId),
  foreignKey({
    columns: [table.eventSessionId],
    foreignColumns: [eventSessions.id],
  }).onDelete('cascade'),
])

export const credentials = sqliteTable('credentials', {
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  id: text('id').notNull().primaryKey(), // WebAuthn Credential IDs are unique strings, safer as PK
  publicKey: text('public_key').notNull(),
  counter: integer('counter').notNull(),
  backedUp: integer('backed_up', { mode: 'boolean' }).notNull(),
  transports: text('transports', { mode: 'json' }).notNull().$type<WebAuthnCredential['transports']>(),
  ...timestampColumns,
}, table => ({
  userIndex: index('credentials_user_idx').on(table.userId), // Index for faster lookups by user
}))

// ── OAuth Accounts Table ──────────────────────────────────────

export const oauthAccounts = sqliteTable('oauth_accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(), // 'google', 'github', 'discord', etc.
  providerAccountId: text('provider_account_id').notNull(), // Google sub, GitHub user id, etc.
  email: text('email'), // Provider email (display only)
  name: text('name'), // Provider display name
  avatarUrl: text('avatar_url'), // Provider avatar
  ...timestampColumns,
}, table => [
  unique().on(table.provider, table.providerAccountId), // One link per provider account globally
  unique().on(table.userId, table.provider), // One provider type per user
  index('oauth_accounts_user_idx').on(table.userId),
])

// Relations (useful for queries)
export const oauthAccountsRelations = relations(oauthAccounts, ({ one }) => ({
  user: one(users, {
    fields: [oauthAccounts.userId],
    references: [users.id],
  }),
}))

export const savedAttendeesRelations = relations(savedAttendees, ({ one, many }) => ({
  user: one(users, {
    fields: [savedAttendees.userId],
    references: [users.id],
  }),
  tickets: many(tickets),
}))

export const venuesRelations = relations(venues, ({ many }) => ({
  sections: many(venueSections),
  events: many(events),
}))

export const venueSectionsRelations = relations(venueSections, ({ one, many }) => ({
  venue: one(venues, {
    fields: [venueSections.venueId],
    references: [venues.id],
  }),
  rows: many(venueRows),
  ticketTypes: many(ticketTypes),
  eventSeats: many(eventSeats),
}))

export const venueRowsRelations = relations(venueRows, ({ one, many }) => ({
  section: one(venueSections, {
    fields: [venueRows.sectionId],
    references: [venueSections.id],
  }),
  seats: many(venueSeats),
}))

export const venueSeatsRelations = relations(venueSeats, ({ one, many }) => ({
  row: one(venueRows, {
    fields: [venueSeats.rowId],
    references: [venueRows.id],
  }),
  eventSeats: many(eventSeats),
}))

export const eventsRelations = relations(events, ({ one, many }) => ({
  venue: one(venues, {
    fields: [events.venueId],
    references: [venues.id],
  }),
  sessions: many(eventSessions),
  ticketTypes: many(ticketTypes),
  seats: many(eventSeats),
  holds: many(seatHolds),
  orders: many(orders),
  tickets: many(tickets),
  queueEntries: many(queueEntries),
  metricBuckets: many(eventMetricBuckets),
}))

export const eventSessionsRelations = relations(eventSessions, ({ one, many }) => ({
  event: one(events, {
    fields: [eventSessions.eventId],
    references: [events.id],
  }),
  venue: one(venues, {
    fields: [eventSessions.venueId],
    references: [venues.id],
  }),
  ticketTypes: many(ticketTypes),
  seats: many(eventSeats),
  holds: many(seatHolds),
  orders: many(orders),
  tickets: many(tickets),
  queueEntries: many(queueEntries),
  metricBuckets: many(eventMetricBuckets),
}))

export const ticketTypesRelations = relations(ticketTypes, ({ one, many }) => ({
  event: one(events, {
    fields: [ticketTypes.eventId],
    references: [events.id],
  }),
  session: one(eventSessions, {
    fields: [ticketTypes.eventSessionId],
    references: [eventSessions.id],
  }),
  section: one(venueSections, {
    fields: [ticketTypes.venueSectionId],
    references: [venueSections.id],
  }),
  eventSeats: many(eventSeats),
  orderItems: many(orderItems),
}))

export const seatHoldsRelations = relations(seatHolds, ({ one, many }) => ({
  event: one(events, {
    fields: [seatHolds.eventId],
    references: [events.id],
  }),
  session: one(eventSessions, {
    fields: [seatHolds.eventSessionId],
    references: [eventSessions.id],
  }),
  user: one(users, {
    fields: [seatHolds.userId],
    references: [users.id],
  }),
  eventSeats: many(eventSeats),
  orders: many(orders),
}))

export const ordersRelations = relations(orders, ({ one, many }) => ({
  event: one(events, {
    fields: [orders.eventId],
    references: [events.id],
  }),
  session: one(eventSessions, {
    fields: [orders.eventSessionId],
    references: [eventSessions.id],
  }),
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  hold: one(seatHolds, {
    fields: [orders.holdId],
    references: [seatHolds.id],
  }),
  eventSeats: many(eventSeats),
  orderItems: many(orderItems),
  tickets: many(tickets),
}))

export const eventSeatsRelations = relations(eventSeats, ({ one, many }) => ({
  event: one(events, {
    fields: [eventSeats.eventId],
    references: [events.id],
  }),
  session: one(eventSessions, {
    fields: [eventSeats.eventSessionId],
    references: [eventSessions.id],
  }),
  venueSeat: one(venueSeats, {
    fields: [eventSeats.venueSeatId],
    references: [venueSeats.id],
  }),
  section: one(venueSections, {
    fields: [eventSeats.venueSectionId],
    references: [venueSections.id],
  }),
  ticketType: one(ticketTypes, {
    fields: [eventSeats.ticketTypeId],
    references: [ticketTypes.id],
  }),
  hold: one(seatHolds, {
    fields: [eventSeats.holdId],
    references: [seatHolds.id],
  }),
  order: one(orders, {
    fields: [eventSeats.orderId],
    references: [orders.id],
  }),
  orderItems: many(orderItems),
  tickets: many(tickets),
}))

export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  eventSeat: one(eventSeats, {
    fields: [orderItems.eventSeatId],
    references: [eventSeats.id],
  }),
  ticketType: one(ticketTypes, {
    fields: [orderItems.ticketTypeId],
    references: [ticketTypes.id],
  }),
  tickets: many(tickets),
}))

export const ticketsRelations = relations(tickets, ({ one }) => ({
  event: one(events, {
    fields: [tickets.eventId],
    references: [events.id],
  }),
  session: one(eventSessions, {
    fields: [tickets.eventSessionId],
    references: [eventSessions.id],
  }),
  eventSeat: one(eventSeats, {
    fields: [tickets.eventSeatId],
    references: [eventSeats.id],
  }),
  order: one(orders, {
    fields: [tickets.orderId],
    references: [orders.id],
  }),
  orderItem: one(orderItems, {
    fields: [tickets.orderItemId],
    references: [orderItems.id],
  }),
  user: one(users, {
    fields: [tickets.userId],
    references: [users.id],
  }),
  savedAttendee: one(savedAttendees, {
    fields: [tickets.savedAttendeeId],
    references: [savedAttendees.id],
  }),
}))

export const queueEntriesRelations = relations(queueEntries, ({ one }) => ({
  event: one(events, {
    fields: [queueEntries.eventId],
    references: [events.id],
  }),
  session: one(eventSessions, {
    fields: [queueEntries.eventSessionId],
    references: [eventSessions.id],
  }),
  user: one(users, {
    fields: [queueEntries.userId],
    references: [users.id],
  }),
}))

export const eventMetricBucketsRelations = relations(eventMetricBuckets, ({ one }) => ({
  event: one(events, {
    fields: [eventMetricBuckets.eventId],
    references: [events.id],
  }),
  session: one(eventSessions, {
    fields: [eventMetricBuckets.eventSessionId],
    references: [eventSessions.id],
  }),
}))

export const usersRelations = relations(users, ({ many }) => ({
  credentials: many(credentials),
  oauthAccounts: many(oauthAccounts),
  savedAttendees: many(savedAttendees),
  holds: many(seatHolds),
  orders: many(orders),
  tickets: many(tickets),
  queueEntries: many(queueEntries),
}))

export const credentialsRelations = relations(credentials, ({ one }) => ({
  user: one(users, {
    fields: [credentials.userId],
    references: [users.id],
  }),
}))
