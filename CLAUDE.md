# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server (Vite HMR)
npm run build     # production build
npm run preview   # preview production build locally
npm run lint      # run oxlint (whole project)
npx oxlint src/hooks/usePomodoro.js   # lint a single file
npm test          # run the Vitest suite once
npm run test:watch # run Vitest in watch mode
```

Tests run under Vitest with jsdom (config lives in the `test` block of `vite.config.js`). Hook tests use `@testing-library/react`'s `renderHook` and fake timers to drive the countdown without waiting on real time — see `src/hooks/usePomodoro.test.js` for the pattern. Browser-only side effects (audio, notifications) live in `src/lib/alert.js` and are mocked with `vi.mock` in tests, since jsdom doesn't implement `AudioContext`/`Notification`. Pure calculation helpers used by a component (e.g. `countAvailablePomodoros` in `src/lib/pomodoroMath.js`, `isCurrentBlock` in `src/lib/timetable.js`) live in their own `src/lib/*.js` file rather than being exported from the component — co-exporting a plain function from a component file breaks Fast Refresh (oxlint's `only-export-components` warns on this).

## Architecture

This is a Pomodoro timer app implementing the Pomodoro Technique (25-min work sessions, short/long breaks, interruption tracking). Stack: React 19, Vite 8, Tailwind CSS v4, oxlint.

### Data flow

All persistent state lives in `localStorage`. `src/lib/storage.js` is the single point of access — it exposes typed load/save helpers for five storage keys:

| Key | Purpose |
|-----|---------|
| `pomodoro_inventory` | Activity Inventory — the task backlog |
| `pomodoro_today_tasks` | Tasks selected for today with realized/interruption counts |
| `pomodoro_activity_log` | Completed-task records (estimate vs. actual) |
| `pomodoro_ticks` | Lightweight per-pomodoro/interruption events for reports |
| `pomodoro_settings` | User preferences: `cycleLength`, `theme`, `chimeStyle` |

`patchSettings(partial)` merges into existing settings and must be used instead of `saveSettings` whenever a feature only owns one key of the settings object — otherwise it clobbers the others. `exportAllData()` bundles all five keys for the JSON backup download in `RecordsLog`.

`storage.js` also owns a `pomodoro-data-changed` custom window event. Any write that should notify passive listeners (adding a tick, completing a task) dispatches this event. Components that read from storage but don't receive props — `RecordsLog` and `Reports` — subscribe with `subscribeToChanges()` to re-read when data changes.

### Hook layer

Four hooks own all mutable state:

- **`useInventory`** — CRUD for the Inventory list; auto-saves to localStorage on every change. Also owns `combineItems` (Rule 5: merge 2+ small tasks into one, summing estimates).
- **`useTodayTasks`** — manages today's task list: realized pomodoro count, internal/external interruption counters, active task selection, re-estimates (`reestimateTask`, up to `reestimate1`/`reestimate2`). Calling `finishTask` writes a record (with `diff`/`diffI`/`diffII`) to the activity log and marks the task done.
- **`usePomodoro`** — pure timer state machine (work → shortBreak/longBreak cycle). After every `cycleLength` completed pomodoros (user-configurable, default 4) it automatically switches to a long break. It writes a tick on each completed work session and interruption.
- **`useTimetable`** — today's planned time blocks (`Timetable.jsx`); blocks are stamped with the date they were created and pruned on load if they're from a previous day.

### Component wiring

`App.jsx` instantiates `useInventory` and `useTodayTasks`, then passes their data down as props. `usePomodoro` is instantiated inside `Timer` (it's timer-local state). `useTimetable` is instantiated inside `TodoToday` (not `App`) so its block totals can feed `AvailablePomodoros`' suggested-hours button. The hooks never talk to each other directly — `App`/`TodoToday` bridge them: when a task from Inventory is sent to Today it stores the source `inventoryId` on the today-task, and when that task is finished `App` also removes it from Inventory.

`RecordsLog` and `Reports` receive no props and read storage directly on mount and on `pomodoro-data-changed` events. `Reports` also renders `DayReview` (an end-of-day summary modal) and reads `diffII ?? diffI ?? diff` (see `effectiveDiff` in `Reports.jsx`) so a re-estimated task's stats reflect its latest commitment, not the stale original estimate.

### Styling

Tailwind CSS v4 loaded via `@tailwindcss/vite` plugin. Custom design tokens (colors like `bg-pine`, `text-tomato`, `text-cream`, `text-sage`, `text-ink`, `text-amber`) are defined in `src/index.css` as CSS custom properties and referenced throughout components.

Light theme works by inverting the `pine`/`cream`/`sage` token *values* under a `.light` class on the app root (see `src/index.css`) — components never branch on theme in JS; they just keep using `bg-pine`/`text-cream`/etc. and the CSS variables do the swap. Don't add a component-level light/dark conditional; add or adjust a token override in the `.light` block instead.

### Gotchas

- `vite-plugin-pwa` is wired into `vite.config.js` (`generateSW` strategy, `registerType: 'autoUpdate'`) — production builds emit a manifest and service worker, making the app installable and offline-capable. It only activates on `npm run build` + `npm run preview` (or a real deploy); `npm run dev` does not register a service worker unless `devOptions.enabled` is set.
- In-app comments and some identifiers are in Turkish; code style otherwise follows standard React/JS conventions.
- All user-facing app text (buttons, confirm/alert dialogs, notifications, placeholders) must be in English — this is a hard requirement, unlike the Turkish code comments above.
- Deployed to GitHub Pages via `.github/workflows/deploy.yml` on every push to `main`. The workflow runs `npm run lint` and `npm test` before `npm run build`, so a failing test or lint error blocks the deploy. `vite.config.js`'s `base` is only rewritten to `/pomodoro-app/` when the `GITHUB_PAGES` env var is set (the workflow sets it before `npm run build`), so local `dev`/`build`/`preview` stay unprefixed. GitHub Pages must have its Source set to "GitHub Actions" once in the repo settings (Settings → Pages) for the workflow's deploy step to succeed.

For full methodology reference, see docs/methodology.md
