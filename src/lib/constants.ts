// Shared constants: ranks, XP actions, genres

export interface RankDef {
  key: string;
  name: string;
  minXP: number;
  emoji: string;
  color: string;
}

export const RANKS: RankDef[] = [
  { key: "calouro", name: "Calouro", minXP: 0, emoji: "🌱", color: "#A9B8AE" },
  { key: "comum", name: "Leitor Comum", minXP: 1500, emoji: "📖", color: "#8FB98F" },
  { key: "devorador", name: "Devorador", minXP: 5000, emoji: "🔥", color: "#6FA8DC" },
  { key: "rato", name: "Rato de Biblioteca", minXP: 12000, emoji: "🐭", color: "#B07FD4" },
  { key: "erudito", name: "Erudito", minXP: 25000, emoji: "🎓", color: "#E0B341" },
  { key: "lendario", name: "Lendário", minXP: 50000, emoji: "👑", color: "#D4A89C" },
];

export function getRankForXP(xp: number): RankDef {
  let current = RANKS[0];
  for (const r of RANKS) {
    if (xp >= r.minXP) current = r;
  }
  return current;
}

export function getNextRank(xp: number): RankDef | null {
  for (const r of RANKS) {
    if (xp < r.minXP) return r;
  }
  return null;
}

export function rankProgress(xp: number): { current: RankDef; next: RankDef | null; pct: number } {
  const current = getRankForXP(xp);
  const next = getNextRank(xp);
  if (!next) return { current, next: null, pct: 100 };
  const span = next.minXP - current.minXP;
  const into = xp - current.minXP;
  return { current, next, pct: Math.min(100, Math.round((into / span) * 100)) };
}

// XP awards by action type
export const XP_ACTIONS = {
  book_read: 100,
  page_read: 10,
  diary_entry: 25,
  review_written: 50,
  collection_created: 30,
  post_published: 20,
  comment_written: 5,
  reaction: 3,
  streak_7day: 200,
  daily_login: 15,
} as const;

export type XPActionType = keyof typeof XP_ACTIONS;

export const GENRES = [
  "Romance",
  "Fantasia",
  "Ficção Científica",
  "Suspense",
  "Terror",
  "Biografia",
  "História",
  "Autoajuda",
  "Poesia",
  "Clássicos",
  "Aventura",
  "Mistério",
];

export const RARITY = {
  common: { label: "Comum", color: "#A9B8AE", emoji: "⚪" },
  rare: { label: "Raro", color: "#6FA8DC", emoji: "🔵" },
  legendary: { label: "Lendário", color: "#E0B341", emoji: "🟡" },
} as const;

export const STATUS_LABELS: Record<string, string> = {
  reading: "Lendo",
  read: "Lido",
  want_to_read: "Quero Ler",
  abandoned: "Abandonado",
};

export const EMOJI_PICKER = [
  "📚", "📖", "📕", "📗", "📘", "📙", "❤️", "⭐", "🔥", "🌙",
  "☀️", "🌸", "🍂", "✨", "🎯", "💎", "🏆", "🎨", "🧠", "💭",
  "🗺️", "🚀", "👻", "🔮", "🌊", "🏔️", "🌳", "🍷", "☕", "🎭",
];
