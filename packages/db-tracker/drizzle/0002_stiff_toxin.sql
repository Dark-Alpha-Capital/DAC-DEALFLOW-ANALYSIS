CREATE TABLE `WorkItem` (
	`id` text PRIMARY KEY NOT NULL,
	`trackerId` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'TODO' NOT NULL,
	`startDate` integer,
	`dueDate` integer,
	`tags` text DEFAULT '[]' NOT NULL,
	`createdBy` text,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`trackerId`) REFERENCES `ProjectTracker`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `work_item_tracker_created_idx` ON `WorkItem` (`trackerId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `work_item_tracker_status_idx` ON `WorkItem` (`trackerId`,`status`);