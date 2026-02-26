# AGENTS.md

## Cursor Cloud specific instructions

This is a purely client-side React + TypeScript + Vite SPA (no backend, no database, no Docker). All simulation logic runs in Web Workers in the browser.

### Quick reference

| Action | Command |
|--------|---------|
| Install deps | `npm install` |
| Dev server | `npm run dev` (Vite, port 5173 by default) |
| Lint | `npm run lint` |
| Build | `npm run build` (runs `tsc -b && vite build`) |
| Preview prod build | `npm run preview` |

### Notes

- The Vite config sets `base: '/restroom-queue-simulator/'`, so the app is served at `http://localhost:5173/restroom-queue-simulator/` (not the root `/`).
- There are no automated tests configured in this project (`package.json` has no `test` script). Validate changes via lint, build, and manual browser testing.
- ESLint has ~100 pre-existing errors (unused vars, `no-explicit-any`, `no-case-declarations`). These are in the existing codebase and are not regressions.
- The 3D View (Three.js) is lazy-loaded — it only initializes when the user switches to the "3D View" tab.
- The `cs166/` directory contains a standalone Python/Jupyter prototype; it is not part of the web application.
