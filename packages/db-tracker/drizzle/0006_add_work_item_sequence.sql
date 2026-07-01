ALTER TABLE `WorkItem` ADD `sequence` integer;
--> statement-breakpoint
UPDATE `WorkItem` SET `sequence` = (
  SELECT COUNT(*) FROM `WorkItem` AS w2
  WHERE w2.`trackerId` = `WorkItem`.`trackerId`
    AND (
      w2.`createdAt` < `WorkItem`.`createdAt`
      OR (w2.`createdAt` = `WorkItem`.`createdAt` AND w2.`id` <= `WorkItem`.`id`)
    )
);
