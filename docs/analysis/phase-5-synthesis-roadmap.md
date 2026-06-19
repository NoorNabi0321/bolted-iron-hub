# Phase 5 — Synthesis & Roadmap

Pulls Phases 0–4 into (a) end-to-end workflows, (b) a **prioritized bug backlog**, and (c) a
**safe-extension map**. This is the doc to drive the next sprint.

## 5.1 End-to-end workflows

### A. Project lifecycle (admin)
1. Admin creates a project (`ProjectForm` → `projects.create`) → status defaults to `Shop Drawings`.
2. Admin assigns subcontractor(s) (`projects.assign` → `project_assignments`).
3. Admin uploads a **proposal PDF** (`projects.uploadProposalAndExtract`) →
   `proposalExtractor` parses it → replaces `project_checklist_items` (source `extracted`).
4. Admin/sub toggle checklist items complete (`projects.updateChecklistItem`); admin can assign
   items to subs and reorder.
5. Status advances through the 6-stage pipeline (`StatusBadge`/`updateStatus`). `Inspection Passed`
   projects are auto-hidden from most lists.
6. Admin exports schedule/projects PDFs (puppeteer → S3) and weekly progress reports.

### B. Subcontractor view
1. Sub registers (`emailAuth.register`, `isApproved=false`) → admin approves (`Approvals`).
2. Sub logs in → sees only assigned, non-archived projects (`projects.myProjects`).
3. On a project: views/creates notes (`notes.*`), uploads files (`files.*`), toggles **assigned**
   checklist items, reads non-admin-only chat (`messages.*`).

### C. WhatsApp bot (live path = whatsapp-web.js)
1. Server boot → `initializeBot()` → QR shown in terminal + dashboard.
2. Admin scans QR; bot joins WhatsApp groups; admin authorizes groups (`whatsapp.addAuthorizedGroup`).
3. Group member sends `/status <project>` → listener checks group authorized → executes command →
   bot replies in group; every message logged to `whatsapp_messages_log`.
4. Admin monitors logs/stats/health via the WhatsApp dashboard.

### D. Auth
- Email/password (bcrypt) or OAuth → session cookie. Service tokens (Bearer) → synthetic admin,
  used for service-to-service / bot calls.

## 5.2 Prioritized bug backlog

Severity = impact × likelihood. IDs trace back to phase docs.

### 🔴 P0 — Security / data-integrity (do first)
| ID | Issue | Fix sketch |
|----|-------|-----------|
| S1 | `logs` router fully **public**, incl. `clearLogs` | Move router to `adminProcedure` |
| S2 | `whatsapp`, `whatsappAdmin`, `whatsappBot`, `whatsappLogs` only `protected` → subs can administer the bot | Switch these routers to `adminProcedure` |
| S3 | WhatsApp secrets printed to stdout on boot | Remove/redact the `console.log`s in `index.ts` |
| W1 | Live bot path bypasses per-group permissions (hard-coded `'admin'`) | Route listener through `processWhatsAppMessage` / `canExecuteCommandInGroup` |

### 🟠 P1 — Broken features (high user impact)
| ID | Issue | Fix sketch |
|----|-------|-----------|
| F1 | Admin **financials** call no-op stubs; real `financials` router unused | Point `ProjectDetail` at `financials.get/upsert`; delete stubs |
| F2 | Admin **file** upload/list don't persist/show (`projects.*File` stubs) | Use the real `files` router on admin side too |
| F4 | `whatsappAdmins` name collision → `WhatsAppCommandConfig` calls a missing procedure | Rename/mount correctly; delete the dead plural file |
| W2 | Bot **session not persisted** (no `LocalAuth`) → re-scan QR every restart | Add `authStrategy: new LocalAuth({ dataPath: SESSION_DIR })` |
| C2/C3/C4/C5/C6 | Broken db-helper calls in `projects.ts` (wrong arity / undefined fn / wrong shape / missing `isAdmin`) | Fix signatures; `C4` (`getProjectAssignments`) crashes PDF export with sub filter |
| C7 | `emailAuth.approve` auto-link is dead (queries pending list after approval) | Capture user/email **before** `approveUser()` |

### 🟡 P2 — Correctness / model cleanup
| ID | Issue | Fix sketch |
|----|-------|-----------|
| C1/F3 | Two checklist tables; cost orphaned from displayed items | Make `project_checklist_items` canonical, add `cost`, retire `project_checklists` + `checklists` router + `ProjectChecklists.tsx` |
| W4 | Bot command catalog out of sync (router/help/banner vs 7 real handlers) | Single source of truth from `whatsappCommandRegistry` |
| W5 | `message_create` echo/loop risk (no `fromMe` filter) | Ignore `message.fromMe`; remove duplicate debug listeners |
| M4 | No DB transactions on multi-step writes (delete cascade, re-extract, approve+link) | Wrap in `db.transaction(...)` |
| 5 (P1-phase1) | No FK constraints → orphan rows on delete | Add FKs or explicit cascade cleanup |

### ⚪ P3 — Hygiene / maintainability
| ID | Issue |
|----|-------|
| M1 | Remove dead stub endpoints in `projects.ts` (`getFiles/getFinancial/deleteFile/updateFinancial`) |
| M2 | Collapse alias procedures (`get`/`getById`, `assign`/`assignSubcontractor`, `createNote`/`addNote`, …) |
| W3/W6 | Remove dead Meta webhook + unwired `whatsappMessageProcessor`/`whatsappCommandRouter` (or finish & wire) + deprecated WA tables/routers |
| M3 | N+1 query loops → joins (assignments-with-details, progress, list PDF) |
| 2 (phase0) | Dev scripts POSIX-only → add `cross-env` for Windows |
| 6 (phase0) | Gitignore `.wwebjs_cache/`, `.manus/db/`, `sessions/` |
| — | Local `adminProcedure` in `projects.ts` duplicates the shared one |

## 5.3 Safe-extension map (where to build new features)

| Want to add… | Where / pattern |
|--------------|-----------------|
| New domain entity (full slice) | `drizzle/schema.ts` → migration (`db:push`) → helpers in `server/db.ts` → new router → register in `server/routers.ts` → `trpc.<x>` in client |
| New field on project | schema column + migration; types propagate via Drizzle inference |
| New API on existing domain | add procedure; `adminProcedure` for admin-only, or `protectedProcedure` + `getSubcontractorByUserId`→`isSubcontractorAssignedToProject` ownership check (copy `checklists.list`) |
| New WhatsApp command | `whatsappCommandHandlers/<x>Command.ts` + register in `whatsappCommandRegistry` + `whatsappCommandExecutor`; update help. Avoid the unwired `whatsappCommandRouter` |
| Server-generated PDF | `server/_core/pdfGenerator.ts` (puppeteer) + `storagePut` to S3 |
| Better proposal parsing / AI | `server/_core/proposalExtractor.ts`; AI via `@ai-sdk` (`server/_core/chat.ts`) |
| New admin/sub screen | page under `pages/admin|sub/` + `<Route>` in the role `Switch` in `App.tsx` |
| Reusable UI | `components/ui/*` (full shadcn set) |

## 5.4 Suggested first sprint (order of operations)

1. **P0 security batch** (S1, S2, S3, W1) — small, high-value, low-risk diffs. Establish the
   real authorization story before building on the bot.
2. **W2 LocalAuth** — ~1 line, removes daily QR pain; makes the bot usable for further dev.
3. **F1 + F2** — restore admin financials & files by pointing at the real routers; delete stubs (M1).
4. **F4 + W4** — fix the WhatsApp router-name collision and reconcile the command catalog.
5. **C-series** correctness fixes in `projects.ts` (verify each against the client call site first).
6. **C1/F3 checklist consolidation** — bigger; do as a focused migration once the above land.
7. **W3/W6 dead-code removal** — once one bot path is confirmed canonical.

> Before each fix, confirm the live call site (the Phase 4 screen→API map) so a "cleanup" doesn't
> remove something the UI still calls. Several "duplicates" here are load-bearing for exactly one
> screen.

## 5.5 Verification gaps to note
- `npm run check` (tsc) and `npm run test` (vitest) were **not run** during this analysis — the bug
  list is from static reading. Several items (C2–C6) would surface as type errors; running `tsc`
  is the fastest way to confirm/triage them. Recommend that as step 0 of the sprint.
- There is a substantial existing test suite (whatsapp.*, projects.*, timezone/time-conversion).
  Run it first to get a baseline before changing anything.
