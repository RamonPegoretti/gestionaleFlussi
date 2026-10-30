"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, nightsBetween, todayISO } from "@/lib/dates";
import { validateGroup, type GroupDraft, type GroupError } from "@/lib/group-input";
import { submitGroup } from "@/lib/offline-queue";
import { COUNTRIES, REGIONS, getOrigin, matchesOrigin, type Locale } from "@/lib/origins";

type Props = {
  initial: { id?: string; people: number | null; originKey: string | null; arrival: string; departure: string };
  // Foreign origins shown first, most used at this structure (others behind "show all").
  frequentCountries: string[];
  backHref: string;
  // New group in the current month: start from today's date, even on a page
  // that was saved for offline use on an earlier day.
  startToday?: boolean;
};

const FOREIGN_SHORTLIST = 19;

function newId(): string {
  return crypto.randomUUID();
}

export function GroupForm({ initial, frequentCountries, backHref, startToday }: Props) {
  const t = useTranslations("group");
  const locale = useLocale() as Locale;
  const editing = Boolean(initial.id);

  const [id, setId] = useState(initial.id ?? "");
  const [people, setPeople] = useState(initial.people ? String(initial.people) : "");
  const [originKey, setOriginKey] = useState<string | null>(initial.originKey);
  const [arrival, setArrival] = useState(initial.arrival);
  const [departure, setDeparture] = useState(initial.departure);
  const [tab, setTab] = useState<"it" | "es">(
    initial.originKey && getOrigin(initial.originKey)?.kind === "country" ? "es" : "it",
  );
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [errors, setErrors] = useState<GroupError[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const peopleRef = useRef<HTMLInputElement>(null);

  // The id is created in the browser so a group saved offline keeps it when synced.
  useEffect(() => {
    if (!id) setId(newId());
  }, [id]);

  useEffect(() => {
    const today = todayISO();
    if (startToday && initial.arrival !== today) {
      setArrival(today);
      setDeparture(addDays(today, 1));
    }
  }, [startToday, initial.arrival]);

  const places = useMemo(() => {
    if (query.trim()) return [...REGIONS, ...COUNTRIES].filter((o) => matchesOrigin(o, query));
    if (tab === "it") return REGIONS;
    if (showAll) return [...COUNTRIES].sort((a, b) => a[locale].localeCompare(b[locale], locale));
    const first = frequentCountries.map((k) => getOrigin(k)!).filter(Boolean);
    const rest = COUNTRIES.filter((c) => !frequentCountries.includes(c.key));
    return [...first, ...rest].slice(0, FOREIGN_SHORTLIST);
  }, [query, tab, showAll, frequentCountries, locale]);

  const nights = arrival && departure ? Math.max(0, nightsBetween(arrival, departure)) : 0;
  const peopleN = Number(people) || 0;

  function onArrivalChange(v: string) {
    // Keep the length of stay when the arrival moves.
    if (v && arrival && departure && departure > arrival) {
      setDeparture(addDays(v, Math.max(1, nightsBetween(arrival, departure))));
    } else if (v && (!departure || departure <= v)) {
      setDeparture(addDays(v, 1));
    }
    setArrival(v);
  }

  async function save(deleted: boolean, another: boolean) {
    const draft: GroupDraft = {
      id,
      people: peopleN,
      originKey: originKey ?? "",
      arrival,
      departure,
      updatedAt: new Date().toISOString(),
      deleted: deleted || undefined,
    };
    const errs = validateGroup(draft);
    setErrors(errs);
    if (errs.length) return;
    if (deleted && !window.confirm(t("confirmDelete"))) return;

    setBusy(true);
    const outcome = await submitGroup(draft);
    setBusy(false);
    if (outcome.kind === "invalid") {
      setErrors(outcome.errors as GroupError[]);
      return;
    }
    const note = outcome.kind === "queued" ? t("savedOffline") : deleted ? t("deleted") : t("saved");
    if (another) {
      // Same dates, new group: the usual case when copying a page of the book.
      setId(newId());
      setPeople("");
      setOriginKey(null);
      setQuery("");
      setMessage(note);
      peopleRef.current?.focus();
    } else {
      window.location.href = backHref;
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") window.location.href = backHref;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const err = (e: GroupError) => errors.includes(e);
  const origin = originKey ? getOrigin(originKey) : null;

  return (
    <div className="split">
      <form
        className="main"
        aria-label={editing ? t("editTitle") : t("newTitle")}
        onSubmit={(e) => {
          e.preventDefault();
          void save(false, false);
        }}
      >
        <div className="fields">
          <label className="field">
            {t("people")}
            <input
              ref={peopleRef}
              className="big"
              type="number"
              inputMode="numeric"
              min={1}
              max={999}
              autoFocus
              value={people}
              onChange={(e) => setPeople(e.target.value)}
              aria-invalid={err("people")}
            />
            {err("people") && <span className="error">{t("errPeople")}</span>}
          </label>
          <label className="field">
            {t("arrival")}
            <input type="date" value={arrival} onChange={(e) => onArrivalChange(e.target.value)} aria-invalid={err("arrival")} />
            {err("arrival") && <span className="error">{t("errArrival")}</span>}
          </label>
          <label className="field">
            {t("departure")}
            <input
              type="date"
              value={departure}
              min={arrival ? addDays(arrival, 1) : undefined}
              onChange={(e) => setDeparture(e.target.value)}
              aria-invalid={err("departure") || err("too_long")}
            />
            {err("departure") && <span className="error">{t("errDeparture")}</span>}
            {err("too_long") && <span className="error">{t("errTooLong")}</span>}
          </label>
        </div>

        <fieldset style={{ border: 0, margin: "32px 0 0", padding: 0 }}>
          <legend className="legend">{t("origin")}</legend>
          <div className="tabs" role="tablist" aria-label={t("italyOrAbroad")}>
            <button type="button" role="tab" aria-selected={tab === "it"} onClick={() => setTab("it")}>
              {t("tabItaly", { count: REGIONS.length })}
            </button>
            <button type="button" role="tab" aria-selected={tab === "es"} onClick={() => setTab("es")}>
              {t("tabAbroad", { count: COUNTRIES.length })}
            </button>
          </div>
          <label className="search">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5E5E5A" strokeWidth="2" strokeLinecap="square">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
            <span className="sr-only">{t("search")}</span>
            <input
              type="search"
              placeholder={t("search")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                // Enter in the search box picks the first match instead of saving.
                if (e.key === "Enter" && places.length > 0 && query.trim()) {
                  e.preventDefault();
                  setOriginKey(places[0].key);
                  setQuery("");
                }
              }}
            />
          </label>
          <div className="places">
            {places.map((o) => (
              <button
                type="button"
                key={o.key}
                aria-pressed={o.key === originKey}
                onClick={() => setOriginKey(o.key)}
              >
                {o[locale]}
              </button>
            ))}
            {tab === "es" && !showAll && !query.trim() && (
              <button type="button" className="more" onClick={() => setShowAll(true)}>
                {t("showAll", { count: COUNTRIES.length })}
              </button>
            )}
            {places.length === 0 && <span style={{ padding: 14, background: "#fff" }}>{t("noMatch")}</span>}
          </div>
          {err("origin") && <p className="form-error">{t("errOrigin")}</p>}
        </fieldset>
      </form>

      <aside className="side summary" aria-label={t("summary")}>
        <div className="summary-label">{t("summary")}</div>
        <div className="summary-big">
          {t("peopleCount", { count: peopleN })}
          <br />
          {origin ? origin[locale] : "—"}
        </div>
        <dl>
          <dt>{t("nights")}</dt>
          <dd>{nights}</dd>
          <dt>{t("presences")}</dt>
          <dd>{nights * peopleN}</dd>
        </dl>
        <button type="button" className="btn-primary" disabled={busy || !id} onClick={() => void save(false, false)}>
          {t("save")}
        </button>
        {!editing && (
          <button type="button" className="btn-secondary" disabled={busy || !id} onClick={() => void save(false, true)}>
            {t("saveAndAnother")}
          </button>
        )}
        <p className="muted" style={{ margin: "12px 0 0", fontSize: 13 }}>
          {t("keysHint")}
        </p>
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
        {editing && (
          <button type="button" className="btn-danger" disabled={busy} onClick={() => void save(true, false)}>
            {t("delete")}
          </button>
        )}
      </aside>
    </div>
  );
}
