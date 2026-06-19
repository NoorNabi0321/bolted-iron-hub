# Phase 4 — Frontend

React 19 SPA, Vite, Tailwind 4, shadcn/ui. Routing via **wouter**. Server state via
**tRPC + TanStack Query** ([`client/src/lib/trpc.ts`](../../client/src/lib/trpc.ts) —
`createTRPCReact<AppRouter>()`, so the entire API is end-to-end typed). No Redux/Zustand;
local React state + two contexts (`ThemeContext`, `NavigationContext`).

## 4.1 Routing & role gating ([`App.tsx`](../../client/src/App.tsx))

Auth gate via `useAuth()` (`_core/hooks/useAuth.ts` → `trpc.auth.me`). Then a **role-switched
route tree**:

| Role | Routes |
|------|--------|
| not logged in | `<LoginPage>` (email login/register) |
| `admin` | `/` Dashboard, `/projects`, `/projects/:id`, `/subcontractors`, `/users`, `/permissions`, `/approvals`, `/bulk-import`, `/progress`, `/whatsapp-settings`, `/whatsapp-bot` |
| `user` (= subcontractor) | `/` SubDashboard, `/projects/:id` SubProjectDetail |

> Reminder (Phase 1): the non-admin role is literally `"user"`; the UI treats it as
> "subcontractor." There is **no separate sub-vs-user distinction** — every non-admin is a sub.

## 4.2 Screen → API map (verified from client tRPC calls)

| Screen / component | Calls |
|--------------------|-------|
| `Login` | `emailAuth.login`, `emailAuth.register` |
| admin `Dashboard` | `projects.list` (×2), `subcontractors.list` |
| admin `Projects` | `projects.list`, `subcontractors.list`, `projects.exportProjectsListPDF`, `projects.delete`, `projects.update` |
| admin `ProjectForm` | `subcontractors.list`, `projects.getAssignments`, `projects.assign`, `projects.create/update`, `projects.deleteAssignment`, `projects.updateAssignment` |
| admin `ProjectDetail` | `projects.get`, `getAssignments`, `getNotes`, `getFiles`⚠️, `getFinancial`⚠️, `getChecklistItems`, `addNote`, `deleteNote`, `uploadFile`⚠️, `deleteFile`⚠️, `updateStatus`, `delete`, `updateFinancial`⚠️, `assign/unassignSubcontractor`, `uploadProposalAndExtract`, `updateChecklistItem`, `deleteChecklistItem`, `assignChecklistItem` |
| admin `ProjectProgress` | `projects.generateWeeklyReportPDFOnDemand`, `progressWithChecklists`, `progressWithoutChecklists` |
| admin `Users` / `Permissions` / `Approvals` | `adminUsers.*`, `subcontractors.*`, `emailAuth.pendingUsers/approve/reject` |
| admin `Subcontractors` | `subcontractors.list/create/update/delete` |
| admin `BulkImport` | `bulkImport.importRows` |
| `DailySchedule` | `projects.exportSchedulePDF` |
| sub `Dashboard` | `projects.myProjects`, `subcontractors.me` |
| sub `ProjectDetail` | `projects.getForSubcontractor`, `notes.list`, `files.list`, `notes.create`, `files.upload` |
| `ProjectChat` | `messages.list/mentionableUsers/send/delete` |
| `ProjectChangeOrders` | `changeOrders.list/create/approve/reject/delete` |
| `ProjectChecklists` | `checklists.list/create/markComplete/updateCost/delete` ⚠️ |
| `ProjectChecklist` / `ChecklistViewMode` / `ChecklistEditMode` / `AddChecklistItem` | `projects.getChecklistItems / createChecklistItem / updateChecklistItem / deleteChecklistItem` |
| Proposal components | `projects.uploadProposalAndExtract / getProposal / deleteProposal` |
| WhatsApp settings/logs/dashboard | `whatsapp.*`, `whatsappBot.*`, `whatsappLogs.*`, `whatsappAdmins.*` ⚠️, `logs.*` ⚠️ |
| `LiveConsole` | `logs.getLogs`, `logs.clearLogs` ⚠️ |

## 🐛 Health / risk observations (Phase 4)

These confirm/extend earlier-phase findings with **client-side proof**:

- **F1 — Admin Financials don't work.** `ProjectDetail` calls `projects.getFinancial` and
  `projects.updateFinancial`, which are the **dead stubs** (return `null` / `{success:true}` and
  persist nothing — Phase 2 M1). The real `financials` router (`get`/`upsert`) is **not called by
  any client code**. So entering financials on a project silently does nothing. *(High — a whole
  admin feature is non-functional.)*
- **F2 — Admin file management is half-wired.** `ProjectDetail` uploads via `projects.uploadFile`
  (puts to S3 but **never writes a `project_files` row**) and lists via `projects.getFiles`
  (always returns `[]`). So admin-uploaded files never appear. The **working** file router
  (`files.list/upload/delete`, with DB persistence) is only used by the **sub** ProjectDetail.
  Two different file systems for the same data. *(High.)*
- **F3 — Two checklist UIs over two tables (the Phase 2 C1 split, visualized).**
  - `ProjectChecklist*` family → `projects.*ChecklistItem*` → `project_checklist_items`
    (proposal-extracted, ordered, completion toggles). **This is the one rendered in ProjectDetail.**
  - `ProjectChecklists.tsx` → `checklists.*` → mixes `project_checklists` (create/cost) and
    `project_checklist_items` (list/complete/delete). Cost entry writes to a table the displayed
    items don't come from → **cost is effectively orphaned from the item the user sees.**
  Decide on one. Likely keep `project_checklist_items` + add a `cost` column there, retire
  `project_checklists` + `ProjectChecklists.tsx`.
- **F4 — `whatsappAdmins` router-name collision breaks UI calls.** `server/routers.ts` mounts the
  **singular** file (`whatsappAdmin.ts`, the per-group model) under the **plural** key
  `whatsappAdmins`. The **plural** file (`whatsappAdmins.ts`, global model) is **never imported →
  dead code**. So client calls to methods that only exist in the plural file fail at runtime:
  `WhatsAppCommandConfig.tsx` → `trpc.whatsappAdmins.getAllCommands` has **no matching procedure**
  on the mounted router. *(High — broken screen + a confusing dead file.)*
- **F5 — Public log console.** `LiveConsole.tsx` is wired to `logs.getLogs`/`logs.clearLogs`,
  which are `publicProcedure` (Phase 2 S1). The destructive "clear logs" is reachable without auth
  at the API level.
- **F6 — WhatsApp admin screens under-guarded.** `WhatsAppBotAdminManagement`,
  `WhatsAppAdminManager`, settings, logs all call `protectedProcedure` endpoints (Phase 2 S2) — a
  logged-in subcontractor could drive them via the API even though the nav doesn't link there.
- **F7 — Alias coupling.** The client leans on the "compatibility alias" procedures
  (`projects.get`, `projects.assign`, `projects.addNote`, `projects.unassignSubcontractor`). When
  cleaning up the alias sprawl (Phase 2 M2), update these call sites together.

## 🔌 Extension points (Phase 4)

- **New admin screen** → add a page under `pages/admin/`, register a `<Route>` in the admin
  `Switch` in `App.tsx`, add nav in the dashboard layout.
- **New sub screen** → page under `pages/sub/` + route in the sub `Switch`.
- **New data on a screen** → add the procedure server-side, then call it with
  `trpc.<router>.<proc>.useQuery/useMutation`; types flow automatically from `AppRouter`.
- **Reusable UI** → `components/ui/*` is the full shadcn set; build features from these.
- **Theming** → `ThemeContext` (defaults light) + Tailwind tokens in `index.css`.

## Open question now resolved
- **Canonical checklist table:** the live ProjectDetail uses `project_checklist_items`. Treat that
  as canonical; `project_checklists` + the `checklists` router + `ProjectChecklists.tsx` are the
  legacy/duplicate path carrying the only "cost" feature.
