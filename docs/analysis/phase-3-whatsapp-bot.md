# Phase 3 — WhatsApp Bot Subsystem

~40 files under `server/services/` (+ `_core/whatsappMiddleware.ts`, `db/whatsappQueries.ts`,
5 tRPC routers from Phase 2). This is the single largest and most duplicated area of the codebase.
It was clearly built in iterative "phases" (`WHATSAPP_PHASE3..7_IMPLEMENTATION.md`), and **earlier
phases were left in place when later ones replaced them** — the central finding below.

## 3.1 The big picture: two transports, two orchestrators — only one of each is live

There are **two completely separate inbound message paths**, both registered at startup:

### Path A — whatsapp-web.js (QR login) — ✅ THE LIVE PATH
```
WhatsApp group message
  → bot.on('message_create')            whatsappMessageListener.ts
  → handleIncomingMessage()             (listener) — checks group authorized,
                                          hasCommandPermission('admin', '/cmd')
  → handleWhatsAppMessageAndRespond()   whatsappResponseService.ts
  → executeWhatsAppCommand()            whatsappCommandExecutor.ts → command handlers
  → sendGroupMessage()                  whatsappMessageSender.ts (bot replies in group)
```
Bot lifecycle in `whatsappBotService.ts`: `whatsapp-web.js` `Client` + `puppeteer`/Chromium,
QR shown in terminal **and** cached for the dashboard (`getLastQRCode`).

### Path B — Meta Cloud API webhook — ❌ DEAD / STUB
```
POST /api/webhooks/whatsapp
  → whatsappMiddleware.handleIncomingMessage()
  → verify x-hub-signature-256, auto-register group, LOG the message... and STOP.
```
The webhook **verifies, logs, and then does nothing** — the code literally says
`// Message will be processed by command handler (Phase 3-4) // For now, just log it`.
It never executes a command or replies. It also hard-requires `WHATSAPP_TOKEN` (500s without it).
**This is abandoned migration scaffolding** — the project moved from the Meta Cloud API to
`whatsapp-web.js` but left the webhook wired in `index.ts`.

### Two orchestrators
- `whatsappResponseService.handleWhatsAppMessageAndRespond` — **wired** (used by Path A).
- `whatsappMessageProcessor.processWhatsAppMessage` — **NOT wired.** It's a richer, more correct
  4-stage orchestrator (authorization → per-group permission via `canExecuteCommandInGroup` →
  typing indicator → execution → response → structured logging). It is dead code despite being
  the "better" implementation.

## 3.2 Command pipeline (the parts that are used)

| File | Role |
|------|------|
| `whatsappCommandParser.ts` | Parse `/cmd args` → `{isCommand, commandType, parameters}` |
| `whatsappCommandRegistry.ts` | Canonical names, aliases, help text |
| `whatsappCommandRouter.ts` | Map command → handler name, validate params (**unwired** — see below) |
| `whatsappParameterValidator.ts` | Validate/normalize parameters, resolve project name |
| `whatsappCommandExecutor.ts` | Actually dispatch to handlers |
| `whatsappCommandHandlers/*` | One file per command |
| `whatsappProjectLookup.ts` | Fuzzy project lookup by name |
| `whatsappResponseFormatter.ts` | Format/limit outbound text |
| `whatsappMessageSender.ts` | `sendGroupMessage` / `sendIndividualMessage` |
| `whatsappMessageLogger.ts` | Write `whatsapp_messages_log` rows |

**Implemented command handlers** (`whatsappCommandHandlers/`): `help`, `list`, `pending`,
`project`, `report`, `status`, `weekly`.

## 3.3 Authorization model (as actually enforced)

The live path (`whatsappMessageListener`) does:
1. Is the **group** in `whatsapp_authorized_groups` and enabled? (yes/no gate)
2. `hasCommandPermission('admin', '/cmd')` — **note the role is hard-coded to `'admin'`.**

The sender's phone number is **never checked against `whatsapp_group_admins`**, and
`whatsapp_group_command_permissions` / `canExecuteCommandInGroup` are only consulted by the
**unwired** processor. So in production: **any participant in an authorized group can run any
enabled command.** The entire per-group admin/permission system (tables, `whatsappAdmin` router,
`WhatsAppGroupModal` UI) is built but bypassed at runtime.

## 🐛 Health / risk observations (Phase 3)

- **W1 — Per-group permissions are bypassed.** The live listener hard-codes `'admin'` and never
  checks sender phone. To enforce the intended model, the listener must route through
  `processWhatsAppMessage` (or call `canExecuteCommandInGroup(groupChatId, senderPhone, cmd)`).
  *(High — it's a security/authorization gap and makes the whole admin UI non-functional.)*
- **W2 — Session persistence is broken.** `whatsappBotService` defines `SESSION_DIR`/`SESSION_FILE`
  and a sessions dir, but constructs `new Client({ puppeteer })` **without `authStrategy: LocalAuth`**.
  whatsapp-web.js therefore does **not** persist the session → QR must be re-scanned on every
  restart. The session-file plumbing is dead. *(High — major operational pain.)*
- **W3 — Dead Meta Cloud webhook.** Path B is non-functional but still mounted, still requires
  `WHATSAPP_TOKEN`, and still auto-registers groups + writes logs. It can create authorized-group
  rows that the live path then trusts. Either finish it or remove it.
- **W4 — Advertised commands that don't exist.** The router's `handlerMap` and the help text
  reference `team`, `deadline`, `checklist`, `notes`, `changes`, `count`, `insights` — **none of
  which have handler files**. Users following `/help` will hit "unknown/!working command." The
  startup banner advertises a *different* set (`/weekly /pending /report`). Three sources of truth,
  all out of sync. *(Medium — user-facing.)*
- **W5 — Echo/loop risk.** Listener binds `message_create`, which fires for the bot's **own**
  outgoing messages too; there is no `message.fromMe` filter. Combined with the extra debug
  listeners registered in `whatsappBotService`, messages are handled by multiple listeners and the
  bot can react to itself. *(Medium.)*
- **W6 — Two orchestrators / massive duplication.** `whatsappResponseService` vs
  `whatsappMessageProcessor`, `whatsappCommandRouter` (unwired) vs `whatsappCommandExecutor`
  (wired), `whatsappAdmin` vs `whatsappAdmins` routers, deprecated `whatsapp_admin_users` /
  `whatsapp_command_permissions` tables. High risk of fixing the wrong copy.
- **W7 — Bot init blocks startup** (carried from Phase 0): `await initializeBot()` before routes.
- **W8 — `isUserAuthorized()` is a `return false` placeholder** still exported from the service.

## 🔌 Extension points (Phase 3)

- **Add a new command** → create `whatsappCommandHandlers/<x>Command.ts`, register it in
  `whatsappCommandRegistry.ts` + `whatsappCommandExecutor.ts`, and update the help text. ⚠️ Do
  **not** rely on `whatsappCommandRouter.ts` — it isn't in the live path.
- **Enforce real permissions** → switch the listener to `processWhatsAppMessage`, which already
  wires `canExecuteCommandInGroup`. This single change activates the whole admin UI.
- **Fix session persistence** → pass `authStrategy: new LocalAuth({ dataPath: SESSION_DIR })` to
  the `Client` constructor.
- **Project data for commands** → `whatsappProjectLookup.ts` + `server/db.ts` helpers are the seam.

## Recommended first fixes (feeds Phase 5 backlog)
1. **W2** (LocalAuth) — biggest day-to-day operational win, ~1 line.
2. **W1** (route live path through per-group permission check) — closes the auth gap and makes the
   admin dashboard meaningful.
3. **W4** — reconcile the command catalog to the 7 implemented handlers (help/router/banner).
4. **W3 / W6** — decide: keep whatsapp-web.js only, then delete the Meta webhook + deprecated
   routers/tables + the unwired router. Removes most of the duplication risk.
