"use client";

import React, { useRef } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Props {
  children: React.ReactNode;
  fileName?: string;
}

// Wraps a visual card and offers download/share via the Web Share API.
// Uses SVG-foreignObject -> canvas so no external html2canvas dependency.
export function ShareCardShell({ children, fileName = "readly-card.png" }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  async function exportCard(): Promise<Blob | null> {
    const node = ref.current;
    if (!node) return null;
    const { width, height } = node.getBoundingClientRect();
    const html = node.outerHTML;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml">${html}</div>
      </foreignObject></svg>`;
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width * 2;
    canvas.height = height * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.scale(2, 2);
    ctx.drawImage(img, 0, 0);
    return new Promise((res) => canvas.toBlob((b) => res(b), "image/png"));
  }

  async function handleShare() {
    try {
      const blob = await exportCard();
      if (!blob) return;
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Readly" });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        a.click();
      }
    } catch {
      // user cancelled or unsupported — silently ignore
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div ref={ref}>{children}</div>
      <Button onClick={handleShare} fullWidth>
        <Share2 size={16} strokeWidth={2} />
        Compartilhar
      </Button>
    </div>
  );
}
