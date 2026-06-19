# Bolted Iron Hub — Codebase Analysis

> Living analysis of the Bolted Iron Hub system, produced to support **bug fixing** and
> **continued feature development**. Each phase doc carries two running threads:
> **🐛 Health / risk observations** (bug backlog) and **🔌 Extension points** (where new
> work plugs in safely).

## What this system is

A full-stack **construction / steel-fabrication project-management platform** for a
contractor, with a large **WhatsApp bot** surface for field updates. Two user roles:
**admin** (office) and **subcontractor** (field). Projects move through a fixed status
pipeline (Review → Shop Drawings → Fabrication → On-Site → Installed → Inspection Passed),
carry checklists, proposals (PDF-extracted into line items), change orders, financials,
files, notes, and a per-project chat. A WhatsApp bot lets authorized groups query project
status and pull weekly reports via slash commands.

## Tech stack (confirmed)

| Layer | Tech |
|-------|------|
| Client | React 19, Vite 7, Tailwind 4, shadcn/ui (Radix), wouter (routing), TanStack Query |
| API | Express 4, tRPC v11, superjson |
| Data | Drizzle ORM + MySQL (`mysql2`), 17 migrations |
| Auth | JWT (`jose`), bcrypt, cookies, OAuth, email/password |
| Files | AWS S3 (presigned URLs) |
| AI | `@ai-sdk` + OpenAI (chat box, voice transcription, image gen) |
| WhatsApp | `whatsapp-web.js` (QR login) + Meta Cloud webhook, `puppeteer`/Chromium |
| PDF | `pdf-parse`, `pdf-lib`, `puppeteer` (proposal extraction + report generation) |

## Phase plan

| Phase | Scope | Status | Doc |
|-------|-------|--------|-----|
| 0 | Orientation & ground truth (stack, entry points, build/run) | ✅ Done | [phase-0-1-overview.md](phase-0-1-overview.md) |
| 1 | Data model (schema, relations, migrations) | ✅ Done | [phase-0-1-overview.md](phase-0-1-overview.md) |
| 2 | Backend / API surface (19 tRPC routers, auth model, `_core` services) | ✅ Done | [phase-2-backend-api.md](phase-2-backend-api.md) |
| 3 | WhatsApp bot subsystem (command pipeline, webhooks, lifecycle) | ✅ Done | [phase-3-whatsapp-bot.md](phase-3-whatsapp-bot.md) |
| 4 | Frontend (routing, admin vs sub trees, components, data flow) | ✅ Done | [phase-4-frontend.md](phase-4-frontend.md) |
| 5 | Synthesis & roadmap (end-to-end workflows, bug backlog, extension map) | ✅ Done | [phase-5-synthesis-roadmap.md](phase-5-synthesis-roadmap.md) |
| 6 | Local baseline (tsc 116 errors, test state, fix order) | ✅ Done | [phase-6-local-baseline.md](phase-6-local-baseline.md) |

## How to read this

- Start with [phase-0-1-overview.md](phase-0-1-overview.md) for the system map and data model.
- Jump to **[phase-5-synthesis-roadmap.md](phase-5-synthesis-roadmap.md)** for the prioritized
  bug backlog (P0–P3), end-to-end workflows, and the safe-extension map — this is the doc that
  drives the next sprint.
- The **🐛** items in each phase aggregate into the Phase 5 backlog.
- The **🔌** items aggregate into the Phase 5 "safe places to build" map.

## Headline findings (analysis complete)

1. **P0 security:** `logs` router is fully public (incl. `clearLogs`); four WhatsApp routers are
   only `protected` (subs can administer the bot); WhatsApp secrets are logged on boot; the live
   bot path bypasses per-group permissions.
2. **Broken admin features:** Financials and admin file management are wired to **no-op stub**
   endpoints — they silently do nothing. The real `financials`/`files` routers exist but the admin
   UI doesn't use them.
3. **WhatsApp duplication:** two inbound transports (only whatsapp-web.js works; the Meta webhook
   is dead scaffolding) and two orchestrators (the "better" one is unwired). Bot session isn't
   persisted (missing `LocalAuth`) → QR re-scan every restart. A router-name collision breaks a
   settings screen.
4. **Two checklist systems** over two tables; "cost" is orphaned from the items the user sees.
5. Verification (`tsc`, `vitest`) was **not run** — bug list is from static reading; run them as
   sprint step 0.
