// Validation of a group, shared by the form (in the browser) and the server.

import { isISODate, nightsBetween, type ISODate } from "./dates";
import { isOriginKey } from "./origins";

export type GroupDraft = {
  id: string;
  people: number;
  originKey: string;
  arrival: ISODate;
  departure: ISODate;
  // When the change was made on the device (ISO timestamp): the latest change wins.
  updatedAt: string;
  deleted?: boolean;
};

export type GroupError = "people" | "origin" | "arrival" | "departure" | "too_long" | "id";

export const MAX_PEOPLE = 999;
export const MAX_NIGHTS = 120;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateGroup(g: Partial<GroupDraft>): GroupError[] {
  const errors: GroupError[] = [];
  if (!g.id || !UUID_RE.test(g.id)) errors.push("id");
  if (g.deleted) return errors;
  if (!Number.isInteger(g.people) || (g.people ?? 0) < 1 || (g.people ?? 0) > MAX_PEOPLE) errors.push("people");
  if (!g.originKey || !isOriginKey(g.originKey)) errors.push("origin");
  if (!g.arrival || !isISODate(g.arrival)) errors.push("arrival");
  if (!g.departure || !isISODate(g.departure)) errors.push("departure");
  else if (g.arrival && isISODate(g.arrival)) {
    const n = nightsBetween(g.arrival, g.departure);
    if (n < 1) errors.push("departure");
    else if (n > MAX_NIGHTS) errors.push("too_long");
  }
  return errors;
}
