"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useProfileContext } from "@/lib/hooks/profileContext";
import { useToast } from "@/lib/hooks/useToast";
import { RARITY } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { BookCover } from "@/components/books/BookCover";
import type { GachaInventoryItem, MarketplaceListing } from "@/types";

interface InvItem extends GachaInventoryItem {
  is_listed: boolean;
  listing_id?: string;
}

export default function InventoryPage() {
  const supabase = getSupabaseBrowser();
  const { profile } = useProfileContext();
  const { toast } = useToast();

  const [items, setItems] = useState<InvItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const { data: inv, error: e1 } = await supabase
        .from("gacha_inventory")
        .select("*, book:books(*)")
        .eq("user_id", profile.id)
        .order("acquired_at", { ascending: false });
      if (e1) throw e1;

      const { data: listings, error: e2 } = await supabase
        .from("marketplace_listings")
        .select("id, inventory_item_id")
        .eq("seller_id", profile.id)
        .eq("is_active", true);
      if (e2) throw e2;

      const listMap = new Map(
        (listings as Pick<MarketplaceListing, "id" | "inventory_item_id">[] ?? []).map(
          (l) => [l.inventory_item_id, l.id]
        )
      );

      setItems(
        ((inv as GachaInventoryItem[]) ?? []).map((i) => ({
          ...i,
          is_listed: listMap.has(i.id),
          listing_id: listMap.get(i.id),
        }))
      );
    } catch (e: any) {
      setError(e.message || "Erro ao carregar o inventário.");
    } finally {
      setLoading(false);
    }
  }, [supabase, profile]);

  useEffect(() => {
    if (profile) load();
  }, [profile, load]);

  async function download(item: InvItem) {
    setBusy(item.id);
    try {
      const { error } = await supabase
        .from("gacha_inventory")
        .update({ is_downloaded: true })
        .eq("id", item.id);
      if (error) throw error;
      toast("Livro baixado! Agora é seu para sempre.", "success");
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_downloaded: true } : i))
      );
    } catch (e: any) {
      toast(e.message || "Erro ao baixar.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function publish(item: InvItem) {
    if (!profile) return;
    setBusy(item.id);
    try {
      const { data, error } = await supabase
        .from("marketplace_listings")
        .insert({
          seller_id: profile.id,
          inventory_item_id: item.id,
          book_id: item.book_id,
          is_active: true,
        })
        .select("id")
        .single();
      if (error) throw error;
      toast("Publicado no Marketplace!", "success");
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, is_listed: true, listing_id: data?.id } : i
        )
      );
    } catch (e: any) {
      toast(e.message || "Erro ao publicar.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function cancelListing(item: InvItem) {
    if (!item.listing_id) return;
    setBusy(item.id);
    try {
      const { error } = await supabase
        .from("marketplace_listings")
        .update({ is_active: false })
        .eq("id", item.listing_id);
      if (error) throw error;
      toast("Anúncio cancelado.", "info");
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, is_listed: false, listing_id: undefined } : i
        )
      );
    } catch (e: any) {
      toast(e.message || "Erro ao cancelar.", "error");
    } finally {
      setBusy(null);
    }
  }

  if (!profile || loading) return <FullPageSpinner />;

  if (error) {
    return (
      <div className="py-10 text-center">
        <p className="mb-4 text-on-surface-muted">{error}</p>
        <Button onClick={load}>Tentar novamente</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 pt-2">
      <h1 className="font-display text-2xl font-bold">Inventário</h1>

      {items.length === 0 ? (
        <Card className="space-y-3 text-center">
          <div className="text-5xl">📦</div>
          <p className="text-sm text-on-surface-muted">
            Seu inventário está vazio. Abra caixas para ganhar livros!
          </p>
          <Link href="/app/store">
            <Button>Ir para a Loja Gacha</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {items.map((item) => {
            const rar = item.book ? RARITY[item.book.rarity_tier] : null;
            return (
              <Card key={item.id} className="space-y-2 p-3">
                <div className="relative">
                  <BookCover
                    url={item.book?.cover_url}
                    title={item.book?.title || "Livro"}
                    author={item.book?.author}
                  />
                  {rar && (
                    <div className="absolute left-1 top-1">
                      <Badge color={rar.color}>
                        {rar.emoji} {rar.label}
                      </Badge>
                    </div>
                  )}
                </div>
                <p className="truncate text-sm font-bold">{item.book?.title}</p>

                {item.is_downloaded ? (
                  <Badge color="#8FB98F">Baixado ✓</Badge>
                ) : item.is_listed ? (
                  <div className="space-y-1.5">
                    <Badge color="#6FA8DC">No Marketplace</Badge>
                    <Button
                      size="sm"
                      variant="danger"
                      fullWidth
                      loading={busy === item.id}
                      onClick={() => cancelListing(item)}
                    >
                      Cancelar anúncio
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Button
                      size="sm"
                      fullWidth
                      loading={busy === item.id}
                      onClick={() => download(item)}
                    >
                      Baixar
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      fullWidth
                      disabled={busy === item.id}
                      onClick={() => publish(item)}
                    >
                      Publicar no Marketplace
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
