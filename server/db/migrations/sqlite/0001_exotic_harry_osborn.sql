CREATE TABLE `auth_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`token` text NOT NULL,
	`type` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_tokens_token_unique` ON `auth_tokens` (`token`);--> statement-breakpoint
CREATE INDEX `auth_tokens_user_idx` ON `auth_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `auth_tokens_token_idx` ON `auth_tokens` (`token`);--> statement-breakpoint
CREATE INDEX `auth_tokens_type_idx` ON `auth_tokens` (`type`);--> statement-breakpoint
CREATE INDEX `auth_tokens_expires_idx` ON `auth_tokens` (`expires_at`);--> statement-breakpoint
ALTER TABLE `users` ADD `email_verified` integer DEFAULT false NOT NULL;