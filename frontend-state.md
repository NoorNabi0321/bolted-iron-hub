# Frontend State Notes

## CSS Status
- index.css uses proper Tailwind v4 syntax (`@import "tailwindcss"`)
- OKLCH colors used correctly for white/red theme
- Light theme is active (defaultTheme="light" in App.tsx)
- Screenshot shows CSS is rendering correctly

## Current Issues
- The 5 TS errors are all in template files (Markdown.tsx, ComponentShowcase.tsx) - not our code
- CSS `@apply` errors for `font-semibold` and `gap-1.5` were logged earlier but seem to be from stale cache
- After server restart, the app renders correctly

## Pages to verify are mobile-friendly
- CRMLayout.tsx - sidebar with mobile hamburger menu
- admin/Dashboard.tsx - stat cards, pipeline
- admin/Projects.tsx - filters, table
- admin/ProjectDetail.tsx - 3-col grid → 1-col on mobile (already updated)
- sub/Dashboard.tsx - stats, project list (already updated)
- sub/ProjectDetail.tsx - needs check
- admin/Subcontractors.tsx - needs check
- admin/Users.tsx - needs check
- admin/Permissions.tsx - needs check
- Login.tsx - already responsive
