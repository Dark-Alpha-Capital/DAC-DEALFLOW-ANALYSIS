CREATE TABLE `WorkItemEvent` (
	`id` text PRIMARY KEY NOT NULL,
	`workItemId` text NOT NULL,
	`userId` text,
	`kind` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`workItemId`) REFERENCES `WorkItem`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `work_item_event_item_idx` ON `WorkItemEvent` (`workItemId`,`createdAt`);
