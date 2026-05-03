ALTER TABLE `event_draft_autosaves` ADD `user_id` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `event_draft_autosaves` ADD `status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `event_draft_autosaves` ADD `converted_event_id` integer;--> statement-breakpoint
ALTER TABLE `event_draft_autosaves` ADD `title_snapshot` text;--> statement-breakpoint
ALTER TABLE `event_draft_autosaves` ADD `slug_snapshot` text;--> statement-breakpoint
ALTER TABLE `event_draft_autosaves` ADD `venue_id` integer;--> statement-breakpoint
CREATE INDEX `event_draft_autosaves_user_status_idx` ON `event_draft_autosaves` (`user_id`,`status`);