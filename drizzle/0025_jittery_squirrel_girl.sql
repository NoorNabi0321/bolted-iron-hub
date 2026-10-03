CREATE INDEX `change_orders_projectId_idx` ON `change_orders` (`projectId`);--> statement-breakpoint
CREATE INDEX `checklist_activity_projectId_idx` ON `checklist_activity` (`projectId`);--> statement-breakpoint
CREATE INDEX `checklist_activity_createdAt_idx` ON `checklist_activity` (`createdAt`);--> statement-breakpoint
CREATE INDEX `project_assignments_projectId_idx` ON `project_assignments` (`projectId`);--> statement-breakpoint
CREATE INDEX `project_assignments_subcontractorId_idx` ON `project_assignments` (`subcontractorId`);--> statement-breakpoint
CREATE INDEX `project_checklist_items_projectId_idx` ON `project_checklist_items` (`projectId`);--> statement-breakpoint
CREATE INDEX `project_checklists_projectId_idx` ON `project_checklists` (`projectId`);--> statement-breakpoint
CREATE INDEX `project_files_projectId_idx` ON `project_files` (`projectId`);--> statement-breakpoint
CREATE INDEX `project_messages_projectId_idx` ON `project_messages` (`projectId`);--> statement-breakpoint
CREATE INDEX `project_notes_projectId_idx` ON `project_notes` (`projectId`);--> statement-breakpoint
CREATE INDEX `project_proposals_projectId_idx` ON `project_proposals` (`projectId`);--> statement-breakpoint
CREATE INDEX `projects_status_idx` ON `projects` (`status`);--> statement-breakpoint
CREATE INDEX `projects_startDate_idx` ON `projects` (`startDate`);--> statement-breakpoint
CREATE INDEX `report_snapshots_projectId_weekStart_idx` ON `report_snapshots` (`projectId`,`weekStart`);