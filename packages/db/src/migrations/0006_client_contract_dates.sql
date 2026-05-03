ALTER TABLE `clients` ADD COLUMN `contract_start_at` integer;--> statement-breakpoint
ALTER TABLE `clients` ADD COLUMN `contract_renewal_at` integer;--> statement-breakpoint
ALTER TABLE `clients` ADD COLUMN `renewal_notice_days` integer;
