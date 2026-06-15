CREATE TABLE `Account` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`accountId` text NOT NULL,
	`providerId` text NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`accessTokenExpiresAt` integer,
	`refreshTokenExpiresAt` integer,
	`scope` text,
	`idToken` text,
	`password` text,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ProjectKickoffScreening` (
	`id` text PRIMARY KEY NOT NULL,
	`kickoffId` text NOT NULL,
	`workflowInstanceId` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`score` real,
	`analysis` text,
	`screenedAt` integer,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`kickoffId`) REFERENCES `ProjectKickoff`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workflowInstanceId`) REFERENCES `WorkflowJob`(`instanceId`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `project_kickoff_screening_kickoff_created_idx` ON `ProjectKickoffScreening` (`kickoffId`,`createdAt`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_kickoff_screening_workflow_unique_idx` ON `ProjectKickoffScreening` (`workflowInstanceId`);--> statement-breakpoint
CREATE TABLE `ProjectKickoff` (
	`id` text PRIMARY KEY NOT NULL,
	`projectName` text NOT NULL,
	`department` text,
	`projectOwners` text,
	`productDirection` text,
	`engineeringLead` text,
	`objectives` text NOT NULL,
	`platformEnables` text,
	`keyDeliverables` text,
	`risksAndBlockers` text,
	`raciMatrix` text,
	`timeline` text,
	`chosenTool` text,
	`techStack` text,
	`definitionOfDone` text,
	`additionalNotes` text,
	`rawText` text,
	`structuredData` text,
	`userId` text,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `project_kickoff_user_created_idx` ON `ProjectKickoff` (`userId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `ProjectTracker` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sourceType` text DEFAULT 'PROJECT_KICKOFF' NOT NULL,
	`kickoffId` text NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`createdBy` text,
	FOREIGN KEY (`kickoffId`) REFERENCES `ProjectKickoff`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_tracker_kickoff_unique_idx` ON `ProjectTracker` (`kickoffId`);--> statement-breakpoint
CREATE TABLE `ScreenerTemplate` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text DEFAULT 'Project Screener' NOT NULL,
	`description` text,
	`content` text,
	`department` text,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `screener_template_category_idx` ON `ScreenerTemplate` (`category`);--> statement-breakpoint
CREATE INDEX `screener_template_department_idx` ON `ScreenerTemplate` (`department`);--> statement-breakpoint
CREATE UNIQUE INDEX `screener_template_department_unique_idx` ON `ScreenerTemplate` (`department`);--> statement-breakpoint
CREATE TABLE `Session` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`userId` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Session_token_unique` ON `Session` (`token`);--> statement-breakpoint
CREATE TABLE `User` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`email` text NOT NULL,
	`emailVerified` integer DEFAULT false NOT NULL,
	`image` text,
	`role` text DEFAULT 'USER' NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`isBlocked` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `Verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `WorkflowJob` (
	`instanceId` text PRIMARY KEY NOT NULL,
	`workflowKind` text NOT NULL,
	`userId` text,
	`dealId` text,
	`fileName` text,
	`screenerId` text,
	`progressStep` text,
	`progressPercent` integer DEFAULT 0 NOT NULL,
	`state` text DEFAULT 'waiting' NOT NULL,
	`failedReason` text,
	`returnValue` text,
	`attemptsMade` integer DEFAULT 0 NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `workflow_job_user_created_idx` ON `WorkflowJob` (`userId`,`createdAt`);