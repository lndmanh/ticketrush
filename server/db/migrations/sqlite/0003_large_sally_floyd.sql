CREATE TABLE `event_translations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`locale` text NOT NULL,
	`title` text,
	`subtitle` text,
	`description` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `event_translations_event_idx` ON `event_translations` (`event_id`);--> statement-breakpoint
CREATE INDEX `event_translations_locale_idx` ON `event_translations` (`locale`);--> statement-breakpoint
CREATE UNIQUE INDEX `event_translations_event_id_locale_unique` ON `event_translations` (`event_id`,`locale`);--> statement-breakpoint
CREATE TABLE `seat_hold_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`hold_id` integer NOT NULL,
	`event_seat_id` integer NOT NULL,
	`price_cents` integer NOT NULL,
	`currency` text DEFAULT 'VND' NOT NULL,
	`pricing_source` text NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`hold_id`) REFERENCES `seat_holds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`event_seat_id`) REFERENCES `event_seats`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `seat_hold_items_hold_idx` ON `seat_hold_items` (`hold_id`);--> statement-breakpoint
CREATE INDEX `seat_hold_items_event_seat_idx` ON `seat_hold_items` (`event_seat_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `seat_hold_items_hold_id_event_seat_id_unique` ON `seat_hold_items` (`hold_id`,`event_seat_id`);--> statement-breakpoint
CREATE TABLE `session_seat_overrides` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`event_session_id` integer NOT NULL,
	`venue_seat_id` integer NOT NULL,
	`venue_section_id` integer NOT NULL,
	`price_cents` integer,
	`currency` text,
	`is_disabled` integer DEFAULT false NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`event_session_id`) REFERENCES `event_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`venue_seat_id`) REFERENCES `venue_seats`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`venue_section_id`) REFERENCES `venue_sections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `session_seat_overrides_event_session_idx` ON `session_seat_overrides` (`event_session_id`);--> statement-breakpoint
CREATE INDEX `session_seat_overrides_session_section_idx` ON `session_seat_overrides` (`event_session_id`,`venue_section_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `session_seat_overrides_event_session_id_venue_seat_id_unique` ON `session_seat_overrides` (`event_session_id`,`venue_seat_id`);--> statement-breakpoint
CREATE TABLE `session_section_prices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`event_session_id` integer NOT NULL,
	`venue_section_id` integer NOT NULL,
	`section_name_snapshot` text NOT NULL,
	`section_color_snapshot` text NOT NULL,
	`price_cents` integer NOT NULL,
	`currency` text DEFAULT 'VND' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`event_session_id`) REFERENCES `event_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`venue_section_id`) REFERENCES `venue_sections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `session_section_prices_event_session_idx` ON `session_section_prices` (`event_session_id`);--> statement-breakpoint
CREATE INDEX `session_section_prices_section_idx` ON `session_section_prices` (`venue_section_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `session_section_prices_event_session_id_venue_section_id_unique` ON `session_section_prices` (`event_session_id`,`venue_section_id`);--> statement-breakpoint
CREATE TABLE `ticket_type_translations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticket_type_id` integer NOT NULL,
	`locale` text NOT NULL,
	`name` text,
	`description` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`ticket_type_id`) REFERENCES `ticket_types`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ticket_type_translations_ticket_type_idx` ON `ticket_type_translations` (`ticket_type_id`);--> statement-breakpoint
CREATE INDEX `ticket_type_translations_locale_idx` ON `ticket_type_translations` (`locale`);--> statement-breakpoint
CREATE UNIQUE INDEX `ticket_type_translations_ticket_type_id_locale_unique` ON `ticket_type_translations` (`ticket_type_id`,`locale`);--> statement-breakpoint
CREATE TABLE `venue_translations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`venue_id` integer NOT NULL,
	`locale` text NOT NULL,
	`name` text,
	`description` text,
	`city` text,
	`address` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `venue_translations_venue_idx` ON `venue_translations` (`venue_id`);--> statement-breakpoint
CREATE INDEX `venue_translations_locale_idx` ON `venue_translations` (`locale`);--> statement-breakpoint
CREATE UNIQUE INDEX `venue_translations_venue_id_locale_unique` ON `venue_translations` (`venue_id`,`locale`);--> statement-breakpoint
DROP INDEX `venue_sections_venue_id_code_unique`;--> statement-breakpoint
ALTER TABLE `venue_sections` ADD `layout_version` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `venue_sections` ADD `previous_section_id` integer;--> statement-breakpoint
CREATE INDEX `venue_sections_venue_layout_idx` ON `venue_sections` (`venue_id`,`layout_version`);--> statement-breakpoint
CREATE INDEX `venue_sections_previous_idx` ON `venue_sections` (`previous_section_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `venue_sections_venue_id_layout_version_code_unique` ON `venue_sections` (`venue_id`,`layout_version`,`code`);--> statement-breakpoint
ALTER TABLE `event_sessions` ADD `pricing_mode` text DEFAULT 'uniform' NOT NULL;--> statement-breakpoint
ALTER TABLE `event_sessions` ADD `currency` text DEFAULT 'VND' NOT NULL;--> statement-breakpoint
ALTER TABLE `event_sessions` ADD `venue_layout_version` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `event_sessions` ADD `venue_synced_at` integer;--> statement-breakpoint
ALTER TABLE `events` ADD `primary_session_id` integer REFERENCES event_sessions(id);--> statement-breakpoint
ALTER TABLE `venue_rows` ADD `layout_version` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `venue_rows` ADD `previous_row_id` integer;--> statement-breakpoint
CREATE INDEX `venue_rows_layout_idx` ON `venue_rows` (`layout_version`);--> statement-breakpoint
CREATE INDEX `venue_rows_previous_idx` ON `venue_rows` (`previous_row_id`);--> statement-breakpoint
ALTER TABLE `venue_seats` ADD `layout_version` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `venue_seats` ADD `previous_seat_id` integer;--> statement-breakpoint
CREATE INDEX `venue_seats_layout_idx` ON `venue_seats` (`layout_version`);--> statement-breakpoint
CREATE INDEX `venue_seats_previous_idx` ON `venue_seats` (`previous_seat_id`);--> statement-breakpoint
ALTER TABLE `venues` ADD `layout_version` integer DEFAULT 1 NOT NULL;