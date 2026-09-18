// Explicit allowlist: these procedures never read a user or access the database.
// Keep them separate from authenticated batches so TiDB startup cannot delay play.
export const PUBLIC_CHALLENGE_PATHS = [
  "challenges.getDaily",
  "challenges.getDailyArchive",
  "challenges.getThemes",
  "challenges.getHint",
  "challenges.submitGuess",
] as const;

export function isPublicChallengePath(path: string): boolean {
  return (PUBLIC_CHALLENGE_PATHS as readonly string[]).includes(path);
}
