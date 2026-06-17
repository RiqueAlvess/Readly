"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useProfileContext } from "@/lib/hooks/profileContext";
import { useToast } from "@/lib/hooks/useToast";
import {
  changeCredits,
  rollRarity,
  weightedBookPick,
  checkBadges,
  resetMonthlyLimitIfNeeded,
} from "@/lib/gamification";
import { RARITY } from "@/lib/constants";
import { timeAgo } from "@/lib/utils/format";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { FullPageSpinner, Spinner } from "@/components/ui/Spinner";
import { Coins, Gift } from "lucide-react";
import { BookCover } from "@/components/books/BookCover";
import { GachaReveal } from "@/components/gamification/GachaReveal";
import type {
  Book,
  LootboxType,
  RarityTier,
  MarketplaceListing,
  MarketplaceOffer,
  GachaInventoryItem,
} from "@/types";

type Tab = "gacha" | "marketplace";

interface ReceivedOffer extends MarketplaceOffer {
  offerer?: { id: string; full_name: string | null; avatar_url: string | null } | null;
  offered_book?: Book | null;
}
interface OwnedListing extends MarketplaceListing {
  offers: ReceivedOffer[];
}

function endOfWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = (7 - day) % 7 || 7;
  const end = new Date(now);
  end.setDate(now.getDate() + diff);
  end.setHours(23, 59, 59, 999);
  return end;
}

function Countdown() {
  const target = useMemo(() => endOfWeek().getTime(), []);
  const [left, setLeft] = useState(target - Date.now());
  useEffect(() => {
    const id = setInterval(() => setLeft(target - Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  const s = Math.max(0, Math.floor(left / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return (
    <span className="font-mono text-sm font-bold text-primary">
      {d}d {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:
      {String(sec).padStart(2, "0")}
    </span>
  );
}

export default function StorePage() {
  const supabase = getSupabaseBrowser();
  const { profile, reload } = useProfileContext();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>("gacha");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [lootboxes, setLootboxes] = useState<LootboxType[]>([]);
  const [featured, setFeatured] = useState<Book[]>([]);
  const [opening, setOpening] = useState<string | null>(null);

  const [revealOpen, setRevealOpen] = useState(false);
  const [revealBook, setRevealBook] = useState<Book | null>(null);
  const [revealRarity, setRevealRarity] = useState<RarityTier | null>(null);

  // Marketplace
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [ownedListings, setOwnedListings] = useState<OwnedListing[]>([]);
  const [myInventory, setMyInventory] = useState<GachaInventoryItem[]>([]);
  const [offerTarget, setOfferTarget] = useState<MarketplaceListing | null>(null);
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [actingOffer, setActingOffer] = useState<string | null>(null);

  const loadGacha = useCallback(async () => {
    const [{ data: lbs }, { data: feat }] = await Promise.all([
      supabase.from("lootbox_types").select("*").order("cost_credits"),
      supabase
        .from("books")
        .select("*")
        .in("rarity_tier", ["legendary", "rare"])
        .order("rarity_tier", { ascending: true })
        .limit(6),
    ]);
    // Silently ignore table-not-found errors (migration not run yet)
    setLootboxes((lbs as LootboxType[]) ?? []);
    setFeatured((feat as Book[]) ?? []);
  }, [supabase]);

  const loadMarketplace = useCallback(async () => {
    if (!profile) return;
    // Listings from others — ignore table-not-found errors silently
    const { data: others } = await supabase
      .from("marketplace_listings")
      .select("*, book:books(*), seller:profiles(*)")
      .eq("is_active", true)
      .neq("seller_id", profile.id)
      .order("created_at", { ascending: false });
    setListings((others as MarketplaceListing[]) ?? []);

    // My inventory available to offer (not downloaded, not listed)
    const { data: inv } = await supabase
      .from("gacha_inventory")
      .select("*, book:books(*)")
      .eq("user_id", profile.id)
      .eq("is_downloaded", false);
    const { data: myListings } = await supabase
      .from("marketplace_listings")
      .select("*")
      .eq("seller_id", profile.id)
      .eq("is_active", true);
    const listedIds = new Set((myListings ?? []).map((l) => l.inventory_item_id));
    setMyInventory(
      ((inv as GachaInventoryItem[]) ?? []).filter((i) => !listedIds.has(i.id))
    );

    // Offers received on my active listings
    const myListingIds = (myListings ?? []).map((l) => l.id);
    let received: OwnedListing[] = [];
    if (myListingIds.length) {
      const { data: offers, error: e4 } = await supabase
        .from("marketplace_offers")
        .select(
          "*, offerer:profiles!marketplace_offers_offerer_id_fkey(id, full_name, avatar_url), offered:gacha_inventory!marketplace_offers_offered_inventory_id_fkey(book:books(*))"
        )
        .in("listing_id", myListingIds)
        .eq("status", "pending");
      // ignore errors
      received = (myListings as MarketplaceListing[])
        .map((l) => ({
          ...l,
          offers: ((offers as any[]) ?? [])
            .filter((o) => o.listing_id === l.id)
            .map((o) => ({
              ...o,
              offered_book: o.offered?.book ?? null,
            })),
        }))
        .filter((l) => l.offers.length > 0);
      // attach book to owned listings
      const { data: olBooks } = await supabase
        .from("marketplace_listings")
        .select("id, book:books(*)")
        .in("id", myListingIds);
      const bookMap = new Map((olBooks ?? []).map((b: any) => [b.id, b.book]));
      received = received.map((l) => ({ ...l, book: bookMap.get(l.id) }));
    }
    setOwnedListings(received);
  }, [supabase, profile]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await loadGacha();
      await loadMarketplace();
    } catch (e: any) {
      setError(e.message || "Erro ao carregar a loja.");
    } finally {
      setLoading(false);
    }
  }, [loadGacha, loadMarketplace]);

  useEffect(() => {
    if (profile) loadAll();
  }, [profile, loadAll]);

  async function openLootbox(lb: LootboxType) {
    if (!profile) return;
    setOpening(lb.id);
    try {
      // Check and reset monthly limit if new month
      await resetMonthlyLimitIfNeeded(supabase as any, profile.id);

      // Enforce monthly purchase limit (10 per month by default)
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("monthly_books_purchased, monthly_book_limit")
        .eq("id", profile.id)
        .single();
      const purchased = currentProfile?.monthly_books_purchased ?? 0;
      const limit = currentProfile?.monthly_book_limit ?? 10;
      if (purchased >= limit) {
        toast(`Limite mensal de ${limit} caixas atingido. Reinicia no início do próximo mês.`, "error");
        return;
      }

      const balance = await changeCredits(
        supabase as any,
        profile.id,
        lb.cost_credits,
        "spend",
        `Lootbox: ${lb.name}`
      );
      if (balance === null) {
        toast("Créditos insuficientes", "error");
        return;
      }
      await reload();

      // candidate books
      let q = supabase.from("books").select("*");
      if (lb.genre_filter) q = q.eq("genre", lb.genre_filter);
      const { data: candidates, error } = await q;
      if (error) throw error;
      const pool = (candidates as Book[]) ?? [];
      if (!pool.length) {
        toast("Nenhum livro disponível nesta categoria.", "error");
        return;
      }

      const rarity = rollRarity(lb.rarity_chances);
      let byRarity = pool.filter((b) => b.rarity_tier === rarity);
      if (!byRarity.length) byRarity = pool;
      const picked = weightedBookPick(byRarity);
      if (!picked) {
        toast("Não foi possível sortear um livro.", "error");
        return;
      }
      const finalRarity = picked.rarity_tier ?? rarity;

      const { error: pullErr } = await supabase.from("gacha_pulls").insert({
        user_id: profile.id,
        lootbox_type_id: lb.id,
        book_id: picked.id,
        rarity: finalRarity,
      });
      if (pullErr) throw pullErr;
      const { error: invErr } = await supabase.from("gacha_inventory").insert({
        user_id: profile.id,
        book_id: picked.id,
        is_downloaded: false,
      });
      if (invErr) throw invErr;

      // Increment monthly purchase counter
      await supabase
        .from("profiles")
        .update({ monthly_books_purchased: purchased + 1 })
        .eq("id", profile.id);

      checkBadges(supabase as any, profile.id);

      setRevealBook(picked);
      setRevealRarity(finalRarity);
      setRevealOpen(true);
    } catch (e: any) {
      toast(e.message || "Erro ao abrir lootbox.", "error");
    } finally {
      setOpening(null);
    }
  }

  function closeReveal() {
    setRevealOpen(false);
    setRevealBook(null);
    setRevealRarity(null);
    loadMarketplace().catch(() => {});
  }

  async function submitOffer(inventoryId: string) {
    if (!offerTarget || !profile) return;
    setSubmittingOffer(true);
    try {
      const { error } = await supabase.from("marketplace_offers").insert({
        listing_id: offerTarget.id,
        offerer_id: profile.id,
        offered_inventory_id: inventoryId,
        status: "pending",
      });
      if (error) throw error;
      toast("Oferta enviada!", "success");
      setOfferTarget(null);
      await loadMarketplace();
    } catch (e: any) {
      toast(e.message || "Erro ao enviar oferta.", "error");
    } finally {
      setSubmittingOffer(false);
    }
  }

  async function declineOffer(offer: ReceivedOffer) {
    setActingOffer(offer.id);
    try {
      const { error } = await supabase
        .from("marketplace_offers")
        .update({ status: "declined" })
        .eq("id", offer.id);
      if (error) throw error;
      toast("Oferta recusada.", "info");
      await loadMarketplace();
    } catch (e: any) {
      toast(e.message || "Erro ao recusar.", "error");
    } finally {
      setActingOffer(null);
    }
  }

  async function acceptOffer(listing: OwnedListing, offer: ReceivedOffer) {
    if (!profile) return;
    setActingOffer(offer.id);
    try {
      // swap ownership: offered item -> me ; my listed item -> offerer
      const { error: e1 } = await supabase
        .from("gacha_inventory")
        .update({ user_id: profile.id })
        .eq("id", offer.offered_inventory_id);
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("gacha_inventory")
        .update({ user_id: offer.offerer_id })
        .eq("id", listing.inventory_item_id);
      if (e2) throw e2;
      const { error: e3 } = await supabase
        .from("marketplace_offers")
        .update({ status: "accepted" })
        .eq("id", offer.id);
      if (e3) throw e3;
      // decline remaining offers and close listing
      await supabase
        .from("marketplace_offers")
        .update({ status: "declined" })
        .eq("listing_id", listing.id)
        .eq("status", "pending");
      await supabase
        .from("marketplace_listings")
        .update({ is_active: false })
        .eq("id", listing.id);
      toast("Troca realizada!", "success");
      await loadMarketplace();
    } catch (e: any) {
      toast(e.message || "Erro ao aceitar oferta.", "error");
    } finally {
      setActingOffer(null);
    }
  }

  if (!profile || loading) return <FullPageSpinner />;

  return (
    <div className="space-y-5 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Loja</h1>
        <div className="flex items-center gap-1.5 rounded-full bg-surface-light px-3 py-1.5 text-sm font-bold">
          <Coins size={15} className="text-primary" strokeWidth={2} />
          {profile.credits}
        </div>
      </div>

      {/* Segmented control */}
      <div className="flex rounded-2xl bg-surface-light p-1">
        {(["gacha", "marketplace"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "flex-1 rounded-xl py-2 text-sm font-semibold transition " +
              (tab === t ? "bg-primary text-on-primary shadow-neu" : "text-on-surface-muted")
            }
          >
            {t === "gacha" ? "Loja Gacha" : "Marketplace"}
          </button>
        ))}
      </div>

      {tab === "gacha" ? (
        <div className="space-y-6">
          {/* Featured */}
          {featured.length > 0 && (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold">Em Destaque</h2>
                <div className="text-right text-xs text-on-surface-muted">
                  Termina em
                  <br />
                  <Countdown />
                </div>
              </div>
              <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
                {featured.map((b) => (
                  <div key={b.id} className="w-28 shrink-0">
                    <BookCover url={b.cover_url} title={b.title} author={b.author} />
                    <div className="mt-1">
                      <Badge color={RARITY[b.rarity_tier].color}>
                        {RARITY[b.rarity_tier].emoji} {RARITY[b.rarity_tier].label}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Lootboxes */}
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold">Caixas</h2>
            {lootboxes.length === 0 && (
              <Card className="py-6 text-center">
                <div className="flex justify-center mb-2">
                  <Gift size={32} className="text-on-surface-muted" strokeWidth={1.5} />
                </div>
                <p className="font-semibold text-on-surface">Nenhuma caixa disponível</p>
                <p className="mt-1 text-xs text-on-surface/50">
                  Execute a migração SQL no Supabase para liberar as lootboxes.
                </p>
              </Card>
            )}
            {lootboxes.map((lb) => (
              <Card key={lb.id} className="flex gap-4">
                <div className="text-4xl">{lb.icon || <Gift size={40} className="text-primary" strokeWidth={1.2} />}</div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display font-bold">{lb.name}</h3>
                  {lb.description && (
                    <p className="text-xs text-on-surface-muted">{lb.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge color={RARITY.legendary.color}>
                      {RARITY.legendary.emoji} {lb.rarity_chances.legendary}%
                    </Badge>
                    <Badge color={RARITY.rare.color}>
                      {RARITY.rare.emoji} {lb.rarity_chances.rare}%
                    </Badge>
                    <Badge color={RARITY.common.color}>
                      {RARITY.common.emoji} {lb.rarity_chances.common}%
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-sm font-bold">
                      <Coins size={13} className="text-primary" strokeWidth={2} />
                      {lb.cost_credits}
                    </span>
                    <Button
                      size="sm"
                      loading={opening === lb.id}
                      disabled={opening !== null}
                      onClick={() => openLootbox(lb)}
                    >
                      Abrir
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </section>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Received offers */}
          {ownedListings.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-display text-lg font-bold">Minhas ofertas recebidas</h2>
              {ownedListings.map((l) => (
                <Card key={l.id} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 shrink-0">
                      <BookCover
                        url={l.book?.cover_url}
                        title={l.book?.title || "Livro"}
                        author={l.book?.author}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{l.book?.title}</p>
                      <p className="text-xs text-on-surface-muted">
                        {l.offers.length} oferta(s)
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {l.offers.map((o) => (
                      <div
                        key={o.id}
                        className="flex items-center gap-2 rounded-xl bg-surface-light p-2"
                      >
                        <Avatar
                          src={o.offerer?.avatar_url}
                          name={o.offerer?.full_name}
                          size={28}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold">
                            {o.offerer?.full_name || "Leitor"}
                          </p>
                          <p className="truncate text-[11px] text-on-surface-muted">
                            oferece: {o.offered_book?.title || "—"}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          loading={actingOffer === o.id}
                          onClick={() => acceptOffer(l, o)}
                        >
                          Aceitar
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={actingOffer === o.id}
                          onClick={() => declineOffer(o)}
                        >
                          Recusar
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </section>
          )}

          {/* Listings */}
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold">Marketplace</h2>
            {listings.length === 0 ? (
              <Card className="text-center text-sm text-on-surface-muted">
                Nenhuma oferta disponível no momento.
              </Card>
            ) : (
              listings.map((l) => (
                <Card key={l.id} className="flex gap-3">
                  <div className="w-14 shrink-0">
                    <BookCover
                      url={l.book?.cover_url}
                      title={l.book?.title || "Livro"}
                      author={l.book?.author}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{l.book?.title}</p>
                    <p className="truncate text-xs text-on-surface-muted">
                      {l.book?.author}
                    </p>
                    {l.book && (
                      <Badge color={RARITY[l.book.rarity_tier].color} className="mt-1">
                        {RARITY[l.book.rarity_tier].emoji}{" "}
                        {RARITY[l.book.rarity_tier].label}
                      </Badge>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-on-surface-muted">
                        <Avatar
                          src={l.seller?.avatar_url}
                          name={l.seller?.full_name}
                          size={20}
                        />
                        {l.seller?.full_name || "Vendedor"}
                        <span>· {timeAgo(l.created_at)}</span>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => setOfferTarget(l)}>
                        Fazer oferta
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </section>
        </div>
      )}

      {/* Offer modal */}
      <Modal
        open={!!offerTarget}
        onClose={() => setOfferTarget(null)}
        title="Escolha um livro para oferecer"
      >
        {myInventory.length === 0 ? (
          <p className="py-6 text-center text-sm text-on-surface-muted">
            Você não tem livros disponíveis para troca. Abra caixas na Loja Gacha!
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {myInventory.map((inv) => (
              <button
                key={inv.id}
                disabled={submittingOffer}
                onClick={() => submitOffer(inv.id)}
                className="text-left disabled:opacity-50"
              >
                <BookCover
                  url={inv.book?.cover_url}
                  title={inv.book?.title || "Livro"}
                  author={inv.book?.author}
                />
                <p className="mt-1 truncate text-[11px] font-semibold">
                  {inv.book?.title}
                </p>
              </button>
            ))}
          </div>
        )}
        {submittingOffer && (
          <div className="mt-3 flex justify-center">
            <Spinner />
          </div>
        )}
      </Modal>

      <GachaReveal
        open={revealOpen}
        onClose={closeReveal}
        book={revealBook}
        rarity={revealRarity}
      />
    </div>
  );
}
