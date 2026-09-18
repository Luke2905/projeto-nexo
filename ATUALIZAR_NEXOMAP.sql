-- NEXO — atualização NexoMap (banco existente, versão 0004).
-- Selecione o banco do Nexo no seu editor SQL antes de executar.
-- Faça um backup antes. Execute este arquivo UMA ÚNICA VEZ.
-- Não use database.sql para atualizar uma instalação existente.
-- Estas instruções só adicionam tabelas e colunas; não apagam dados.
-- Se algum comando falhar, PARE e não execute o registro ao final.
-- A publicação do novo código deve acontecer DEPOIS desta atualização.

-- 1. Novas tabelas e campos
CREATE TABLE `nexo_achievements` (
	`userId` int NOT NULL,
	`achievementId` varchar(40) NOT NULL,
	`unlockedAt` timestamp,
	CONSTRAINT `nexo_achievements_userId_achievementId_pk` PRIMARY KEY(`userId`,`achievementId`)
);


CREATE TABLE `nexo_blocks` (
	`userId` int NOT NULL,
	`blockedUserId` int NOT NULL,
	CONSTRAINT `nexo_blocks_userId_blockedUserId_pk` PRIMARY KEY(`userId`,`blockedUserId`)
);


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


ALTER TABLE `game_sessions` ADD `verified` int DEFAULT 0 NOT NULL;

ALTER TABLE `game_sessions` ADD `totalGuesses` int DEFAULT 0 NOT NULL;

ALTER TABLE `game_sessions` ADD `completedAt` timestamp;

-- 2. Registrar a migração aplicada para que o Drizzle não tente repeti-la.
-- Esta etapa pressupõe que seu banco já tinha a estrutura da versão 0004.
-- O registro só acontece se as três tabelas e três colunas novas existirem.
CREATE TABLE IF NOT EXISTS `__drizzle_migrations` (
  `id` serial PRIMARY KEY,
  `hash` text NOT NULL,
  `created_at` bigint
);

INSERT INTO `__drizzle_migrations` (`hash`, `created_at`)
SELECT 'd49d77e11886ffbc0cc1e01c92cffc635d6d9d5aa6597c413aa83b04991023f2', 1789758508129
WHERE NOT EXISTS (
  SELECT 1 FROM `__drizzle_migrations` WHERE `created_at` = 1789758508129
)
AND 3 = (
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = DATABASE()
  AND table_name IN ('nexo_profiles', 'nexo_achievements', 'nexo_blocks')
)
AND 3 = (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'game_sessions'
  AND column_name IN ('verified', 'totalGuesses', 'completedAt')
);

-- 3. Conferência: devem aparecer 3 tabelas, 3 colunas e o registro 0005.
SELECT table_name FROM information_schema.tables
WHERE table_schema = DATABASE()
AND table_name IN ('nexo_profiles', 'nexo_achievements', 'nexo_blocks');
SELECT column_name FROM information_schema.columns
WHERE table_schema = DATABASE() AND table_name = 'game_sessions'
AND column_name IN ('verified', 'totalGuesses', 'completedAt');
SELECT hash, created_at FROM `__drizzle_migrations`
WHERE created_at = 1789758508129;
