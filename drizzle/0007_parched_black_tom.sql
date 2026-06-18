CREATE TABLE `whatsapp_authorized_groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupChatId` varchar(255) NOT NULL,
	`groupName` varchar(255) NOT NULL,
	`isEnabled` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastActivityAt` timestamp,
	`notes` text,
	CONSTRAINT `whatsapp_authorized_groups_id` PRIMARY KEY(`id`),
	CONSTRAINT `whatsapp_authorized_groups_groupChatId_unique` UNIQUE(`groupChatId`)
);
--> statement-breakpoint
CREATE TABLE `whatsapp_messages_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupChatId` varchar(255) NOT NULL,
	`senderPhoneNumber` varchar(20) NOT NULL,
	`messageText` text NOT NULL,
	`commandType` varchar(50),
	`responseText` text,
	`status` enum('success','error','unauthorized') NOT NULL,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `whatsapp_messages_log_id` PRIMARY KEY(`id`)
);
