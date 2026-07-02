CREATE TABLE `ModuleMember` (
	`moduleId` text NOT NULL,
	`userId` text NOT NULL,
	`addedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	PRIMARY KEY(`moduleId`, `userId`),
	FOREIGN KEY (`moduleId`) REFERENCES `Module`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `module_member_user_idx` ON `ModuleMember` (`userId`);
