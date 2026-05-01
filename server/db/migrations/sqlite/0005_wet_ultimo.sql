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
CREATE INDEX `event_draft_autosaves_draft_key_idx` ON `event_draft_autosaves` (`draft_key`);