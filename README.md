# Gestionale Flussi

Web app for rifugi and small accommodations: staff enter each group of guests
(people, origin, arrival, departure) and the app produces the monthly ISTAT form
**IST_00139** ("Rilevazione del movimento dei clienti negli esercizi ricettivi")
as an `.xlsx` in the same layout as the Excel file used today.

- Italian by default, English and German in the settings.
- Works on PC and phone, installable, and keeps accepting groups offline (they are sent when the connection is back).
- Multi-structure: every rifugio has its own data and logins; a new rifugio needs no code changes.

## How the numbers are computed

Only groups are stored, never daily counts. A group arriving on day A and leaving on day D counts as
*arrivati* on A, *partiti* on D and *presenti* every night from A to D-1, which is the form's own rule
(presenti = giorno precedente + arrivati − partiti). Guests still present at the end of a month carry over
into the next month's "Presenze del giorno precedente". See `src/lib/movements.ts` and its tests.

"Giorni di apertura" and "Letti disponibili" come from the opening periods and the number of beds set in
Impostazioni; a day with guests always counts as open.

The export (`src/lib/exporters/veneto.ts`) fills the original template in `templates/veneto/`. Months with
28, 29 or 31 days get the matching number of day blocks and the sheet is renamed ("31 giorni" etc.).
Other regions can be added later as one exporter each in `src/lib/exporters/`.

## Run it on your computer

Needs Node.js 22.

```bash
npm install
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=choose-a-password npm run db:seed
npm run dev
```

Open http://localhost:3000 and log in. Without `DATABASE_URL` the app uses an embedded Postgres stored in
`.data/pglite`, so nothing else needs installing. Delete that folder to start from scratch.

```bash
npm test        # calculation and export tests
npm run lint    # type check
```

## Put it online (Vercel + Neon)

1. On vercel.com, **Add New → Project** and import this GitHub repository.
2. In the project, **Storage → Create Database → Neon** (free plan). This sets `DATABASE_URL`.
3. In **Settings → Environment Variables** add `BETTER_AUTH_SECRET` (any long random text, e.g. from
   `openssl rand -base64 32`) and `BETTER_AUTH_URL` (the site address, e.g. `https://gestionale-flussi.vercel.app`).
4. Deploy. Every build first applies the database migrations (`npm run build` runs `scripts/migrate.ts`).
5. Open the site: on a new database it shows a **Primo avvio** page where you create the first structure
   and your administrator login. After that the page is gone and the normal login appears.

For local development, `npm run db:seed` does the same as the first-start page: Rifugio Antelao (code P0250390001, Pieve di Cadore, 24 beds) and an administrator login.
The administrator can add other rifugi under **Impostazioni → Amministrazione**; each owner then adds their
own staff logins.

## Code map

| Path | What |
| --- | --- |
| `src/lib/origins.ts` | The 59 foreign countries/groups and 21 Italian regions of the form, in IT/EN/DE |
| `src/lib/movements.ts` | Groups → daily arrivati / partiti / presenti |
| `src/lib/exporters/` | Regional export files (Veneto: ISTAT IST_00139) |
| `src/lib/offline-queue.ts`, `public/sw.js` | Offline saving and sync |
| `src/db/schema.ts` | Database tables (Drizzle ORM) |
| `src/app/` | Pages: home, gruppo (add/edit), gruppi, mese, impostazioni, admin, login |
| `messages/` | Translations |
