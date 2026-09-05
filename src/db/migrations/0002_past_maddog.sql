CREATE TABLE `change_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`action` text NOT NULL,
	`changed_by` text DEFAULT 'System' NOT NULL,
	`old_value` text,
	`new_value` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `change_logs_entity_idx` ON `change_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `change_logs_action_idx` ON `change_logs` (`action`);--> statement-breakpoint
CREATE INDEX `change_logs_created_at_idx` ON `change_logs` (`created_at`);--> statement-breakpoint
ALTER TABLE `contacts` ADD `gstin` text;--> statement-breakpoint
CREATE INDEX `contacts_gstin_idx` ON `contacts` (`gstin`);--> statement-breakpoint
ALTER TABLE `products` ADD `sku` text;--> statement-breakpoint
ALTER TABLE `products` ADD `gst_rate` integer DEFAULT 18 NOT NULL;--> statement-breakpoint
CREATE INDEX `products_sku_idx` ON `products` (`sku`);