import type { SupabaseClient } from "@supabase/supabase-js";
import { XP_ACTIONS, XPActionType, getRankForXP, RARITY } from "./constants";
import type { Book, RarityTier } from "@/types";

/**
 * Award XP to a user. Records a transaction, increments profile.xp and
 * recomputes rank. Returns the new total XP, or null on failure.
 */
export async function awardXP(
  supabase: SupabaseClient,
  userId: string,
  action: XPActionType,
  referenceId?: string
): Promise<{ xp: number; rank: string } | null> {
  const amount = XP_ACTIONS[action];
  try {
    await supabase.from("xp_transactions").insert({
      user_id: userId,
      amount,
      action_type: action,
      reference_id: referenceId ?? null,
    });

    const { data: profile } = await supabase
      .from("profiles")
      .select("xp")
      .eq("id", userId)
      .single();

    const newXP = (profile?.xp ?? 0) + amount;
    const rank = getRankForXP(newXP).key;

    await supabase
      .from("profiles")
      .update({ xp: newXP, rank })
      .eq("id", userId);

    return { xp: newXP, rank };
  } catch (e) {
    console.error("awardXP failed", e);
    return null;
  }
}

export async function changeCredits(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  type: "earn" | "spend",
  reason: string
): Promise<number | null> {
  try {
    const delta = type === "spend" ? -Math.abs(amount) : Math.abs(amount);
    const { data: profile } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", userId)
      .single();
    const current = profile?.credits ?? 0;
    if (type === "spend" && current < Math.abs(amount)) return null; // insufficient
    const next = current + delta;
    await supabase.from("credit_transactions").insert({
      user_id: userId,
      amount: Math.abs(amount),
      type,
      reason,
    });
    await supabase.from("profiles").update({ credits: next }).eq("id", userId);
    return next;
  } catch (e) {
    console.error("changeCredits failed", e);
    return null;
  }
}

/** Weighted random rarity pick from a lootbox's rarity chances. */
export function rollRarity(chances: {
  common: number;
  rare: number;
  legendary: number;
}): RarityTier {
  const total = chances.common + chances.rare + chances.legendary;
  const r = Math.random() * total;
  if (r < chances.legendary) return "legendary";
  if (r < chances.legendary + chances.rare) return "rare";
  return "common";
}

/** Weighted pick of a book from a pool using gacha_weight. */
export function weightedBookPick(books: Book[]): Book | null {
  if (books.length === 0) return null;
  const total = books.reduce((s, b) => s + (b.gacha_weight || 1), 0);
  let r = Math.random() * total;
  for (const b of books) {
    r -= b.gacha_weight || 1;
    if (r <= 0) return b;
  }
  return books[books.length - 1];
}

export { RARITY };
