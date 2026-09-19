import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, primaryKey } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  username: varchar("username", { length: 32 }).unique(),
  passwordHash: text("passwordHash"),
  name: text("name"),
  avatarUrl: text("avatarUrl"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const gameSessions = mysqlTable("game_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  challengeId: varchar("challengeId", { length: 96 }).notNull(),
  guesses: int("guesses").notNull().default(0),
  bestRank: int("bestRank").notNull().default(0),
  solved: int("solved").notNull().default(0),
  lost: int("lost").notNull().default(0),
  retryCount: int("retryCount").notNull().default(0),
  hintPenalty: int("hintPenalty").notNull().default(0),
  progressJson: text("progressJson"),
  verified: int("verified").notNull().default(0),
  totalGuesses: int("totalGuesses").notNull().default(0),
  completedAt: timestamp("completedAt"),
  playedAt: timestamp("playedAt").defaultNow().notNull(),
});

export const friendships = mysqlTable("friendships", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  friendUserId: int("friendUserId").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("accepted"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type GameSession = typeof gameSessions.$inferSelect;
export type Friendship = typeof friendships.$inferSelect;

export const nexoProfiles = mysqlTable("nexo_profiles", {
  userId: int("userId").primaryKey(),
  bio: varchar("bio", { length: 240 }).notNull().default(""),
  title: varchar("title", { length: 40 }).notNull().default("iniciante"),
  badges: text("badges"),
  accent: varchar("accent", { length: 16 }).notNull().default("coral"),
  visibility: mysqlEnum("visibility", ["public", "friends", "private"]).notNull().default("friends"),
  publishActivity: int("publishActivity").notNull().default(1),
  showRanking: int("showRanking").notNull().default(1),
});

export const nexoAchievements = mysqlTable("nexo_achievements", {
  userId: int("userId").notNull(),
  achievementId: varchar("achievementId", { length: 40 }).notNull(),
  unlockedAt: timestamp("unlockedAt"),
}, table => [primaryKey({ columns: [table.userId, table.achievementId] })]);

export const nexoBlocks = mysqlTable("nexo_blocks", {
  userId: int("userId").notNull(),
  blockedUserId: int("blockedUserId").notNull(),
}, table => [primaryKey({ columns: [table.userId, table.blockedUserId] })]);

export const nexoDailyChallenges = mysqlTable("nexo_daily_challenges", {
  date: varchar("date", { length: 10 }).primaryKey(),
  word: varchar("word", { length: 64 }).notNull(),
  prompt: varchar("prompt", { length: 255 }).notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  aliasesJson: text("aliases_json").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type NexoDailyChallenge = typeof nexoDailyChallenges.$inferSelect;

export const nexoFeedLikes = mysqlTable("nexo_feed_likes", {
  userId: int("userId").notNull(),
  eventId: varchar("eventId", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [primaryKey({ columns: [table.userId, table.eventId] })]);
