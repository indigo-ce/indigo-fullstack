CREATE INDEX `family_revocation_expires_at_idx` ON `family_revocation` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `rotated_token_expires_at_idx` ON `rotated_token` (`expiresAt`);