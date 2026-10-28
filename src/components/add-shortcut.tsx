"use client";

import { useEffect } from "react";

// Pressing "N" anywhere on the page (outside a text field) opens the new-group page.
export function AddShortcut({ href }: { href: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || el.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        window.location.href = href;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [href]);
  return null;
}
