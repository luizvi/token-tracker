ALTER TABLE `clients` ADD COLUMN `kind` text DEFAULT 'service' NOT NULL;--> statement-breakpoint
CREATE TABLE `revenue_entries` (
  `id` text PRIMARY KEY NOT NULL,
  `client_id` text NOT NULL,
  `kind` text NOT NULL,
  `amount_usd` real,
  `amount_brl` real,
  `occurred_at` integer NOT NULL,
  `description` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `idx_revenue_client_date` ON `revenue_entries` (`client_id`,`occurred_at`);
