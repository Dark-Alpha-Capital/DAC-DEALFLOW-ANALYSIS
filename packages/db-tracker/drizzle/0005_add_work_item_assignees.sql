CREATE TABLE `WorkItemAssignee` (
	`workItemId` text NOT NULL,
	`userId` text NOT NULL,
	`assignedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	PRIMARY KEY(`workItemId`, `userId`),
	FOREIGN KEY (`workItemId`) REFERENCES `WorkItem`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `work_item_assignee_user_idx` ON `WorkItemAssignee` (`userId`);
