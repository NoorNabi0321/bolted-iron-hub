CREATE TABLE `project_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`senderId` int NOT NULL,
	`senderName` varchar(255),
	`content` text NOT NULL,
	`mentions` text,
	`isAdminOnly` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_messages_id` PRIMARY KEY(`id`)
);
