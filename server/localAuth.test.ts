import { describe, expect, it } from "vitest";
import { hashPassword, normalizeUsername, verifyPassword } from "./localAuth";

describe("local authentication", () => {
  it("hashes passwords with a unique salt and verifies only the correct password", async () => {
    const first = await hashPassword("senha-segura-123");
    const second = await hashPassword("senha-segura-123");
    expect(first).not.toBe(second);
    expect(first).not.toContain("senha-segura-123");
    expect(await verifyPassword("senha-segura-123", first)).toBe(true);
    expect(await verifyPassword("senha-incorreta", first)).toBe(false);
  });

  it("normalizes usernames consistently", () => {
    expect(normalizeUsername("  Jogador_Nexo ")).toBe("jogador_nexo");
  });
});
