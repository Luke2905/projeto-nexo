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
  `progressJson` text,
  `playedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `friendships` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `friendUserId` int NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'accepted',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
