CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`hour_limit_value` real,
	`hour_limit_period` text,
	`billable_factor` real DEFAULT 0.4 NOT NULL,
	`color` text,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `clients_name_unique` ON `clients` (`name`);--> statement-breakpoint
CREATE TABLE `currency_rates` (
	`date` text PRIMARY KEY NOT NULL,
	`usd_brl` real NOT NULL,
	`source` text NOT NULL,
	`fetched_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `daemon_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`files_scanned` integer DEFAULT 0 NOT NULL,
	`files_processed` integer DEFAULT 0 NOT NULL,
	`tasks_created` integer DEFAULT 0 NOT NULL,
	`tasks_updated` integer DEFAULT 0 NOT NULL,
	`errors` text,
	`ok` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_daemon_runs_started` ON `daemon_runs` (`started_at`);--> statement-breakpoint
CREATE TABLE `devs` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`role` text,
	`github_handle` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`dev_id` text,
	`title` text NOT NULL,
	`description` text,
	`target_at` integer,
	`progress_percent` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`dev_id`) REFERENCES `devs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `manual_events` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`project_id` text,
	`title` text NOT NULL,
	`description` text,
	`kind` text DEFAULT 'other' NOT NULL,
	`start_at` integer NOT NULL,
	`duration_minutes` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_events_client_start` ON `manual_events` (`client_id`,`start_at`);--> statement-breakpoint
CREATE INDEX `idx_events_project_start` ON `manual_events` (`project_id`,`start_at`);--> statement-breakpoint
CREATE TABLE `model_pricing` (
	`id` text PRIMARY KEY NOT NULL,
	`model` text NOT NULL,
	`input_per_mtok` real NOT NULL,
	`output_per_mtok` real NOT NULL,
	`cache_read_per_mtok` real NOT NULL,
	`cache_creation_per_mtok` real NOT NULL,
	`valid_from` integer NOT NULL,
	`valid_until` integer,
	`source` text DEFAULT 'manual' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_pricing_model_from` ON `model_pricing` (`model`,`valid_from`);--> statement-breakpoint
CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`scope` text NOT NULL,
	`scope_ref` text,
	`body` text NOT NULL,
	`pinned` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`cwd_path` text NOT NULL,
	`claude_project_dir` text,
	`client_id` text,
	`color` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_slug_unique` ON `projects` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `projects_cwd_path_unique` ON `projects` (`cwd_path`);--> statement-breakpoint
CREATE UNIQUE INDEX `projects_claude_project_dir_unique` ON `projects` (`claude_project_dir`);--> statement-breakpoint
CREATE INDEX `idx_projects_client` ON `projects` (`client_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`jsonl_path` text NOT NULL,
	`started_at` integer,
	`ended_at` integer,
	`message_count` integer DEFAULT 0 NOT NULL,
	`total_tokens_input` integer DEFAULT 0 NOT NULL,
	`total_tokens_output` integer DEFAULT 0 NOT NULL,
	`total_tokens_cache_read` integer DEFAULT 0 NOT NULL,
	`total_tokens_cache_creation` integer DEFAULT 0 NOT NULL,
	`total_cost_usd` real DEFAULT 0 NOT NULL,
	`last_processed_offset` integer DEFAULT 0 NOT NULL,
	`last_processed_at` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_jsonl_path_unique` ON `sessions` (`jsonl_path`);--> statement-breakpoint
CREATE INDEX `idx_sessions_project` ON `sessions` (`project_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value_json` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
CREATE TABLE `task_tags` (
	`task_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`task_id`, `tag_id`),
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_task_tags_tag` ON `task_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`project_id` text NOT NULL,
	`client_id` text,
	`title` text NOT NULL,
	`description` text,
	`category` text,
	`status` text DEFAULT 'open' NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`first_message_uuid` text,
	`last_message_uuid` text,
	`tokens_input` integer DEFAULT 0 NOT NULL,
	`tokens_output` integer DEFAULT 0 NOT NULL,
	`tokens_cache_read` integer DEFAULT 0 NOT NULL,
	`tokens_cache_creation` integer DEFAULT 0 NOT NULL,
	`primary_model` text,
	`models_used` text,
	`time_input_seconds` real DEFAULT 0 NOT NULL,
	`time_processing_output_seconds` real DEFAULT 0 NOT NULL,
	`time_reading_seconds` real DEFAULT 0 NOT NULL,
	`time_total_seconds` real DEFAULT 0 NOT NULL,
	`human_hours_estimate` real,
	`human_hours_source` text DEFAULT 'none' NOT NULL,
	`human_hours_reasoning` text,
	`billable_hours` real,
	`billable_hours_locked` integer DEFAULT false NOT NULL,
	`cost_usd` real DEFAULT 0 NOT NULL,
	`is_backfilled` integer DEFAULT false NOT NULL,
	`refined_by_haiku` integer DEFAULT false NOT NULL,
	`confidence` real DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_tasks_project_started` ON `tasks` (`project_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `idx_tasks_client_started` ON `tasks` (`client_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `idx_tasks_status` ON `tasks` (`status`);--> statement-breakpoint
CREATE INDEX `idx_tasks_started` ON `tasks` (`started_at`);--> statement-breakpoint
CREATE INDEX `idx_tasks_session` ON `tasks` (`session_id`);