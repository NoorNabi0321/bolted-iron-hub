CREATE TABLE `weekly_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`generatedBy` int NOT NULL,
	`reportDate` timestamp NOT NULL DEFAULT (now()),
	`weekStartDate` timestamp,
	`weekEndDate` timestamp,
	`totalProjects` int NOT NULL DEFAULT 0,
	`totalCompleted` int NOT NULL DEFAULT 0,
	`totalItems` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weekly_reports_id` PRIMARY KEY(`id`)
);
