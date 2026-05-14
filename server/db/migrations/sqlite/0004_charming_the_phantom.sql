ALTER TABLE `venue_sections` ADD `grid_x` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `venue_sections` ADD `grid_y` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `venue_sections` ADD `grid_w` integer DEFAULT 25 NOT NULL;--> statement-breakpoint
ALTER TABLE `venue_sections` ADD `grid_h` integer DEFAULT 4 NOT NULL;--> statement-breakpoint
ALTER TABLE `venue_sections` ADD `seat_layout_mode` text DEFAULT 'automatic' NOT NULL;