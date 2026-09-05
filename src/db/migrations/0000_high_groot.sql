CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`email` text,
	`mobile` text,
	`address` text,
	`city` text,
	`state` text,
	`pincode` text,
	`profile_image` text,
	`is_archived` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `contacts_type_idx` ON `contacts` (`type`);--> statement-breakpoint
CREATE INDEX `contacts_email_idx` ON `contacts` (`email`);--> statement-breakpoint
CREATE INDEX `contacts_name_idx` ON `contacts` (`name`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`sales_price` integer DEFAULT 0 NOT NULL,
	`cost_price` integer DEFAULT 0 NOT NULL,
	`category` text,
	`is_archived` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `products_type_idx` ON `products` (`type`);--> statement-breakpoint
CREATE INDEX `products_category_idx` ON `products` (`category`);--> statement-breakpoint
CREATE INDEX `products_name_idx` ON `products` (`name`);--> statement-breakpoint
CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_code_uidx` ON `accounts` (`code`);--> statement-breakpoint
CREATE INDEX `accounts_type_idx` ON `accounts` (`type`);--> statement-breakpoint
CREATE INDEX `accounts_is_active_idx` ON `accounts` (`is_active`);--> statement-breakpoint
CREATE INDEX `accounts_name_idx` ON `accounts` (`name`);--> statement-breakpoint
CREATE TABLE `journals` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`default_account_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`default_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `journals_type_idx` ON `journals` (`type`);--> statement-breakpoint
CREATE INDEX `journals_default_account_idx` ON `journals` (`default_account_id`);--> statement-breakpoint
CREATE TABLE `analytic_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `analytic_accounts_type_idx` ON `analytic_accounts` (`type`);--> statement-breakpoint
CREATE INDEX `analytic_accounts_name_idx` ON `analytic_accounts` (`name`);--> statement-breakpoint
CREATE TABLE `budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`analytic_account_id` text NOT NULL,
	`planned_amount` integer DEFAULT 0 NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`analytic_account_id`) REFERENCES `analytic_accounts`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `budgets_analytic_account_idx` ON `budgets` (`analytic_account_id`);--> statement-breakpoint
CREATE INDEX `budgets_date_range_idx` ON `budgets` (`start_date`,`end_date`);--> statement-breakpoint
CREATE TABLE `journal_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`journal_id` text NOT NULL,
	`date` integer NOT NULL,
	`reference` text,
	`description` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`journal_id`) REFERENCES `journals`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `journal_entries_journal_idx` ON `journal_entries` (`journal_id`);--> statement-breakpoint
CREATE INDEX `journal_entries_date_idx` ON `journal_entries` (`date`);--> statement-breakpoint
CREATE INDEX `journal_entries_reference_idx` ON `journal_entries` (`reference`);--> statement-breakpoint
CREATE TABLE `journal_items` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`account_id` text NOT NULL,
	`analytic_account_id` text,
	`debit` integer DEFAULT 0 NOT NULL,
	`credit` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `journal_entries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`analytic_account_id`) REFERENCES `analytic_accounts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `journal_items_entry_idx` ON `journal_items` (`entry_id`);--> statement-breakpoint
CREATE INDEX `journal_items_account_idx` ON `journal_items` (`account_id`);--> statement-breakpoint
CREATE INDEX `journal_items_analytic_idx` ON `journal_items` (`analytic_account_id`);--> statement-breakpoint
CREATE INDEX `journal_items_account_entry_idx` ON `journal_items` (`account_id`,`entry_id`);--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`product_id` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`unit_price` integer DEFAULT 0 NOT NULL,
	`tax_rate` integer DEFAULT 0 NOT NULL,
	`tax_amount` integer DEFAULT 0 NOT NULL,
	`line_total` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE INDEX `order_items_product_idx` ON `order_items` (`product_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`order_number` text NOT NULL,
	`type` text NOT NULL,
	`contact_id` text NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`invoice_date` integer,
	`due_date` integer,
	`subtotal` integer DEFAULT 0 NOT NULL,
	`tax_amount` integer DEFAULT 0 NOT NULL,
	`total_amount` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_order_number_uidx` ON `orders` (`order_number`);--> statement-breakpoint
CREATE INDEX `orders_type_idx` ON `orders` (`type`);--> statement-breakpoint
CREATE INDEX `orders_contact_idx` ON `orders` (`contact_id`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `orders_invoice_date_idx` ON `orders` (`invoice_date`);--> statement-breakpoint
CREATE INDEX `orders_due_date_idx` ON `orders` (`due_date`);--> statement-breakpoint
CREATE INDEX `orders_type_status_idx` ON `orders` (`type`,`status`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`amount` integer NOT NULL,
	`payment_method` text NOT NULL,
	`payment_date` integer NOT NULL,
	`reference` text,
	`journal_entry_id` text,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `payments_order_idx` ON `payments` (`order_id`);--> statement-breakpoint
CREATE INDEX `payments_payment_date_idx` ON `payments` (`payment_date`);--> statement-breakpoint
CREATE INDEX `payments_journal_entry_idx` ON `payments` (`journal_entry_id`);--> statement-breakpoint
CREATE INDEX `payments_method_idx` ON `payments` (`payment_method`);--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`type` text NOT NULL,
	`quantity` integer NOT NULL,
	`reference_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `stock_movements_product_idx` ON `stock_movements` (`product_id`);--> statement-breakpoint
CREATE INDEX `stock_movements_type_idx` ON `stock_movements` (`type`);--> statement-breakpoint
CREATE INDEX `stock_movements_reference_idx` ON `stock_movements` (`reference_id`);--> statement-breakpoint
CREATE INDEX `stock_movements_created_at_idx` ON `stock_movements` (`created_at`);--> statement-breakpoint
CREATE INDEX `stock_movements_product_type_idx` ON `stock_movements` (`product_id`,`type`);