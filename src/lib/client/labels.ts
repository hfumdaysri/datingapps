export const APP_NAME = "Ayok Kita Ngedate";
export const TAGLINE = "yaa meskipun online semoga seru deh xixixi ❤️";

/** Display names (Indonesian). Database values stay stable English keys. */
export const CATEGORY_LABEL: Record<string, string> = {
  Fun: "Seru",
  Sweet: "Manis",
  Romantic: "Romantis",
  Deep: "Dalam",
  Life: "Hidup",
  Relationship: "Hubungan",
  Memories: "Kenangan",
  Future: "Masa Depan",
  Understanding: "Saling Memahami",
  Vulnerable: "Lebih Pribadi",
};

export const categoryLabel = (c: string | undefined | null) => (c ? (CATEGORY_LABEL[c] ?? c) : "");

/** The SQL projection labels Truth themes as "<Category> Truth"; show them in Indonesian. */
export function themeLabel(label: string) {
  const category = label.replace(/ Truth$/, "");
  return `Jujur ${categoryLabel(category)}`;
}
