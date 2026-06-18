CREATE TABLE `whatsapp_admin_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`phoneNumber` varchar(20) NOT NULL,
	`role` enum('admin','super_admin') NOT NULL DEFAULT 'admin',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `whatsapp_admin_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `whatsapp_admin_users_phoneNumber_unique` UNIQUE(`phoneNumber`)
);
--> statement-breakpoint
CREATE TABLE `whatsapp_command_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`command` varchar(50) NOT NULL,
	`requiredRole` enum('admin','super_admin') NOT NULL DEFAULT 'admin',
	`description` text,
	`isEnabled` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `whatsapp_command_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `whatsapp_command_permissions_command_unique` UNIQUE(`command`)
);
