CREATE TABLE `Cycle` (
	`id` text PRIMARY KEY NOT NULL,
	`trackerId` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`startDate` integer NOT NULL,
	`endDate` integer NOT NULL,
	`status` text DEFAULT 'UPCOMING' NOT NULL,
	`sortOrder` integer DEFAULT 0 NOT NULL,
	`createdBy` text,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`trackerId`) REFERENCES `ProjectTracker`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `cycle_tracker_idx` ON `Cycle` (`trackerId`);--> statement-breakpoint
CREATE INDEX `cycle_status_idx` ON `Cycle` (`status`);--> statement-breakpoint
CREATE TABLE `Epic` (
	`id` text PRIMARY KEY NOT NULL,
	`trackerId` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`startDate` integer,
	`dueDate` integer,
	`sortOrder` integer DEFAULT 0 NOT NULL,
	`createdBy` text,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`trackerId`) REFERENCES `ProjectTracker`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `epic_tracker_idx` ON `Epic` (`trackerId`);--> statement-breakpoint
CREATE TABLE `InitiativeTracker` (
	`initiativeId` text NOT NULL,
	`trackerId` text NOT NULL,
	`addedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	PRIMARY KEY(`initiativeId`, `trackerId`),
	FOREIGN KEY (`initiativeId`) REFERENCES `Initiative`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`trackerId`) REFERENCES `ProjectTracker`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `Initiative` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`startDate` integer,
	`targetDate` integer,
	`color` text,
	`createdBy` text,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `Module` (
	`id` text PRIMARY KEY NOT NULL,
	`trackerId` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`leadUserId` text,
	`sortOrder` integer DEFAULT 0 NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`trackerId`) REFERENCES `ProjectTracker`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`leadUserId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `module_tracker_idx` ON `Module` (`trackerId`);--> statement-breakpoint
CREATE TABLE `View` (
	`id` text PRIMARY KEY NOT NULL,
	`trackerId` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`filters` text DEFAULT '{}' NOT NULL,
	`sortConfig` text DEFAULT '{}' NOT NULL,
	`groupBy` text,
	`displayProps` text DEFAULT '{}' NOT NULL,
	`isDefault` integer DEFAULT false NOT NULL,
	`createdBy` text,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`trackerId`) REFERENCES `ProjectTracker`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `view_tracker_idx` ON `View` (`trackerId`);--> statement-breakpoint
CREATE TABLE `WorkItemComment` (
	`id` text PRIMARY KEY NOT NULL,
	`workItemId` text NOT NULL,
	`userId` text,
	`parentCommentId` text,
	`content` text DEFAULT '' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`workItemId`) REFERENCES `WorkItem`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`parentCommentId`) REFERENCES `WorkItemComment`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `work_item_comment_work_item_idx` ON `WorkItemComment` (`workItemId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `work_item_comment_parent_idx` ON `WorkItemComment` (`parentCommentId`);--> statement-breakpoint
CREATE TABLE `WorkLog` (
	`id` text PRIMARY KEY NOT NULL,
	`workItemId` text NOT NULL,
	`userId` text,
	`hours` real NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`loggedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`workItemId`) REFERENCES `WorkItem`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `work_log_work_item_idx` ON `WorkLog` (`workItemId`);--> statement-breakpoint
CREATE INDEX `work_log_user_id_idx` ON `WorkLog` (`userId`);--> statement-breakpoint
ALTER TABLE `WorkItem` ADD `epicId` text REFERENCES Epic(id);--> statement-breakpoint
ALTER TABLE `WorkItem` ADD `cycleId` text REFERENCES Cycle(id);--> statement-breakpoint
ALTER TABLE `WorkItem` ADD `moduleId` text REFERENCES Module(id);--> statement-breakpoint
ALTER TABLE `WorkItem` ADD `estimatePoints` integer;--> statement-breakpoint
ALTER TABLE `WorkItem` ADD `estimateHours` real;--> statement-breakpoint
CREATE INDEX `work_item_epic_idx` ON `WorkItem` (`epicId`);--> statement-breakpoint
CREATE INDEX `work_item_cycle_idx` ON `WorkItem` (`cycleId`);--> statement-breakpoint
CREATE INDEX `work_item_module_idx` ON `WorkItem` (`moduleId`);