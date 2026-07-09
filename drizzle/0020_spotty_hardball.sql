CREATE TABLE `report_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`itemId` int NOT NULL,
	`weekStart` timestamp NOT NULL,
	`progress` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `report_snapshots_id` PRIMARY KEY(`id`)
);
