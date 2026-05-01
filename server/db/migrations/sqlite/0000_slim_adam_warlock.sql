CREATE TABLE `credentials` (
	`user_id` integer NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`public_key` text NOT NULL,
	`counter` integer NOT NULL,
	`backed_up` integer NOT NULL,
	`transports` text NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `credentials_user_idx` ON `credentials` (`user_id`);--> statement-breakpoint
CREATE TABLE `event_draft_autosaves` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`draft_key` text NOT NULL,
	`payload` text NOT NULL,
	`last_saved_step` integer DEFAULT 1 NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_draft_autosaves_draft_key_unique` ON `event_draft_autosaves` (`draft_key`);--> statement-breakpoint
CREATE INDEX `event_draft_autosaves_draft_key_idx` ON `event_draft_autosaves` (`draft_key`);--> statement-breakpoint
CREATE TABLE `event_metric_buckets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`event_session_id` integer,
	`bucket_date` text NOT NULL,
	`sold_tickets_count` integer DEFAULT 0 NOT NULL,
	`revenue_cents` integer DEFAULT 0 NOT NULL,
	`active_holds_count` integer DEFAULT 0 NOT NULL,
	`queued_users_count` integer DEFAULT 0 NOT NULL,
	`age_18_24_count` integer DEFAULT 0 NOT NULL,
	`age_25_34_count` integer DEFAULT 0 NOT NULL,
	`age_35_44_count` integer DEFAULT 0 NOT NULL,
	`age_45_plus_count` integer DEFAULT 0 NOT NULL,
	`female_count` integer DEFAULT 0 NOT NULL,
	`male_count` integer DEFAULT 0 NOT NULL,
	`non_binary_count` integer DEFAULT 0 NOT NULL,
	`undisclosed_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`event_session_id`) REFERENCES `event_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `event_metric_buckets_event_idx` ON `event_metric_buckets` (`event_id`);--> statement-breakpoint
CREATE INDEX `event_metric_buckets_session_idx` ON `event_metric_buckets` (`event_session_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `event_metric_buckets_event_session_id_bucket_date_unique` ON `event_metric_buckets` (`event_session_id`,`bucket_date`);--> statement-breakpoint
CREATE TABLE `event_seats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`event_session_id` integer,
	`venue_seat_id` integer,
	`venue_section_id` integer,
	`ticket_type_id` integer,
	`hold_id` integer,
	`order_id` integer,
	`section_name_snapshot` text NOT NULL,
	`row_label_snapshot` text,
	`seat_label_snapshot` text NOT NULL,
	`display_x` integer DEFAULT 0 NOT NULL,
	`display_y` integer DEFAULT 0 NOT NULL,
	`price_cents` integer NOT NULL,
	`currency` text DEFAULT 'VND' NOT NULL,
	`status` text DEFAULT 'available' NOT NULL,
	`locked_at` integer,
	`sold_at` integer,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`venue_seat_id`) REFERENCES `venue_seats`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`venue_section_id`) REFERENCES `venue_sections`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`ticket_type_id`) REFERENCES `ticket_types`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`hold_id`) REFERENCES `seat_holds`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`event_session_id`) REFERENCES `event_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `event_seats_event_idx` ON `event_seats` (`event_id`);--> statement-breakpoint
CREATE INDEX `event_seats_session_idx` ON `event_seats` (`event_session_id`);--> statement-breakpoint
CREATE INDEX `event_seats_session_status_idx` ON `event_seats` (`event_session_id`,`status`);--> statement-breakpoint
CREATE INDEX `event_seats_ticket_type_idx` ON `event_seats` (`ticket_type_id`);--> statement-breakpoint
CREATE INDEX `event_seats_hold_idx` ON `event_seats` (`hold_id`);--> statement-breakpoint
CREATE INDEX `event_seats_order_idx` ON `event_seats` (`order_id`);--> statement-breakpoint
CREATE INDEX `event_seats_status_idx` ON `event_seats` (`event_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `event_seats_event_session_id_venue_seat_id_unique` ON `event_seats` (`event_session_id`,`venue_seat_id`);--> statement-breakpoint
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
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`public_id` text NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`subtitle` text,
	`description` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`venue_id` integer NOT NULL,
	`cover_image` text,
	`starts_at` integer NOT NULL,
	`ends_at` integer,
	`sales_start_at` integer NOT NULL,
	`sales_end_at` integer NOT NULL,
	`published_at` integer,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_public_id_unique` ON `events` (`public_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `events_slug_unique` ON `events` (`slug`);--> statement-breakpoint
CREATE INDEX `events_venue_idx` ON `events` (`venue_id`);--> statement-breakpoint
CREATE INDEX `events_status_idx` ON `events` (`status`);--> statement-breakpoint
CREATE INDEX `events_sales_window_idx` ON `events` (`sales_start_at`,`sales_end_at`);--> statement-breakpoint
CREATE TABLE `oauth_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`provider` text NOT NULL,
	`provider_account_id` text NOT NULL,
	`email` text,
	`name` text,
	`avatar_url` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `oauth_accounts_user_idx` ON `oauth_accounts` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `oauth_accounts_provider_provider_account_id_unique` ON `oauth_accounts` (`provider`,`provider_account_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `oauth_accounts_user_id_provider_unique` ON `oauth_accounts` (`user_id`,`provider`);--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`event_seat_id` integer,
	`ticket_type_id` integer,
	`ticket_label` text NOT NULL,
	`section_label` text,
	`row_label` text,
	`seat_label` text,
	`unit_price_cents` integer NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`event_seat_id`) REFERENCES `event_seats`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`ticket_type_id`) REFERENCES `ticket_types`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE INDEX `order_items_event_seat_idx` ON `order_items` (`event_seat_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`public_id` text NOT NULL,
	`event_id` integer NOT NULL,
	`event_session_id` integer,
	`user_id` integer,
	`hold_id` integer,
	`customer_name` text,
	`customer_email` text,
	`customer_phone` text,
	`customer_age_bracket` text,
	`customer_gender` text,
	`amount_cents` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'VND' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`checkout_session_id` text NOT NULL,
	`confirmed_at` integer,
	`cancelled_at` integer,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`hold_id`) REFERENCES `seat_holds`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`event_session_id`) REFERENCES `event_sessions`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_public_id_unique` ON `orders` (`public_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_checkout_session_id_unique` ON `orders` (`checkout_session_id`);--> statement-breakpoint
CREATE INDEX `orders_event_idx` ON `orders` (`event_id`);--> statement-breakpoint
CREATE INDEX `orders_session_idx` ON `orders` (`event_session_id`);--> statement-breakpoint
CREATE INDEX `orders_hold_idx` ON `orders` (`hold_id`);--> statement-breakpoint
CREATE INDEX `orders_user_idx` ON `orders` (`user_id`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_hold_id_unique` ON `orders` (`hold_id`);--> statement-breakpoint
CREATE TABLE `queue_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`event_session_id` integer,
	`user_id` integer,
	`customer_key` text NOT NULL,
	`status` text DEFAULT 'waiting' NOT NULL,
	`pass_token` text,
	`admitted_at` integer,
	`expires_at` integer,
	`completed_at` integer,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`event_session_id`) REFERENCES `event_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `queue_entries_pass_token_unique` ON `queue_entries` (`pass_token`);--> statement-breakpoint
CREATE INDEX `queue_entries_event_idx` ON `queue_entries` (`event_id`);--> statement-breakpoint
CREATE INDEX `queue_entries_session_idx` ON `queue_entries` (`event_session_id`);--> statement-breakpoint
CREATE INDEX `queue_entries_status_idx` ON `queue_entries` (`event_id`,`status`);--> statement-breakpoint
CREATE INDEX `queue_entries_session_status_idx` ON `queue_entries` (`event_session_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `queue_entries_event_session_id_customer_key_unique` ON `queue_entries` (`event_session_id`,`customer_key`);--> statement-breakpoint
CREATE TABLE `seat_holds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`public_id` text NOT NULL,
	`event_id` integer NOT NULL,
	`event_session_id` integer,
	`user_id` integer,
	`session_key` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`expires_at` integer NOT NULL,
	`checkout_started_at` integer,
	`released_at` integer,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`event_session_id`) REFERENCES `event_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `seat_holds_public_id_unique` ON `seat_holds` (`public_id`);--> statement-breakpoint
CREATE INDEX `seat_holds_event_idx` ON `seat_holds` (`event_id`);--> statement-breakpoint
CREATE INDEX `seat_holds_session_idx` ON `seat_holds` (`event_session_id`);--> statement-breakpoint
CREATE INDEX `seat_holds_session_key_idx` ON `seat_holds` (`session_key`);--> statement-breakpoint
CREATE INDEX `seat_holds_status_idx` ON `seat_holds` (`status`);--> statement-breakpoint
CREATE INDEX `seat_holds_expires_idx` ON `seat_holds` (`expires_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `seat_holds_event_session_id_session_key_idempotency_key_unique` ON `seat_holds` (`event_session_id`,`session_key`,`idempotency_key`);--> statement-breakpoint
CREATE TABLE `system_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `ticket_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`event_session_id` integer,
	`venue_section_id` integer,
	`name` text NOT NULL,
	`description` text,
	`price_cents` integer NOT NULL,
	`currency` text DEFAULT 'VND' NOT NULL,
	`capacity` integer DEFAULT 0 NOT NULL,
	`color` text DEFAULT '#8B5CF6' NOT NULL,
	`is_reserved_seating` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`venue_section_id`) REFERENCES `venue_sections`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`event_session_id`) REFERENCES `event_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ticket_types_event_idx` ON `ticket_types` (`event_id`);--> statement-breakpoint
CREATE INDEX `ticket_types_session_idx` ON `ticket_types` (`event_session_id`);--> statement-breakpoint
CREATE INDEX `ticket_types_section_idx` ON `ticket_types` (`venue_section_id`);--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`public_id` text NOT NULL,
	`order_id` integer NOT NULL,
	`order_item_id` integer NOT NULL,
	`event_id` integer NOT NULL,
	`event_session_id` integer,
	`event_seat_id` integer,
	`user_id` integer,
	`attendee_name` text NOT NULL,
	`attendee_email` text NOT NULL,
	`qr_token` text NOT NULL,
	`status` text DEFAULT 'issued' NOT NULL,
	`issued_at` integer NOT NULL,
	`checked_in_at` integer,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`order_item_id`) REFERENCES `order_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`event_seat_id`) REFERENCES `event_seats`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`event_session_id`) REFERENCES `event_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tickets_public_id_unique` ON `tickets` (`public_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `tickets_qr_token_unique` ON `tickets` (`qr_token`);--> statement-breakpoint
CREATE INDEX `tickets_order_idx` ON `tickets` (`order_id`);--> statement-breakpoint
CREATE INDEX `tickets_event_idx` ON `tickets` (`event_id`);--> statement-breakpoint
CREATE INDEX `tickets_session_idx` ON `tickets` (`event_session_id`);--> statement-breakpoint
CREATE INDEX `tickets_user_idx` ON `tickets` (`user_id`);--> statement-breakpoint
CREATE INDEX `tickets_status_idx` ON `tickets` (`status`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`name` text NOT NULL,
	`password` text NOT NULL,
	`email` text NOT NULL,
	`is_admin` integer DEFAULT false NOT NULL,
	`last_login_at` integer,
	`phone` text,
	`birth_date` integer,
	`gender` text,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `venue_rows` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`section_id` integer NOT NULL,
	`label` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`section_id`) REFERENCES `venue_sections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `venue_rows_section_idx` ON `venue_rows` (`section_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `venue_rows_section_id_label_unique` ON `venue_rows` (`section_id`,`label`);--> statement-breakpoint
CREATE TABLE `venue_seats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`row_id` integer NOT NULL,
	`label` text NOT NULL,
	`seat_number` integer NOT NULL,
	`x` integer DEFAULT 0 NOT NULL,
	`y` integer DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`accessibility_label` text,
	`is_accessible` integer DEFAULT false NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`row_id`) REFERENCES `venue_rows`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `venue_seats_row_idx` ON `venue_seats` (`row_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `venue_seats_row_id_label_unique` ON `venue_seats` (`row_id`,`label`);--> statement-breakpoint
CREATE UNIQUE INDEX `venue_seats_row_id_seat_number_unique` ON `venue_seats` (`row_id`,`seat_number`);--> statement-breakpoint
CREATE TABLE `venue_sections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`venue_id` integer NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#8B5CF6' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `venue_sections_venue_idx` ON `venue_sections` (`venue_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `venue_sections_venue_id_code_unique` ON `venue_sections` (`venue_id`,`code`);--> statement-breakpoint
CREATE TABLE `venues` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`public_id` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`city` text NOT NULL,
	`country` text DEFAULT 'Vietnam' NOT NULL,
	`address` text NOT NULL,
	`capacity` integer DEFAULT 0 NOT NULL,
	`cover_image` text,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `venues_public_id_unique` ON `venues` (`public_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `venues_slug_unique` ON `venues` (`slug`);