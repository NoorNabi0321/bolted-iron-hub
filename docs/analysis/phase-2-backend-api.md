# Phase 2 — Backend / API Surface

Express + tRPC v11. 19 routers mounted in [`server/routers.ts`](../../server/routers.ts).
Data access is centralized in [`server/db.ts`](../../server/db.ts) (one big module of query
helpers) plus `server/db/whatsappQueries.ts`. Non-tRPC HTTP routes: WhatsApp webhook, OAuth
callback, chat streaming, bot status endpoints (registered in `server/_core/index.ts`).

## 2.1 Auth & permission model

**Context build** ([`server/_core/context.ts`](../../server/_core/context.ts)):
1. `Authorization: Bearer <token>` → looked up in `service_tokens`; if valid, returns a
   **synthetic admin user** (`id: 0`, `role: "admin"`, `permission: "admin"`). Used by the
   WhatsApp bot / service-to-service calls.
2. Otherwise → OAuth/session cookie via `sdk.authenticateRequest`. Email/password login
   (`emailAuth.login`) issues the same session cookie.
3. No auth → `user: null`.

**Procedure tiers** ([`server/_core/trpc.ts`](../../server/_core/trpc.ts)):
| Procedure | Guard |
|-----------|-------|
| `publicProcedure` | none |
| `protectedProcedure` | `ctx.user` must exist (any logged-in user, **admin OR sub**) |
| `adminProcedure` | `ctx.user.role === "admin"` |

> ⚠️ `projects.ts` **re-defines its own local `adminProcedure`** instead of importing the
> shared one. Same behavior, but a refactor trap — fix in one place won't cover the other.

**Role/permission columns:** `users.role ∈ {user, admin}`, `users.permission ∈ {view, edit, admin}`,
`users.isApproved`. In practice only `role` is enforced in middleware. The `permission` column
is set via `adminUsers.setPermission` but **almost never checked** on the server — access is
role-based, not permission-based. (Confirm in Phase 4 whether the UI relies on it.)

**Sub access pattern:** sub-scoped endpoints resolve `getSubcontractorByUserId(ctx.user.id)`
then `isSubcontractorAssignedToProject(...)`. This is the correct ownership check and is used
consistently in `projects.getChecklistItems`, `getProposal`, `checklists.*`, `messages.*`, etc.

## 2.2 Router inventory (by domain)

### Core PM
| Router | Key procedures | Guard | Notes |
|--------|----------------|-------|-------|
| `projects` | list, get/getById, create, update, updateStatus, delete, assign*/unassign*, checklist-items CRUD, proposal upload+extract, PDF exports, progress | admin (+ some protected for subs) | **Largest & messiest router** — see bugs below |
| `subcontractors` | list, get, me, create, update, delete, linkUser | admin (`me` protected) | |
| `financials` | get, upsert | admin | Real impl (projects.getFinancial/updateFinancial are dead stubs) |
| `checklists` | list, create, createItem, markComplete, updateCost, delete | protected (+ownership) | **Mixes two tables** — see bug C1 |
| `changeOrders` | list, create, approve, reject, delete | admin | |
| `notes` | list, create, delete | protected (+ownership) | |
| `messages` | list, send, delete, mentionableUsers | protected (+ownership) | Per-project chat |
| `files` | list, upload, delete | protected (+ownership) | Real S3 impl (projects.*File are stubs) |
| `proposals` | extractChecklist | protected | PDF → checklist extraction |
| `adminUsers` | list, setRole, setPermission | admin | |
| `emailAuth` | register, login, pendingUsers, approve, reject | public + admin | Email/password + approval flow |
| `bulkImport` | preview, importRows | protected | CSV/sheet import |
| `serviceTokens` | create, list, get, revoke, regenerate, delete | admin | Bot auth tokens |
| `logs` | getLogs, getRecentLogs, searchLogs, getLogStats, clearLogs | **public** | ⚠️ see bug S1 |

### WhatsApp (5 routers — overlapping)
| Router | Purpose | Guard |
|--------|---------|-------|
| `whatsapp` | authorized groups CRUD, statistics, message logs, webhook status, test message | **protected** |
| `whatsappAdmin` (singular) | per-group admins + per-group command permissions (**current model**) | **protected** |
| `whatsappAdmins` (plural) | global admins + global command permissions (**deprecated model**) | admin |
| `whatsappBot` | bot status, message logs/stats, admin-user CRUD, health, export | **protected** |
| `whatsappLogs` | message log querying, error/command stats, export, prune | **protected** |

> Five WhatsApp routers with overlapping responsibilities and **inconsistent guards**
> (`whatsappAdmins` is admin-only; the rest are merely `protected`). Detailed in Phase 3.

## 🐛 Health / risk observations (Phase 2)

### Security / access control
- **S1 — `logs` router is fully public.** `getLogs`, `searchLogs`, and **`clearLogs`** use
  `publicProcedure`. Anyone (unauthenticated) can read server logs and wipe them.
  *(High severity.)*
- **S2 — WhatsApp routers under-guarded.** `whatsapp`, `whatsappAdmin`, `whatsappBot`,
  `whatsappLogs` use `protectedProcedure`, so **any logged-in subcontractor** can read message
  logs, add/remove bot admins, toggle authorized groups, and send test messages. These are
  admin operations. *(High severity — privilege escalation.)*
- **S3 — Secrets in logs** (carried from Phase 0): WhatsApp tokens printed on boot.

### Correctness bugs (server)
- **C1 — `checklists` router mixes two tables under one `id` space.** `list`, `createItem`,
  `markComplete`, `delete` operate on `project_checklist_items`; but `create` and **`updateCost`**
  operate on `project_checklists` (the other table). So an item's completion and its cost live in
  different tables keyed by unrelated ids — `updateCost(id)` will write to a `project_checklists`
  row that has nothing to do with the item the user toggled. This is the concrete fallout of the
  "two checklist systems" noted in Phase 1. **Decide on one canonical table.**
- **C2 — `projects.createProposal` calls `createProposal(projectId, fileName, fileUrl)`** (3 positional
  args) but the db helper signature is `createProposal(data: InsertProjectProposal)` (single object).
  Mismatch → wrong insert / type error. (`uploadProposalAndExtract` is the path that actually works.)
- **C3 — `projects.createNote` (line ~453) calls `createNote(projectId, content)`** but the helper
  takes an `InsertProjectNote` object. The sibling `addNote` does it correctly — `createNote` is
  the broken duplicate.
- **C4 — `projects.exportSchedulePDF` calls `getProjectAssignments(p.id)`** which is **not imported**
  (the real helper is `getAssignmentsForProject`). When a subcontractor filter is applied, this
  throws `ReferenceError` at runtime and the PDF export fails.
- **C5 — `projects.reorderChecklistItems` passes `itemIds: number[]`** to a helper that expects
  `Array<{id, order}>`. Reorder will not set orders correctly.
- **C6 — `getNotesForProject` called without its `isAdmin` arg** in `projects.delete` and
  `projects.getNotes` → `isAdmin` is `undefined` (falsy), so admin-only notes are silently
  excluded (and in `delete`, admin-only notes are never cleaned up → orphans).
- **C7 — `emailAuth.approve` auto-link is dead code.** It calls `getPendingUsers()` *after*
  `approveUser()` already removed the user from the pending set, so `.find()` returns undefined,
  the email resolves to `""`, and the subcontractor auto-link never runs.

### Structural / maintainability
- **M1 — Dead stub endpoints in `projects`**: `getFiles` (returns `[]`), `getFinancial`
  (returns `null`), `deleteFile`/`updateFinancial` (return `{success:true}` doing nothing).
  The real implementations live in `files`/`financials` routers. Remove stubs or they'll mask bugs.
- **M2 — Alias sprawl**: `get`/`getById`, `assign`/`assignSubcontractor`,
  `removeAssignment`/`unassignSubcontractor`, `createNote`/`addNote` — multiple procedures doing
  the same thing "for client compatibility." Pick one each, delete the rest.
- **M3 — N+1 queries**: `getAssignmentsWithSubcontractorDetails`, `progressWith*`,
  `exportProjectsListPDF` loop per-project/per-assignment with awaited queries inside. Fine at
  current scale; will get slow. Candidate for joins.
- **M4 — No DB transactions**: multi-step writes (project delete + cascade, proposal re-extract,
  approve+autolink) are non-atomic; a mid-failure leaves partial state. Combined with no FK
  constraints (Phase 1), deletes can orphan rows.

## 🔌 Extension points (Phase 2)

- **New endpoint on existing domain** → add a procedure to the relevant router using
  `adminProcedure` (admin-only) or `protectedProcedure` + the `getSubcontractorByUserId` →
  `isSubcontractorAssignedToProject` ownership check (copy the pattern from `checklists.list`).
- **New data helper** → add to `server/db.ts` following the `getDb()`-guard convention
  (every helper early-returns when the DB is unavailable).
- **Server-generated PDFs** → `server/_core/pdfGenerator.ts` (puppeteer) + `storagePut` to S3 is
  the established pattern (schedule, projects list, progress reports).
- **Proposal/AI extraction** → `server/_core/proposalExtractor.ts` is the seam for improving
  PDF→checklist parsing.

## Recommended first fixes (feeds Phase 5 backlog)
1. **S1 + S2** — gate `logs` and the WhatsApp admin routers behind `adminProcedure`. Highest risk,
   low effort.
2. **C1** — resolve the two-checklist-table model (this is also a frontend question — Phase 4).
3. **C4 / C2 / C3** — straight-up broken calls; quick wins once confirmed against client usage.
4. Remove **M1** dead stubs so they stop masking the real `files`/`financials` routers.
