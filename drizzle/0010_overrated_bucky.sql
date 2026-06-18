CREATE TABLE `whatsapp_group_admins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`adminPhoneNumber` varchar(20) NOT NULL,
	`adminName` varchar(255),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `whatsapp_group_admins_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `whatsapp_group_command_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`command` varchar(50) NOT NULL,
	`allowedForAdmins` boolean NOT NULL DEFAULT true,
	`allowedForMembers` boolean NOT NULL DEFAULT false,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `whatsapp_group_command_permissions_id` PRIMARY KEY(`id`)
);
