# ContextEvent AI

Bulk attendee file ingestion → live identity enrichment waterfall → career
timeline wins analysis → Claude-generated bios and conversation starters,
in a premium multi-panel UI.

> **A note on hosting:** Azure Databricks is a data/ML compute platform and
> cannot serve a Next.js web application (no Node.js HTTP server, no SSR, no
> public web frontend support). This app is built for **Vercel, Railway, or
> Render** in production, with **local dev + ngrok** for ad-hoc remote access.
> If you want Azure specifically, use **Azure App Service (Node.js runtime)**
> or **Azure Container Apps** — both work with this codebase unmodified by
> following the generic Node.js deployment steps Azure documents for any
> Next.js app. Databricks can optionally run a downstream analytics notebook
> against the `enriched_attendees` Postgres table, but it is not a hosting
> target for the app itself.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router), React 19, Tailwind CSS, Plus Jakarta Sans |
| Database | PostgreSQL + Prisma ORM |
| Identity Enrichment (Tier 1) | Apify (LinkedIn profile resolution via Google Search + Profile actors) — mock mode available with zero keys |
| Identity Enrichment (Tier 2) | Hunter.io domain search + Clearbit logo API (free-tier live web/domain scan) |
| LLM | Anthropic Claude 3.5 Sonnet, structured JSON output |
| Image handling | Internal HTTPS image proxy (`/api/image-proxy`) |

> **Why Apify instead of PDL/Apollo?** Neither PDL nor Apollo offers a usable
> free production tier for email-based enrichment. Apify's pay-per-result
> model with a $5/month free platform credit is the most realistic free path
> to live LinkedIn-derived data. The codebase is adapter-based
> (`EnrichmentProvider` interface in `src/lib/enrichment/types.ts`) — dropping
> in real PDL or Apollo support later is a single new file, zero changes to
> the waterfall orchestrator, API routes, or UI.

---

## Local Development

### 1. Prerequisites
- Node.js 20+
- A PostgreSQL database (local Docker container, or a free hosted instance — see `.env.example`)

### 2. Install
```bash
git clone <this-repo>
cd contextevent-ai
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
```
Fill in at minimum:
- `DATABASE_URL`
- `ANTHROPIC_API_KEY` (required — bio generation will not work without this)

Everything else (Apify, Hunter.io) is **optional** — if left blank, the app
automatically runs identity enrichment in **mock mode**, producing
deterministic, realistic fake profile data so the entire pipeline
(upload → mapping → enrichment → wins → bio generation → UI) is fully
testable with only an Anthropic key.

### 4. Set up the database
```bash
npm run db:push
```
This syncs the Prisma schema (`Users`, `Upload_Batches`, `Enriched_Attendees`)
to your Postgres instance. Use `npm run db:migrate` instead if you want
versioned migration files.

### 5. Run
```bash
npm run dev
```
Visit `http://localhost:3000`.

---

## Remote Access via ngrok (local dev, accessible from anywhere)

Useful for demoing the app from your own machine without deploying anywhere.

```bash
# Terminal 1
npm run dev

# Terminal 2
ngrok http 3000
```

ngrok will print a public HTTPS URL like `https://abcd-1-2-3-4.ngrok-free.app`.
Anyone with that link can use your locally-running app. Set
`NEXT_PUBLIC_APP_URL` in `.env` to that URL and restart `npm run dev` if you
need absolute URLs elsewhere in the app.

Note: ngrok's free tier URL changes every time you restart the tunnel unless
you claim a static domain on a paid plan.

---

## Free Hosting Deployment

### Option A — Vercel (recommended, zero-config for Next.js)
1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. Add all variables from `.env.example` under **Project Settings → Environment Variables**.
4. For `DATABASE_URL`, use a free hosted Postgres instance — **Neon**
   (neon.tech) integrates directly with Vercel's "Storage" tab in one click,
   or use Supabase/Railway/Render Postgres.
5. Deploy. Vercel auto-runs `npm run build`, which runs `prisma generate`
   before `next build` (see `package.json`).
6. After first deploy, run `npx prisma db push` locally pointed at your
   production `DATABASE_URL` (or run it from Vercel's deploy hook / a one-off
   `vercel env pull && npm run db:push`) to create the tables.

### Option B — Railway
1. [railway.app](https://railway.app) → New Project → Deploy from GitHub repo.
2. Add a PostgreSQL plugin from the Railway template marketplace — it
   auto-populates `DATABASE_URL` for you.
3. Add the remaining env vars (`ANTHROPIC_API_KEY`, `APIFY_API_TOKEN`, etc.)
   under the service's **Variables** tab.
4. Railway detects Next.js automatically and runs `npm run build` / `npm start`.
5. Run `npm run db:push` via Railway's shell, or locally against the
   Railway-provided `DATABASE_URL`.

### Option C — Render
1. [render.com](https://render.com) → New → Web Service → connect your repo.
2. Build command: `npm run build`. Start command: `npm start`.
3. Add a Render PostgreSQL instance (free tier, 90-day expiry — fine for
   demos; upgrade or migrate to Neon for a permanently-free DB).
4. Set all env vars under the service's **Environment** tab.
5. Run `npm run db:push` from the Render shell after first deploy.

### Option D — Azure App Service
1. `az webapp up --runtime "NODE:20-lts" --name <app-name> --resource-group <rg>`
2. Set the same env vars via `az webapp config appsettings set` or the Azure
   Portal's **Configuration → Application settings**.
3. Azure App Service runs `npm install && npm run build && npm start`
   automatically for Node apps when `package.json`'s `scripts.start` is
   present (it is).
4. Provision an **Azure Database for PostgreSQL — Flexible Server** (has a
   free tier) and use its connection string as `DATABASE_URL`.

---

## Application Flow

1. **Upload** (`/`) — drag-and-drop a `.csv` or `.xlsx` file. The file is
   parsed server-side (`/api/upload`) and staged in memory with a 30-minute
   TTL; headers + a 5-row preview are returned to the client.
2. **Column Mapping Wizard** — the UI auto-guesses First Name / Last Name /
   Email columns from common header patterns, but requires explicit
   confirmation before proceeding (Epic 1 requirement).
3. **Submit** (`/api/map-columns`) — creates an `UploadBatch` row, then runs
   the enrichment waterfall (Epic 2) and timeline wins engine (Epic 3) for
   every valid row with bounded concurrency (4 at a time), persisting each
   result as an `EnrichedAttendee` row. Rows with missing/invalid required
   fields are skipped and reported; enrichment failures are captured
   per-attendee without aborting the batch.
4. **Batch Workspace** (`/batch/[batchId]`) — the multi-panel UI: attendee
   sidebar, Identity Card (left), Config Controller (right), Wins Panel
   (center, auto-collapsing), and the Generated Bio + Conversation Starters
   output matrix (lower).
5. **Generate Bio** (`/api/generate-bio`) — one concurrent Claude call per
   click, returning validated structured JSON (bio + exactly 5 themed
   conversation starters), persisted back onto the attendee record.

---

## Security Notes

- No LinkedIn credentials are ever collected, transmitted, or logged —
  identity enrichment uses only public-facing scraping/lookup APIs (Apify,
  Hunter.io) against names/emails the user already uploaded.
- All headshot/logo images are served through `/api/image-proxy`, which
  validates protocol (HTTPS-only) and hostname against an explicit allowlist
  before fetching server-side and re-streaming the bytes — this eliminates
  mixed-content warnings and canvas-tainting CORS errors client-side, and
  prevents the proxy from being used as an open relay (SSRF protection via
  hostname allowlist).
- Enrichment and LLM API keys are read exclusively from server-side
  environment variables — never exposed to the client bundle (no
  `NEXT_PUBLIC_` prefix on any secret).

## Error Handling

- File parse failures (corrupt/empty/oversized/unsupported files) return
  clear `4xx` errors surfaced inline on the upload screen.
- Per-attendee enrichment failures (both waterfall tiers exhausted) are
  persisted with `enrichmentStatus = FAILED` and a human-readable
  `enrichmentError`, rendered as an inline red error state on that
  attendee's Identity Card — the rest of the batch continues processing
  unaffected.
- Bio generation validates Claude's JSON response against a Zod schema and
  retries once on malformed output before surfacing a clear error in the
  Config Controller panel.
- A route-level `error.tsx` boundary catches any unexpected render/runtime
  failure on the batch page without crashing the whole app.

---

## File Tree

```
contextevent-ai/
├── .env.example
├── .gitignore
├── next.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── prisma/
│   └── schema.prisma
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── globals.css
    │   ├── page.tsx                       # Upload + mapping wizard entry
    │   ├── batch/[batchId]/
    │   │   ├── page.tsx
    │   │   ├── loading.tsx
    │   │   ├── error.tsx
    │   │   └── not-found.tsx
    │   └── api/
    │       ├── upload/route.ts
    │       ├── map-columns/route.ts
    │       ├── batches/[batchId]/route.ts
    │       ├── generate-bio/route.ts
    │       └── image-proxy/route.ts
    ├── components/
    │   ├── UploadDropzone.tsx
    │   ├── MappingWizard.tsx
    │   ├── BatchWorkspace.tsx
    │   ├── AttendeeListSidebar.tsx
    │   ├── IdentityCard.tsx
    │   ├── ConfigController.tsx
    │   ├── WinsPanel.tsx
    │   ├── OutputMatrix.tsx
    │   ├── ConversationStarterRow.tsx
    │   └── Avatar.tsx
    └── lib/
        ├── prisma.ts
        ├── types.ts
        ├── parsing/
        │   ├── file-parser.ts
        │   └── staging-store.ts
        ├── enrichment/
        │   ├── types.ts
        │   ├── mock-provider.ts
        │   ├── apify-provider.ts
        │   ├── web-scan-provider.ts
        │   ├── waterfall.ts
        │   └── wins-engine.ts
        └── llm/
            └── generate.ts
```

---

## Known Scope Boundaries

- Synchronous, small-batch processing (designed/tested for tens of attendees
  per upload, capped at 5,000 rows). For hundreds+ per batch with background
  job processing, swap the bounded-concurrency loop in
  `src/app/api/map-columns/route.ts` for a queue (BullMQ + Redis, or a
  serverless queue like Inngest/Trigger.dev) — the per-attendee enrichment
  function is already isolated and idempotent, making this a contained change.
- The in-memory staging store (`src/lib/parsing/staging-store.ts`) is
  single-process; on a multi-instance deployment, swap it for Redis (the
  get/set/delete interface is intentionally minimal for this).
- No authentication layer is implemented — the `User` model exists in the
  schema for future multi-tenant support but is not currently wired to any
  auth provider. Add NextAuth.js or Clerk against the existing `User` model
  when you need login.
