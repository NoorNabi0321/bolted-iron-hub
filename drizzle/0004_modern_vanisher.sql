ALTER TABLE `project_checklists` ADD `cost` decimal(14,2);--> statement-breakpoint
ALTER TABLE `project_checklists` ADD `costUpdatedBy` varchar(255);--> statement-breakpoint
ALTER TABLE `project_checklists` ADD `costUpdatedAt` timestamp;