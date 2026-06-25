ALTER TABLE `change_orders` ADD `isChecklistItem` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `project_checklist_items` ADD `isActive` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `project_checklist_items` ADD `isUserAdded` boolean DEFAULT false NOT NULL;