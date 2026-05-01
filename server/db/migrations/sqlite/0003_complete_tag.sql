CREATE TABLE `event_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`public_id` text NOT NULL,
	`event_id` integer NOT NULL,
	`venue_id` integer NOT NULL,
	`label` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer,
	`sales_start_at` integer NOT NULL,
	`sales_end_at` integer NOT NULL,
	`queue_enabled` integer DEFAULT false NOT NULL,
	`queue_activation_threshold` integer DEFAULT 250 NOT NULL,
	`queue_batch_size` integer DEFAULT 50 NOT NULL,
	`queue_window_seconds` integer DEFAULT 180 NOT NULL,
	`published_at` integer,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_sessions_public_id_unique` ON `event_sessions` (`public_id`);--> statement-breakpoint
CREATE INDEX `event_sessions_event_idx` ON `event_sessions` (`event_id`);--> statement-breakpoint
CREATE INDEX `event_sessions_public_idx` ON `event_sessions` (`public_id`);--> statement-breakpoint
CREATE INDEX `event_sessions_status_idx` ON `event_sessions` (`status`);--> statement-breakpoint
CREATE INDEX `event_sessions_sales_window_idx` ON `event_sessions` (`sales_start_at`,`sales_end_at`);--> statement-breakpoint
DROP INDEX `event_metric_buckets_event_id_bucket_date_unique`;--> statement-breakpoint
ALTER TABLE `event_metric_buckets` ADD `event_session_id` integer REFERENCES event_sessions(id);--> statement-breakpoint
CREATE INDEX `event_metric_buckets_session_idx` ON `event_metric_buckets` (`event_session_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `event_metric_buckets_event_session_id_bucket_date_unique` ON `event_metric_buckets` (`event_session_id`,`bucket_date`);--> statement-breakpoint
DROP INDEX `event_seats_event_id_venue_seat_id_unique`;--> statement-breakpoint
ALTER TABLE `event_seats` ADD `event_session_id` integer REFERENCES event_sessions(id);--> statement-breakpoint
CREATE INDEX `event_seats_session_idx` ON `event_seats` (`event_session_id`);--> statement-breakpoint
CREATE INDEX `event_seats_session_status_idx` ON `event_seats` (`event_session_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `event_seats_event_session_id_venue_seat_id_unique` ON `event_seats` (`event_session_id`,`venue_seat_id`);--> statement-breakpoint
DROP INDEX `queue_entries_event_id_customer_key_unique`;--> statement-breakpoint
ALTER TABLE `queue_entries` ADD `event_session_id` integer REFERENCES event_sessions(id);--> statement-breakpoint
CREATE INDEX `queue_entries_session_idx` ON `queue_entries` (`event_session_id`);--> statement-breakpoint
CREATE INDEX `queue_entries_session_status_idx` ON `queue_entries` (`event_session_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `queue_entries_event_session_id_customer_key_unique` ON `queue_entries` (`event_session_id`,`customer_key`);--> statement-breakpoint
DROP INDEX `seat_holds_idempotency_key_unique`;--> statement-breakpoint
DROP INDEX `seat_holds_session_idx`;--> statement-breakpoint
ALTER TABLE `seat_holds` ADD `event_session_id` integer REFERENCES event_sessions(id);--> statement-breakpoint
CREATE INDEX `seat_holds_session_key_idx` ON `seat_holds` (`session_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `seat_holds_event_session_id_session_key_idempotency_key_unique` ON `seat_holds` (`event_session_id`,`session_key`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `seat_holds_session_idx` ON `seat_holds` (`event_session_id`);--> statement-breakpoint
ALTER TABLE `orders` ADD `event_session_id` integer REFERENCES event_sessions(id);--> statement-breakpoint
CREATE INDEX `orders_session_idx` ON `orders` (`event_session_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_hold_id_unique` ON `orders` (`hold_id`);--> statement-breakpoint
ALTER TABLE `ticket_types` ADD `event_session_id` integer REFERENCES event_sessions(id);--> statement-breakpoint
CREATE INDEX `ticket_types_session_idx` ON `ticket_types` (`event_session_id`);--> statement-breakpoint
ALTER TABLE `tickets` ADD `event_session_id` integer REFERENCES event_sessions(id);--> statement-breakpoint
CREATE INDEX `tickets_session_idx` ON `tickets` (`event_session_id`);