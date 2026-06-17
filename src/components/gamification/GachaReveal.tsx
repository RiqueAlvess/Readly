"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { BookCover } from "@/components/books/BookCover";
import { Button } from "@/components/ui/Button";
import { RARITY } from "@/lib/constants";
import type { Book, RarityTier } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  book: Book | null;
  rarity: RarityTier | null;
}

// Dramatic lootbox-opening animation: shake -> burst -> reveal.
export function GachaReveal({ open, onClose, book, rarity }: Props) {
  const [phase, setPhase] = useState<"shaking" | "revealed">("shaking");

  useEffect(() => {
    if (open) {
      setPhase("shaking");
      const t = setTimeout(() => setPhase("revealed"), 1600);
      return () => clearTimeout(t);
    }
  }, [open, book?.id]);

  const rar = rarity ? RARITY[rarity] : null;

  return (
    <Modal open={open} onClose={onClose} className="text-center">
      {phase === "shaking" || !book ? (
        <div className="flex flex-col items-center gap-6 py-10">
          <div className="animate-gacha-shake text-8xl drop-shadow-[0_0_30px_rgba(255,193,213,0.7)]">
            🎁
          </div>
          <p className="animate-pulse font-display text-lg text-on-surface-muted">
            Abrindo...
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 py-4">
          <div
            className="rounded-full px-4 py-1 text-sm font-bold"
            style={{ backgroundColor: `${rar?.color}22`, color: rar?.color }}
          >
            {rar?.emoji} {rar?.label}
          </div>
          <div className="w-40 animate-gacha-reveal">
            <BookCover url={book.cover_url} title={book.title} author={book.author} />
          </div>
          <div>
            <h3 className="font-display text-xl font-bold">{book.title}</h3>
            <p className="text-sm text-on-surface-muted">{book.author}</p>
          </div>
          <p className="text-xs text-on-surface-muted">
            Adicionado ao seu inventário 📦
          </p>
          <Button onClick={onClose} fullWidth>
            Continuar
          </Button>
        </div>
      )}
    </Modal>
  );
}
