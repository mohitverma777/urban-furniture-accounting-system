ALTER TABLE `budgets` ADD `responsible_person` text;--> statement-breakpoint
ALTER TABLE `budgets` ADD `status` text DEFAULT 'DRAFT' NOT NULL;--> statement-breakpoint
ALTER TABLE `budgets` ADD `revision_of_id` text;