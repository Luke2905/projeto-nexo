import { describe, expect, it } from "vitest";
import { DAILY_CATALOG_V3, FREE_CATALOGS } from "./dailyCatalogV3";
import { evaluateGuess } from "./engine";
import {
  precomputedSemanticRank,
  SEMANTIC_NEIGHBOR_LIMIT,
  SEMANTIC_VOCABULARY_SIZE,
} from "./semanticRanks";

describe("precomputed Portuguese semantic rankings", () => {
  it("covers every challenge answer and keeps it at rank one", () => {
    expect(SEMANTIC_VOCABULARY_SIZE).toBeGreaterThan(20_000);
    expect(SEMANTIC_NEIGHBOR_LIMIT).toBe(2_048);
    for (const entry of DAILY_CATALOG_V3) {
      expect(precomputedSemanticRank(entry.word, entry.word), entry.word).toBe(1);
    }
  });

  it("orders meaning rather than spelling and preserves editorial aliases", () => {
    const water = FREE_CATALOGS.easy.find(entry => entry.word === "água")!;
    const liquid = evaluateGuess("líquido", water);
    const ocean = evaluateGuess("oceano", water);
    const chair = evaluateGuess("cadeira", water);

    expect(liquid.rank).toBe(5); // curated synonym override
    expect(ocean.rank).toBeLessThan(chair.rank);
    expect(liquid.proximity).toBeGreaterThan(ocean.proximity);
    expect(ocean.proximity).toBeGreaterThan(chair.proximity);
  });

  it("returns stable ranks across repeated requests", () => {
    const first = precomputedSemanticRank("gato", "cachorro");
    expect(first).toBeTypeOf("number");
    expect(precomputedSemanticRank("gato", "cachorro")).toBe(first);
  });
});

