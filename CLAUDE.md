# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server (Vite HMR)
npm run build     # production build
npm run preview   # preview production build locally
npm run lint      # run oxlint
```

No test runner is configured.

## Architecture

This is a Pomodoro timer app implementing the Pomodoro Technique (25-min work sessions, short/long breaks, interruption tracking). Stack: React 19, Vite 8, Tailwind CSS v4, oxlint.

### Data flow

All persistent state lives in `localStorage`. `src/lib/storage.js` is the single point of access — it exposes typed load/save helpers for four storage keys:

| Key | Purpose |
|-----|---------|
| `pomodoro_inventory` | Activity Inventory — the task backlog |
| `pomodoro_today_tasks` | Tasks selected for today with realized/interruption counts |
| `pomodoro_activity_log` | Completed-task records (estimate vs. actual) |
| `pomodoro_ticks` | Lightweight per-pomodoro/interruption events for reports |

`storage.js` also owns a `pomodoro-data-changed` custom window event. Any write that should notify passive listeners (adding a tick, completing a task) dispatches this event. Components that read from storage but don't receive props — `RecordsLog` and `Reports` — subscribe with `subscribeToChanges()` to re-read when data changes.

### Hook layer

Three hooks own all mutable state:

- **`useInventory`** — CRUD for the Inventory list; auto-saves to localStorage on every change.
- **`useTodayTasks`** — manages today's task list: realized pomodoro count, internal/external interruption counters, active task selection. Calling `finishTask` writes a record to the activity log and marks the task done.
- **`usePomodoro`** — pure timer state machine (work → shortBreak/longBreak cycle). After every 4 completed pomodoros it automatically switches to a long break. It writes a tick on each completed work session and interruption.

### Component wiring

`App.jsx` instantiates `useInventory` and `useTodayTasks`, then passes their data down as props. `usePomodoro` is instantiated inside `Timer` (it's timer-local state). The two hooks never talk to each other directly — `App` bridges them: when a task from Inventory is sent to Today it stores the source `inventoryId` on the today-task, and when that task is finished `App` also removes it from Inventory.

`RecordsLog` and `Reports` receive no props and read storage directly on mount and on `pomodoro-data-changed` events.

### Styling

Tailwind CSS v4 loaded via `@tailwindcss/vite` plugin. Custom design tokens (colors like `bg-pine`, `text-tomato`, `text-cream`, `text-sage`, `text-ink`, `text-amber`) are defined in `src/index.css` as CSS custom properties and referenced throughout components.

For full methodology reference, see docs/methodology.md
