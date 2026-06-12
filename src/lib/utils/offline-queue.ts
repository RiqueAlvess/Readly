// Offline write queue backed by localStorage. When offline, mutations are
// queued and flushed when connectivity returns (also triggered by SW sync).

export interface QueuedOp {
  id: string;
  table: string;
  type: "update" | "insert";
  match?: Record<string, any>;
  payload: Record<string, any>;
  createdAt: number;
}

const KEY = "readly_offline_queue";

export function readQueue(): QueuedOp[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function writeQueue(ops: QueuedOp[]) {
  localStorage.setItem(KEY, JSON.stringify(ops));
}

export function enqueue(op: Omit<QueuedOp, "id" | "createdAt">) {
  const ops = readQueue();
  ops.push({ ...op, id: crypto.randomUUID(), createdAt: Date.now() });
  writeQueue(ops);
  // Ask the SW to schedule a background sync if available.
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((reg) => (reg as any).sync?.register("readly-sync"))
      .catch(() => {});
  }
}

import type { SupabaseClient } from "@supabase/supabase-js";

export async function flushQueue(supabase: SupabaseClient): Promise<number> {
  const ops = readQueue();
  if (ops.length === 0) return 0;
  const remaining: QueuedOp[] = [];
  let flushed = 0;
  for (const op of ops) {
    try {
      if (op.type === "update") {
        let q = supabase.from(op.table).update(op.payload);
        for (const [k, v] of Object.entries(op.match || {})) q = q.eq(k, v);
        const { error } = await q;
        if (error) throw error;
      } else {
        const { error } = await supabase.from(op.table).insert(op.payload);
        if (error) throw error;
      }
      flushed++;
    } catch {
      remaining.push(op);
    }
  }
  writeQueue(remaining);
  return flushed;
}
