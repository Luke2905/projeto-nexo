CREATE DATABASE IF NOT EXISTS nexo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE nexo;

CREATE TABLE IF NOT EXISTS `users` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `openId` varchar(64) NOT NULL UNIQUE,
  `username` varchar(32) UNIQUE,
  `passwordHash` text,
  `name` text,
  `avatarUrl` text,
  `email` varchar(320),
  `loginMethod` varchar(64),
  `role` enum('user','admin') NOT NULL DEFAULT 'user',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `lastSignedIn` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `game_sessions` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `challengeId` varchar(96) NOT NULL,
  `guesses` int NOT NULL DEFAULT 0,
  `bestRank` int NOT NULL DEFAULT 0,
  `solved` int NOT NULL DEFAULT 0,
  `lost` int NOT NULL DEFAULT 0,
  `retryCount` int NOT NULL DEFAULT 0,
  `hintPenalty` int NOT NULL DEFAULT 0,
  `progressJson` text,
  `verified` int NOT NULL DEFAULT 0,
  `totalGuesses` int NOT NULL DEFAULT 0,
  `completedAt` timestamp NULL,
  `playedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `friendships` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `friendUserId` int NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'accepted',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- NexoMap: tabelas de perfil, conquistas e bloqueios.
CREATE TABLE IF NOT EXISTS `nexo_achievements` (
	`userId` int NOT NULL,
	`achievementId` varchar(40) NOT NULL,
	`unlockedAt` timestamp,
	CONSTRAINT `nexo_achievements_userId_achievementId_pk` PRIMARY KEY(`userId`,`achievementId`)
);

CREATE TABLE IF NOT EXISTS `nexo_blocks` (
	`userId` int NOT NULL,
	`blockedUserId` int NOT NULL,
	CONSTRAINT `nexo_blocks_userId_blockedUserId_pk` PRIMARY KEY(`userId`,`blockedUserId`)
);

CREATE TABLE IF NOT EXISTS `nexo_profiles` (
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
