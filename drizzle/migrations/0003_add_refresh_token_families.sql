CREATE TABLE `family_revocation` (
	`id` text PRIMARY KEY NOT NULL,
	`familyId` text NOT NULL,
	`expiresAt` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `family_revocation_familyId_unique` ON `family_revocation` (`familyId`);--> statement-breakpoint
CREATE TABLE `rotated_token` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`familyId` text NOT NULL,
	`consumed` integer DEFAULT false NOT NULL,
	`expiresAt` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rotated_token_token_unique` ON `rotated_token` (`token`);--> statement-breakpoint
CREATE INDEX `rotated_token_family_id_idx` ON `rotated_token` (`familyId`);--> statement-breakpoint
ALTER TABLE `session` ADD `familyId` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `session_family_id_idx` ON `session` (`familyId`);--> statement-breakpoint
UPDATE `session` SET `familyId` = `id`;
