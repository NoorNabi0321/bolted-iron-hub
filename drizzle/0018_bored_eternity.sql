CREATE TABLE `checklist_activity` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`itemId` int NOT NULL,
	`itemText` text NOT NULL,
	`action` enum('completed','reopened','progress_updated') NOT NULL,
	`progress` int,
	`actorName` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `checklist_activity_id` PRIMARY KEY(`id`)
);
