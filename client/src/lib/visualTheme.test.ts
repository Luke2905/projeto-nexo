import { afterEach, describe, expect, it, vi } from "vitest";
import {
  readVisualTheme,
  saveVisualTheme,
  VISUAL_THEME_KEY,
} from "./visualTheme";

afterEach(() => vi.unstubAllGlobals());

function browserStorage(initial?: string) {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set(VISUAL_THEME_KEY, initial);
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
  return values;
}

describe("visual theme preference", () => {
  it("defaults new visitors to Cyber", () => {
    browserStorage();
    expect(readVisualTheme()).toBe("cyber");
  });

  it.each(["cartoon", "cyber"] as const)(
    "restores the saved %s appearance",
    theme => {
      browserStorage();
      expect(saveVisualTheme(theme)).toBe(true);
      expect(readVisualTheme()).toBe(theme);
    }
  );

  it.each(["dark", "unknown", "", '{"theme":"cartoon"}'])(
    "ignores an invalid stored value: %s",
    value => {
      browserStorage(value);
      expect(readVisualTheme()).toBe("cyber");
    }
  );

  it("keeps the old light/dark preference separate", () => {
    const values = browserStorage();
    values.set("theme", "dark");
    saveVisualTheme("cartoon");
    expect(values.get("theme")).toBe("dark");
    expect(readVisualTheme()).toBe("cartoon");
  });

  it("handles browsers that deny access to storage", () => {
    vi.stubGlobal("window", {
      get localStorage() {
        throw new Error("Storage access denied");
      },
    });
    expect(readVisualTheme()).toBe("cyber");
    expect(saveVisualTheme("cartoon")).toBe(false);
  });

  it("reports a failed save without throwing when storage is full", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => "cartoon",
        setItem: () => {
          throw new Error("Quota exceeded");
        },
      },
    });
    expect(readVisualTheme()).toBe("cartoon");
    expect(saveVisualTheme("cyber")).toBe(false);
  });
});
