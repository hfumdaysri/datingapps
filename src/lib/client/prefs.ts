import type { GameType } from "./api";

export const TRUTH_CATEGORIES = ["Fun", "Sweet", "Romantic", "Deep"];
export const DEEP_CATEGORIES = ["Life", "Relationship", "Memories", "Future", "Understanding"];

export type Prefs = { truthCategories: string[]; deepCategories: string[]; vulnerable: boolean };

export const DEFAULT_PREFS: Prefs = {
  truthCategories: TRUTH_CATEGORIES,
  deepCategories: DEEP_CATEGORIES,
  vulnerable: false, // opt-in, OFF by default
};

export function normalizePrefs(raw: Partial<Prefs> | null | undefined): Prefs {
  return {
    truthCategories: raw?.truthCategories?.length ? raw.truthCategories : DEFAULT_PREFS.truthCategories,
    deepCategories: raw?.deepCategories?.length ? raw.deepCategories : DEFAULT_PREFS.deepCategories,
    vulnerable: raw?.vulnerable === true,
  };
}

export function settingsFor(type: GameType, prefs: Prefs) {
  if (type === "truth_or_truth") return { categories: prefs.truthCategories, vulnerable: prefs.vulnerable };
  if (type === "deep_talk") {
    // "Vulnerable" is a real category; it is only drawn when the opt-in is on.
    const categories = prefs.vulnerable ? [...prefs.deepCategories, "Vulnerable"] : prefs.deepCategories;
    return { categories, vulnerable: prefs.vulnerable };
  }
  return { vulnerable: false };
}
