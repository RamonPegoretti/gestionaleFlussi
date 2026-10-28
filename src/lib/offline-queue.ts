"use client";

// Changes to groups made while offline wait here (IndexedDB, on this device)
// until the server can be reached again. The server stays the source of truth.

import type { GroupDraft } from "./group-input";

const DB_NAME = "gestionale-flussi";
const STORE = "pending-groups";
export const QUEUE_EVENT = "flussi:queue";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req.result);
    t.onerror = () => reject(t.error);
  });
}

function notify() {
  window.dispatchEvent(new Event(QUEUE_EVENT));
}

export async function pendingGroups(): Promise<GroupDraft[]> {
  if (typeof indexedDB === "undefined") return [];
  return tx("readonly", (s) => s.getAll() as IDBRequest<GroupDraft[]>);
}

async function enqueue(draft: GroupDraft) {
  // Keyed by group id: a later change to the same group replaces the earlier one.
  await tx("readwrite", (s) => s.put(draft));
  notify();
}

async function remove(ids: string[]) {
  for (const id of ids) await tx("readwrite", (s) => s.delete(id));
  notify();
}

type SyncResult = { id: string; status: "saved" | "deleted" | "stale" | "invalid"; errors?: string[] };

async function send(drafts: GroupDraft[]): Promise<SyncResult[] | null> {
  try {
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ groups: drafts }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { results: SyncResult[] };
    return body.results;
  } catch {
    return null; // offline or server unreachable
  }
}

export type SubmitOutcome = { kind: "saved" } | { kind: "queued" } | { kind: "invalid"; errors: string[] };

// Saves now if possible, otherwise keeps the change for later.
export async function submitGroup(draft: GroupDraft): Promise<SubmitOutcome> {
  const results = await send([draft]);
  if (!results) {
    await enqueue(draft);
    return { kind: "queued" };
  }
  const r = results[0];
  if (r?.status === "invalid") return { kind: "invalid", errors: r.errors ?? [] };
  return { kind: "saved" };
}

let flushing = false;

// Sends every waiting change. Returns how many are still waiting.
export async function flushQueue(): Promise<number> {
  const pending = await pendingGroups();
  if (!pending.length || flushing) return pending.length;
  flushing = true;
  try {
    const results = await send(pending);
    if (!results) return pending.length;
    // Invalid changes can never be saved: drop them rather than retrying forever.
    await remove(results.map((r) => r.id));
    return (await pendingGroups()).length;
  } finally {
    flushing = false;
  }
}
