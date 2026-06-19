# Phase 6 — Local Baseline (pre-fix state)

Captured on branch `stabilize` after `pnpm install --ignore-scripts`, before any code changes.
This is the "before" snapshot we measure every fix against.

## Environment
- Deps installed via pnpm (Chromium **not** downloaded — not needed for typecheck/tests).
- **No local `.env` / `DATABASE_URL`** → the data layer (`getDb()`) returns `null` and all DB
  operations no-op locally. We do **not** have access to the live Manus DB (paused; credits ended).
- GitHub `origin` is wired; `main` == `origin/main`. Work happens on `stabilize`.

## Baseline signals

### `npx tsc --noEmit` → **116 errors** ✅ reliable signal (DB-independent)
This is our primary gate. **Rule: every committed change must keep the count going down, never up.**

Triage of the 116 by theme:

| Theme | Example files | Maps to analysis finding |
|-------|---------------|--------------------------|
| **Missing module `@/lib/types`** | `ProjectListDialog`, `SubcontractorListDialog` | new — a referenced types file is absent |
| **Unmounted `whatsappLogs` router** | `ErrorTrackingDashboard`, `MessageLogsAnalytics` (`trpc.whatsappLogs` doesn't exist) | extends F4 — `whatsappLogs` is never registered in `server/routers.ts` |
| **`whatsappAdmins` method mismatch** | `WhatsAppCommandConfig` (`getAllCommands` missing) | F4 — singular file mounted under plural key |
| **Two-checklist-table shape** | `ProjectChecklists.tsx` (`cost`/`title`/`description`/`completedBy` missing) | F3 / C1 — component expects `project_checklists`, gets `project_checklist_items` |
| **Status enum vs string** | `StatusBadge`, `admin/ProjectDetail` | string not narrowed to `ProjectStatus` union |
| **Proposal upload shape** | `ProposalUpload`, `ProposalUploadSection` (`fileBuffer`, `extractedItemsCount`, id shape) | C2 area — client/server proposal contracts drifted |
| **UI prop type drift** | Button `size="xs"`, `ProjectListDialog onProjectClick`, `DailySchedule` `isUrgent`/`filename`, `LiveConsole` `.mutate` | component prop/return-type mismatches |
| **3rd-party/library types** | `AIChatBox` (`UIMessagePart`), `Markdown`/streamdown (`plugins`) | library version drift — lowest priority, cosmetic |

### `npx vitest run` → **42 failed / 606 passed / 15 skipped** (9 of 30 files failed) ⚠️ partly environmental
Several failures are **local "no DB" artifacts**, not regressions (e.g. `projects.subcontractor-edit`
fails because the insert no-ops without a DB; `projects.pdf-filter` schedule map comes back empty).
Treat vitest as a **secondary** signal until we can run against a DB. Do not chase failures that are
purely "no DATABASE_URL." Focus on tests whose logic is pure (timezone/time-conversion, command
parser, formatters).

## How we work from here (code-only, zero DB risk)
1. Fix in **small thematic batches** (one theme from the table above at a time).
2. After each batch: `npx tsc --noEmit` — error count must **decrease**; never introduce new ones.
3. Commit the batch on `stabilize` with a clear message. Keep `main` clean until a batch set is
   reviewed and ready for Manus to pull.
4. **No schema/migration changes. Never run `db:push`.** Anything that would require a DB change is
   logged for later (when DB access + a backup exist), not done now.

## Suggested fix order (low-risk → higher-judgement)
1. **`@/lib/types` missing module** — likely a deleted file; restore/recreate. Unblocks 2 components.
2. **Mount `whatsappLogs` router** in `server/routers.ts` — one line; unblocks analytics screens.
3. **`whatsappAdmins` / `whatsappBot` router naming (F4)** — reconcile client calls to mounted procedures.
4. **Status enum narrowing** (`StatusBadge`, `ProjectDetail`) — small, contained type fixes.
5. **Proposal upload contract (C2)** — align client mutation shape with the server input.
6. **Two-checklist-table (F3/C1)** — needs a design decision; do last, code-only (no schema change):
   make the client consume the canonical `project_checklist_items` shape.
7. **Library-type drift (AIChatBox/Markdown)** — lowest priority; may just need a type cast/version bump.
