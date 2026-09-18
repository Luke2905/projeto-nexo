CREATE TABLE `nexo_achievements` (
	`userId` int NOT NULL,
	`achievementId` varchar(40) NOT NULL,
	`unlockedAt` timestamp,
	CONSTRAINT `nexo_achievements_userId_achievementId_pk` PRIMARY KEY(`userId`,`achievementId`)
);
--> statement-breakpoint
CREATE TABLE `nexo_blocks` (
	`userId` int NOT NULL,
	`blockedUserId` int NOT NULL,
	CONSTRAINT `nexo_blocks_userId_blockedUserId_pk` PRIMARY KEY(`userId`,`blockedUserId`)
);
--> statement-breakpoint
CREATE TABLE `nexo_profiles` (
	`userId` int NOT NULL,
	`bio` varchar(240) NOT NULL DEFAULT '',
	`title` varchar(40) NOT NULL DEFAULT 'iniciante',
	`badges` text,
	`accent` varchar(16) NOT NULL DEFAULT 'coral',
	`visibility` enum('public','friends','private') NOT NULL DEFAULT 'friends',
	`publishActivity` int NOT NULL DEFAULT 1,
	`showRanking` int NOT NULL DEFAULT 1,
	CONSTRAINT `nexo_profiles_userId` PRIMARY KEY(`userId`)
);
--> statement-breakpoint
ALTER TABLE `game_sessions` ADD `verified` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_sessions` ADD `totalGuesses` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_sessions` ADD `completedAt` timestamp;