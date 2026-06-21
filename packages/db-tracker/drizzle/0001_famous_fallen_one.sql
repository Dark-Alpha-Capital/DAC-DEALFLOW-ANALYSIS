CREATE TABLE `ProjectStageEvent` (
	`id` text PRIMARY KEY NOT NULL,
	`trackerId` text NOT NULL,
	`fromStage` text,
	`toStage` text NOT NULL,
	`changedBy` text,
	`note` text,
	`createdAt` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`trackerId`) REFERENCES `ProjectTracker`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`changedBy`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `project_stage_event_tracker_created_idx` ON `ProjectStageEvent` (`trackerId`,`createdAt`);--> statement-breakpoint
ALTER TABLE `ProjectTracker` ADD `stage` text DEFAULT 'KICKOFF' NOT NULL;--> statement-breakpoint
ALTER TABLE `ProjectTracker` ADD `stageChangedAt` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `ProjectTracker` SET `stageChangedAt` = `createdAt` WHERE `stageChangedAt` = 0;--> statement-breakpoint
CREATE INDEX `project_tracker_stage_idx` ON `ProjectTracker` (`stage`);
