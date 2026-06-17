"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { Badge } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  badge: Badge | null;
}

export function AchievementPopup({ open, onClose, badge }: Props) {
  if (!badge) return null;
  return (
    <Modal open={open} onClose={onClose} className="text-center">
      <div className="flex flex-col items-center gap-4 py-6">
        <p className="text-sm uppercase tracking-widest text-primary">
          Conquista desbloqueada
        </p>
        <div className="animate-gacha-reveal text-7xl drop-shadow-[0_0_24px_rgba(255,193,213,0.7)]">
          {badge.icon}
        </div>
        <h3 className="font-display text-2xl font-bold">{badge.name}</h3>
        <p className="text-sm text-on-surface-muted">{badge.description}</p>
        <Button onClick={onClose} fullWidth>
          Incrível!
        </Button>
      </div>
    </Modal>
  );
}
