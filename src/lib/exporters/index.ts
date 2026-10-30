import "server-only";
import type { Exporter } from "./types";
import { venetoExporter } from "./veneto";

// Add a new region here: one exporter per regional format.
export const EXPORTERS: Record<string, Exporter> = {
  [venetoExporter.id]: venetoExporter,
};

export function getExporter(id: string): Exporter {
  return EXPORTERS[id] ?? venetoExporter;
}
