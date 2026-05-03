ALTER TABLE `clients` ADD COLUMN `hourly_rate_brl` real;--> statement-breakpoint
ALTER TABLE `clients` ADD COLUMN `hourly_rate_usd` real;--> statement-breakpoint
ALTER TABLE `clients` ADD COLUMN `monthly_average_hours` real;--> statement-breakpoint
ALTER TABLE `tasks` ADD COLUMN `links` text;
