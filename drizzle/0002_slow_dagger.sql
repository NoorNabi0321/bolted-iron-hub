CREATE TABLE `change_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`orderNumber` varchar(50) NOT NULL,
	`description` text NOT NULL,
	`amount` decimal(14,2) NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`createdBy` varchar(255),
	`approvedBy` varchar(255),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`approvedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `change_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_checklists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`isCompleted` boolean NOT NULL DEFAULT false,
	`completedBy` varchar(255),
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_checklists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `projects` ADD `primarySubcontractorId` int;--> statement-breakpoint
ALTER TABLE `projects` ADD `proposalFileUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `permission` enum('view','edit','admin') DEFAULT 'view' NOT NULL;