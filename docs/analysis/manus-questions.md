# Questions to ask Manus

Goal: information needed to (1) protect the live MySQL data, (2) keep local code aligned with the
Manus deployment, and (3) push fixes back so Manus can pull and run cleanly.
⭐ = must-have.

> Decision: the **WhatsApp bot integration is being removed completely** (code-only now; the
> `whatsapp_*` tables will be left intact in the live DB until we can drop them safely with a
> backup). WhatsApp-specific questions have therefore been removed from this list.

## A. Database (most important — data safety & alignment)
1. ⭐ What exact **MySQL version** does the BIH database run? (e.g. 8.0.x)
2. ⭐ Can you provide a **schema-only dump** (`mysqldump --no-data`)? Lets us verify the repo's
   `schema.ts` / migrations match the live DB.
3. ⭐ Can you provide (or take) a **full backup** (`mysqldump` with data) before we make any change?
4. ⭐ What does the **`__drizzle_migrations` table** contain — which migrations are applied?
   (Expect tags `0000_…` through `0016_round_la_nuit`.)
5. ⭐ During the last ~3 days of broken development, were any **schema changes made directly to the
   database** (columns/tables added/altered) *outside* of Drizzle migrations?
6. What **character set / collation** is the database using? (e.g. `utf8mb4`)
7. What **timezone** is the DB server set to? (the app has known date/timezone issues)
8. Roughly **how much data exists** and in which tables? Which tables hold data we must not lose?
   (We will leave the `whatsapp_*` tables untouched for now.)
9. How is `DATABASE_URL` provided in the Manus runtime — does it need **SSL / a special host**, and
   what is the connection-string format?

## B. How Manus builds, deploys & runs the code
10. ⭐ When you **pull updated code from GitHub**, what exact commands run? (build + start — e.g.
    `pnpm install`, `pnpm build`, `pnpm start`?)
11. ⭐ Does Manus **automatically run database migrations** (`drizzle-kit migrate` / `db:push`) on
    deploy, or never?
12. What **Node.js version**, **package manager** (pnpm?), and **OS** does the runtime use?
13. How is the app served — what **port** and **public URL/domain**?
14. Is **Chromium/Chrome available** in the runtime? (Still needed after WhatsApp removal, for
    **server-side PDF generation** via puppeteer.) How is it installed (the build runs
    `scripts/install-chromium.mjs`)?

## C. Migrations & schema-change handling
15. ⭐ If we add a **new migration** (e.g. `0017_…`) and push it, how does it get applied to the
    live DB — automatically on deploy, or a manual step you run?
16. Has Manus ever **squashed, edited, or re-generated** existing migration files?

## D. Environment variables & secrets
17. ⭐ Please share the **full list of environment variable names** configured for BIH (names alone
    are fine — so we confirm none are missing).
18. ⭐ What are `VITE_APP_ID`, `OAUTH_SERVER_URL`, and `OWNER_OPEN_ID` set to, and what auth system
    do they point at? (Does login depend on a Manus-hosted OAuth server?)
19. ⭐ What are `BUILT_IN_FORGE_API_URL` and `BUILT_IN_FORGE_API_KEY` / `FORGE_API_KEY`? Is this a
    **Manus-provided AI gateway** (used by proposal extraction + the AI chat box)? Can it be
    used/tested outside the Manus environment, and how?
20. What **S3 / object-storage** is configured — bucket, region, credential variable names — and
    are uploaded files (proposals, generated PDFs) stored there persistently?
21. Are `GMAIL_EMAIL` / `GMAIL_APP_PASSWORD` configured for email notifications? (Keeping this.)

## E. Code / version state & rollback
22. ⭐ Is the code **currently running on Manus identical to the GitHub repo** (the single "Initial
    commit"), or does Manus have newer/uncommitted code not on GitHub?
23. ⭐ Does Manus keep its **own version history / snapshots**? Is there a **known-good snapshot from
    before the last ~3 days** of breakage we could reference or restore?
24. Is there a **log/summary of what changed** during those 3 days?

## F. GitHub sync workflow
25. ⭐ How is the Manus project **connected to GitHub** — auto-push, auto-pull, or manual? Which
    **branch** does it deploy from (e.g. `main`)?
26. ⭐ After we push updated code to `main`, **how do we trigger Manus to pull and redeploy**?
27. ⭐ Will Manus ever **overwrite our pushed changes** with its own copy on the next session — is
    GitHub or Manus the source of truth?

## G. External services
28. Besides MySQL, S3, the Forge AI gateway, and Gmail — are there **any other external services or
    integrations** the app depends on?
29. Is any **external system still pointing at this app's WhatsApp webhook** (Meta, etc.)? We're
    removing the bot and want to confirm nothing external breaks when those endpoints disappear.

---

## If you can only get a few answers, prioritize these
- A1–A5 (MySQL version, schema dump, full backup, applied-migrations list, out-of-band changes)
- B10–B11 (what runs on pull; does it auto-migrate)
- D17–D19 (env var names; auth + Forge AI details)
- E22–E23 (is GitHub == deployed code; any known-good snapshot)
- F25–F27 (GitHub↔Manus sync direction & how to trigger a redeploy)
