# Phase 0 & 1 — Orientation + Data Model

## 0.1 Repository shape

```
/                       root: package.json, drizzle config, ~30 design .md docs, helper scripts
client/                 React 19 SPA (131 .ts/.tsx files)
  src/pages/            route components (admin/*, sub/*, WhatsApp*)
  src/components/       feature + ui/ (shadcn) components
  src/_core/            auth hook (useAuth)
  src/lib/trpc.ts       typed API client
server/                 Express + tRPC backend (87 .ts files)
  _core/                infra: index.ts (entry), context, trpc, oauth, chat, vite, env,
                        pdfGenerator, proposalExtractor, emailService, whatsappMiddleware …
  routers/              17 tRPC routers (domain APIs)
  services/             WhatsApp bot engine (~40 files)
  db/, storage.ts       data access helpers
drizzle/                schema.ts, relations.ts, 17 SQL migrations
.manus/                 Manus platform scaffolding artifacts (db query snapshots)
.wwebjs_cache/          whatsapp-web.js runtime cache (should not be committed)
```

> The app was scaffolded/iterated on the **Manus** platform (`.manus/`, `vite-plugin-manus-runtime`,
> hardcoded `boltediron-jvzmywuk.manus.space` URL). Deployment target is that Manus space.

## 0.2 Server entry & boot flow (`server/_core/index.ts`)

1. **WhatsApp bot is initialized first** — `initializeBot()` is `await`ed *before* routes are
   registered, then `initializeMessageListener()` runs detached.
2. Webhook routes registered **before** body parsing (raw body kept for signature verification):
   - `GET /api/webhooks/whatsapp` — Meta verification
   - `POST /api/webhooks/whatsapp` — incoming messages
3. `express.json({ limit: "50mb" })` (large, for base64 file uploads).
4. Route groups: bot endpoints → OAuth (`/api/oauth/callback`) → Chat (streaming) → tRPC (`/api/trpc`).
5. Dev serves via Vite middleware; prod serves static `dist/`.
6. Auto-selects a free port starting at `PORT || 3000` (scans up to +20).

**Build/run** (`package.json`):
- `dev`: `tsx watch server/_core/index.ts` (single process serves API + Vite)
- `build`: install Chromium → `vite build` → `esbuild` bundle server to `dist/`
- `start`: `node dist/index.js`
- `db:push`: `drizzle-kit generate && drizzle-kit migrate`
- `test`: `vitest run`
- ⚠️ scripts use `NODE_ENV=development` POSIX syntax — **fails on Windows/PowerShell** without
  cross-env (the dev machine is Windows). Use git-bash/WSL or add `cross-env`.

## 1. Data model (`drizzle/schema.ts`)

### Core domain (construction PM)

| Table | Purpose | Key columns / notes |
|-------|---------|---------------------|
| `users` | Accounts | `role: ["user","admin"]`, `permission: [view,edit,admin]`, `isApproved`, `passwordHash`, `openId` (OAuth) |
| `subcontractors` | Sub companies | `userId` links to a logged-in sub account (nullable) |
| `projects` | Central entity | `status` (6-stage enum), GC contacts, site super, dates **split into date + `HH:MM` string** columns, `primarySubcontractorId`, `isArchived`, `isUrgent` |
| `project_assignments` | Sub ↔ project M:N | `role` (trade) |
| `financials` | Admin-only money | 1:1 with project (`projectId` unique), contract/billed/received/payout, `billingStatus` |
| `project_notes` | Notes | `isAdminOnly` visibility flag |
| `project_files` | S3 files | `fileKey`, `fileUrl`, `isAdminOnly` |
| `project_checklists` | Checklist (titled) | `isCompleted`, `cost` (sub-entered), completion audit fields |
| `project_checklist_items` | Proposal-derived items | `source: [manual,extracted]`, `order`, `assignedSubcontractorId` |
| `change_orders` | COs | `status: [pending,approved,rejected]`, `amount`, approval audit |
| `project_messages` | Per-project chat | `mentions` (CSV user ids), `isAdminOnly` |
| `project_proposals` | Uploaded proposals | `extractedItemsCount` |
| `weekly_reports` | Generated PDF reports | week range + rollup counts, `generatedBy` |

### WhatsApp domain

| Table | Purpose |
|-------|---------|
| `whatsapp_authorized_groups` | Groups the bot will respond in (`groupChatId` unique, `isEnabled`) |
| `whatsapp_messages_log` | Every inbound message + command + response + status |
| `whatsapp_group_admins` | Per-group authorized phone numbers (**current model**) |
| `whatsapp_group_command_permissions` | Per-group, per-command access (admins/members) (**current model**) |
| `whatsapp_admin_users` | ⚠️ **DEPRECATED** (global admins) — still in schema |
| `whatsapp_command_permissions` | ⚠️ **DEPRECATED** (global command perms) — still in schema |
| `service_tokens` | Bot/service-to-service auth tokens |

### Notable modeling facts

- **No declared FK constraints** in the schema — relationships are `int` columns enforced in
  app code (`drizzle/relations.ts` defines them for query joins only). Orphan rows are possible
  on delete; cascade behavior is manual.
- **Two checklist systems coexist:** `project_checklists` (titled, costed) vs
  `project_checklist_items` (ordered, proposal-extracted). Confirm which the UI uses where —
  potential source of confusion/bugs.
- **Dates are split** into a `timestamp` + a separate `HH:MM` varchar (`startTime`, etc.).
  Timezone handling is clearly a known pain area — there are dedicated tests
  (`timezone.test.ts`, `time-conversion.test.ts`, `projects.timezone-fix.test.ts`) and date
  migration scripts (`migrate-dates-*.mjs`). Treat time/timezone as a fragile area.

## 🐛 Health / risk observations (Phase 0–1)

1. **Secrets logged to stdout** — `index.ts` prints `WHATSAPP_VERIFY_TOKEN`, `PHONE_NUMBER_ID`,
   `BUSINESS_ID` on every boot. Leaks secrets into logs. *(security, easy fix)*
2. **Dev scripts are POSIX-only** (`NODE_ENV=development tsx …`) but the dev box is Windows —
   `npm run dev` will fail in PowerShell. Add `cross-env` or document git-bash usage.
3. **Bot init blocks server startup** — `await initializeBot()` runs before routes mount; if the
   bot/Chromium hangs, the HTTP server never starts. Consider initializing the bot fully in the
   background.
4. **Deprecated tables/routers still live** — `whatsapp_admin_users` + `whatsapp_command_permissions`
   (schema) and `whatsappAdmin` vs `whatsappAdmins` routers. Risk of writing against the wrong one.
5. **No FK constraints** — deletes can orphan child rows (assignments, financials, files, logs).
   Worth auditing delete paths in Phase 2.
6. **Committed runtime junk** — `.wwebjs_cache/` and `.manus/db/*` are tracked in git. Should be
   gitignored; `.wwebjs_cache` can also leak session state.
7. **Role naming mismatch** — schema role enum is `["user","admin"]`, but the UI treats the
   non-admin role as "subcontractor" (`pages/sub/*`). "user" === sub. Document this mapping to
   avoid auth bugs.

## 🔌 Extension points (Phase 0–1)

- **New domain entity** → add a table to `drizzle/schema.ts`, generate a migration
  (`db:push`), add a tRPC router under `server/routers/`, register it in `server/routers.ts`,
  consume via `client/src/lib/trpc.ts`. This is the repeatable full-stack slice.
- **New project field** → schema column + migration; flows automatically into Drizzle inferred
  types used across client & server.
- **New WhatsApp command** → the `services/whatsappCommandHandlers/` + registry pattern is built
  for this (detailed in Phase 3).
- **New admin/sub screen** → add a `Route` in `client/src/App.tsx` (role-gated `Switch` blocks)
  + a page under `pages/admin/` or `pages/sub/`.

## Open questions to resolve in later phases

- Which checklist table is canonical per screen? (Phase 2/4)
- Auth/permission enforcement: how do `role` + `permission` + `isApproved` combine in tRPC
  middleware? (Phase 2)
- Are the deprecated WhatsApp tables still read anywhere? (Phase 3)
- How does proposal → checklist-item extraction actually work end to end? (Phase 2/3)
