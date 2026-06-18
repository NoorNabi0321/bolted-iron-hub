CREATE TABLE `financials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`contractValue` decimal(14,2),
	`amountBilled` decimal(14,2),
	`amountReceived` decimal(14,2),
	`subcontractorPayout` decimal(14,2),
	`billingStatus` enum('Not Started','Partial','Fully Billed','Paid') DEFAULT 'Not Started',
	`notes` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financials_id` PRIMARY KEY(`id`),
	CONSTRAINT `financials_projectId_unique` UNIQUE(`projectId`)
);
--> statement-breakpoint
CREATE TABLE `project_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`subcontractorId` int NOT NULL,
	`role` varchar(100),
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`uploaderId` int NOT NULL,
	`uploaderName` varchar(255),
	`fileName` varchar(255) NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`fileUrl` text NOT NULL,
	`mimeType` varchar(100),
	`fileSize` int,
	`isAdminOnly` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`authorId` int NOT NULL,
	`authorName` varchar(255),
	`content` text NOT NULL,
	`isAdminOnly` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`address` text,
	`borough` varchar(100),
	`gcCompany` varchar(255),
	`gcContactName` varchar(255),
	`gcContactPhone` varchar(50),
	`gcContactEmail` varchar(320),
	`siteSuperName` varchar(255),
	`siteSuperPhone` varchar(50),
	`status` enum('Shop Drawings','Fabrication','On-Site','Installed','Inspection Passed') NOT NULL DEFAULT 'Shop Drawings',
	`startDate` timestamp,
	`estimatedEndDate` timestamp,
	`actualEndDate` timestamp,
	`description` text,
	`isArchived` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subcontractors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyName` varchar(255) NOT NULL,
	`contactName` varchar(255),
	`email` varchar(320),
	`phone` varchar(50),
	`trade` varchar(100),
	`notes` text,
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subcontractors_id` PRIMARY KEY(`id`)
);
