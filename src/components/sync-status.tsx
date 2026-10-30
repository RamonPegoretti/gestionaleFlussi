"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { flushQueue, pendingGroups, QUEUE_EVENT } from "@/lib/offline-queue";

// Registers the service worker (offline use), sends changes saved offline as soon
// as the connection is back, and shows a small badge while something is waiting.
export function SyncStatus() {
  const t = useTranslations("sync");
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    let alive = true;
    const refresh = async () => {
      const n = (await pendingGroups()).length;
      if (alive) setPending(n);
    };
    const flush = async () => {
      const before = (await pendingGroups()).length;
      const left = await flushQueue();
      if (!alive) return;
      setPending(left);
      // Fresh numbers on screen once offline changes have reached the server.
      if (before > left) router.refresh();
    };
    const goOnline = () => {
      setOnline(true);
      void flush();
    };
    const goOffline = () => setOnline(false);

    setOnline(navigator.onLine);
    void flush();
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    window.addEventListener(QUEUE_EVENT, refresh);
    const timer = window.setInterval(() => void flush(), 30_000);
    return () => {
      alive = false;
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener(QUEUE_EVENT, refresh);
      window.clearInterval(timer);
    };
  }, [router]);

  if (online && pending === 0) return null;
  return (
    <div
      role="status"
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        padding: "10px 16px",
        background: online ? "#111111" : "#D52B1E",
        color: "#fff",
        fontWeight: 600,
        fontSize: 14,
        zIndex: 10,
      }}
    >
      {!online && t("offline")}
      {!online && pending > 0 && " · "}
      {pending > 0 && t("pending", { count: pending })}
    </div>
  );
}
