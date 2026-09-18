ALTER TABLE `game_sessions` ADD `lost` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_sessions` ADD `retryCount` int DEFAULT 0 NOT NULL;