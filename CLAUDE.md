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

All persistent state lives in `localStorage`. `src/lib/storage.js` is the single point of access — it exposes typed load/save helpers for its storage keys:

| Key | Purpose |
|-----|---------|
| `pomodoro_inventory` | Activity Inventory — the task backlog |
| `pomodoro_today_tasks` | Tasks selected for today with realized/interruption counts |
| `pomodoro_activity_log` | Completed-task records (estimate vs. actual) |
| `pomodoro_ticks` | Lightweight per-pomodoro/interruption events for reports |
| `pomodoro_settings` | User preferences: `cycleLength`, `theme`, `chimeStyle` |
| `pomodoro_categories` | User-defined categories (name + color) — see Categories below |
| `pomodoro_void_log` | Voided-Pomodoro journal entries (reason, elapsed time) — see Void log below |

`patchSettings(partial)` merges into existing settings and must be used instead of `saveSettings` whenever a feature only owns one key of the settings object — otherwise it clobbers the others. `exportAllData()` bundles every key for the JSON backup download in `RecordsLog`.

`storage.js` also owns a `pomodoro-data-changed` custom window event. Any write that should notify passive listeners (adding a tick, completing a task) dispatches this event. Components that read from storage but don't receive props — `RecordsLog` and `Reports` — subscribe with `subscribeToChanges()` to re-read when data changes.

### Hook layer

Five hooks own all mutable state:

- **`useInventory`** — CRUD for the Inventory list; auto-saves to localStorage on every change. Also owns `combineItems` (Rule 5: merge 2+ small tasks into one, summing estimates).
- **`useTodayTasks`** — manages today's task list: realized pomodoro count, internal/external interruption counters, active task selection, re-estimates (`reestimateTask`, up to `reestimate1`/`reestimate2`). Calling `finishTask` writes a record (with `diff`/`diffI`/`diffII`) to the activity log and marks the task done.
- **`usePomodoro`** — pure timer state machine (work → shortBreak/longBreak cycle). After every `cycleLength` completed pomodoros (user-configurable, default 4) it automatically switches to a long break. It writes a tick on each completed work session and interruption.
- **`useTimetable`** — today's planned time blocks (`Timetable.jsx`); blocks are stamped with the date they were created and pruned on load if they're from a previous day.
- **`useCategories`** — CRUD for user-defined categories (name + color, from `CATEGORY_COLORS` in `constants.js`). No cascade delete: `removeCategory` just drops the category, and anything referencing its id afterward fails to resolve it and falls back to "no category"/"Uncategorized" — the same fallback legacy/free-text `type` data already needed, so it's free.

### Component wiring

`App.jsx` instantiates `useInventory`, `useTodayTasks`, `usePomodoro`, and `useCategories`, then passes their data down as props — `Timer` and `SettingsTab` are both purely presentational and share the one `usePomodoro` instance (`SettingsTab` needs `cycleLength`/`chimeStyle` setters that live in the same hook Timer renders from, so it can't be timer-local anymore). `useTimetable` is instantiated inside `TodoToday` (not `App`) so its block totals can feed `AvailablePomodoros`' suggested-hours button. The hooks never talk to each other directly — `App`/`TodoToday` bridge them: when a task from Inventory is sent to Today it stores the source `inventoryId`, `categoryIds`, and `notes` on the today-task, and when that task is finished `App` also removes it from Inventory. Marking a task done is deliberately decoupled from the timer — finishing a task early doesn't stop a running Pomodoro (the remaining time is still there for overlearning).

`RecordsLog` reads storage directly on mount and on `pomodoro-data-changed` events, but takes `categories` as a prop (from `categoriesApi.categories`) rather than loading it itself — it's read-only reference data needed for display/filtering, same reasoning as `Reports`' `todayTasks` prop below. `Reports` does the same for `ticks`/`activityLog`, but also takes two props — `todayTasks={todayApi.tasks}` (for its "active task" count: `todayTasks` isn't date-stamped and `saveTodayTasks` doesn't dispatch `pomodoro-data-changed`, so reading it from storage on that event would show stale data) and `categories` (for the category-breakdown chart). `Reports` also renders `DayReview` (an end-of-day summary modal, unchanged by the metrics redesign below).

### Categories

Replaces what used to be a free-text `type` field on Inventory/Today-task/Records with a `categoryIds` array (multi-select tags, not a single pick) into `useCategories`' list. Assignment uses `CategoryTagPicker.jsx` (checklist-style multi-select dropdown); `CategorySelect.jsx` is a separate, single-pick dropdown kept only for Records Log's category *filter* (filtering by one category at a time is still the simpler, appropriate UX there — it was never converted to multi-select). Both are from-scratch dropdowns like `Select.jsx` but with a leading color-dot per option, built as their own components so the existing sound-style `Select.jsx` isn't put at risk. `CategoryManager.jsx` (rendered in the Settings tab) is the create/edit/delete UI, using a curated 8-color palette (`CATEGORY_COLORS` in `constants.js`) rather than reusing `tomato`/`amber`, which already carry other meanings elsewhere (work/danger, break/"took less") that a category swatch in the same color would collide with. A task's pomodoros count fully toward EACH of its assigned categories in the Reports breakdown — not split — see `pomodorosByCategory()` in `reportsMath.js`.

Migration: `storage.js`'s `normalizeCategoryIds()` wraps a legacy single `categoryId` (string or `null`) into a one-element array (or `[]`), so old single-select data loads without any explicit migration step — normalize functions rebuild an explicit object rather than spreading, so the old key is simply never read again.

Every task/record also gained a `notes` field (long-text description) — Inventory already had one pre-existing (upgraded from a single-line input to a `<textarea>`); Today's Tasks and Activity Log records are new. Displayed collapsed behind a 📝 toggle in list views (`Inventory.jsx`, `TodoToday.jsx`'s `TaskRow`, `RecordsLog.jsx`'s `RecordRow`) so it doesn't clutter the row — expands on click.

The `pairWith` field (a lightweight "pairing with" note, no real-time sync) has been removed entirely — categories now cover that use case. Old records/tasks with a legacy `type` or `pairWith` value load fine; `storage.js`'s normalize functions simply don't read those keys anymore, so they're silently dropped rather than migrated.

### Fullscreen Focus Mode

`Timer.jsx` renders one shared JSX tree for both the normal card view and the fullscreen minimal view, toggling extra chrome on/off with `{!isFullscreen && (...)}` guards (session-switch pills, the "Finish Pomodoro" button, the keyboard-shortcut hint, `UnplannedCapture`) rather than maintaining two separate component trees. `isFullscreen` is driven only by the native `fullscreenchange` event (not set optimistically on click) — `requestFullscreen()` requires a user gesture and can still be rejected in some contexts, so relying on the event keeps the UI honest about actual fullscreen state regardless of how it was entered/exited (button, `F`, or the browser's own Escape-to-exit).

Keyboard shortcuts: `F` toggles fullscreen (was previously bound to Finish Pomodoro); `E` is now Finish Pomodoro; `Escape` opens the Void-reason prompt (see below) when a Pomodoro is running, cancels that prompt if it's already open, and does nothing at all while fullscreen (the browser's own Escape-exits-fullscreen handling takes over — the handler explicitly no-ops there so it doesn't *also* open the void prompt underneath). `Space`/`1`/`2`/`3` are unchanged.

### Void log

Voiding a Pomodoro (Rule 1) opens an inline panel (`Timer.jsx`, replacing the old bare `window.confirm`) with an optional free-text reason, combining confirmation and reason-capture into one step. `usePomodoro.js`'s `voidPomodoro(reason)` computes elapsed time itself (`DURATIONS.work - secondsLeft`) and reports `{ reason, elapsedSeconds }` via a new `onVoid` callback — mirroring the existing `onWorkComplete`/`onInterruption` bridge pattern — since the hook has no knowledge of the active task; `App.jsx`'s `onVoid` implementation looks up the active task/its categories and writes the entry via `addVoidLogEntry()`.

This is deliberately a simple daily journal, not a metric: `Reports.jsx`/`reportsMath.js` never read `pomodoro_void_log` at all. `RecordsLog.jsx` shows entries in an unobtrusive "Voided Pomodoros" section (own `VoidLogRow`, capped at 5 most recent) that is **not** affected by the Records Log date/category filters — those filters exist for the Activity Log's aggregation-adjacent use, not this.

### Reports metrics

`Reports.jsx` is organized around `src/lib/reportsMath.js` (pure, unit-tested date/aggregation helpers — `effectiveDiff`, `datesForPeriod`/`datesForThisWeek`/`datesForLastWeek`/etc., `estimationBreakdown`, `avgInterruptionsPerTask`, `trendDirection`). Per methodology, metrics favor trends and per-task ratios over cumulative totals:

- **Today** — fixed today-vs-yesterday comparison (pomodoro count, task count, interruptions), independent of the time filter below.
- **Estimation Accuracy** — overestimated/underestimated counts and a per-task diff chart, both scoped to the top time filter (Today/Week/Month/Year, default Week); plus a fixed this-week-vs-last-week avg-error trend.
- **Interruption Trends** — average interruptions *per finished task* (not a raw total — the deliberate correction over the old design), scoped to the time filter, plus a fixed week-over-week trend and a per-task breakdown list.
- **Pomodoros by Category** — `pomodorosByCategory()` sums each finished record's `real` grouped by `categoryId`, scoped to the time filter, rendered as a horizontal bar per category colored with that category's own color (an "Uncategorized" bucket, sage-colored, catches null/deleted-category records). This only counts pomodoros from *finished* tasks — ticks (the raw pomodoro events) don't carry a category, so there's no way to attribute an in-progress task's pomodoros to a category without adding new tracking.
- **Long-term** — collapsed by default; the 13-week heatmap plus a month/quarter summary.

`effectiveDiff` also lives here now (moved out of duplicate copies previously in `Reports.jsx` and `DayReview.jsx`); `DayReview.jsx` imports it from `reportsMath.js`.

### Tab layout

`App.jsx` renders four tabs via `TabNav` (`activeTab` state: `timer` | `planning` | `reports` | `settings`) to keep the Timer screen distraction-free per methodology — no Inventory/Records/Reports content should be visible while a Pomodoro is running. **All four tab panels stay mounted; only the active one is toggled visible with Tailwind's `hidden` class** (not conditionally rendered). This is required, not just an optimization: unmounting the Timer panel on tab switch would stop `usePomodoro`'s countdown interval while the user is on another tab, effectively pausing a running Pomodoro. Keeping `RecordsLog`/`Reports` mounted also avoids dropping and re-subscribing their `pomodoro-data-changed` listeners on every switch.

- **Timer tab** — `Timer.jsx`: ring + state label, current active task, Start/Void/Finish-early/Skip-break, interruption buttons (internal/external, gated on `isRunning`), and `UnplannedCapture` (add-only input, no list — jot it down and keep working).
- **Planning tab** — `Inventory` + `TodoToday` (which itself includes `AvailablePomodoros`, `Timetable`, the today-task list, and the full Unplanned & Urgent box with its list).
- **Reports tab** — `Reports` (which renders `DayReview` internally) + `RecordsLog` (which also has its own date-picker + category filter, combined with AND logic; unfiltered view caps at the 8 most recent records, filtered views show every match).
- **Settings tab** — `SettingsTab.jsx`: cycle length, chime/sound, theme toggle (moved out of the header). Short/long break duration and language are inert "Coming soon" rows — not backed by real state yet. Also renders `CategoryManager.jsx` (create/edit/delete categories) and a "Danger Zone" card: seven category-scoped delete buttons (Records, Ticks, Today's Tasks + Timetable, Inventory, Timer state, Categories, Void log) plus a "Reset to Factory Settings" button that additionally wipes `pomodoro_settings`. Each button's `window.confirm` names exactly what it deletes; on confirm the corresponding `clear*`/`resetAllData` function in `storage.js` runs `localStorage.removeItem`, then the page does a hard `window.location.reload()` — required because `useInventory`/`useTodayTasks`/`usePomodoro`/`useCategories` only read storage once at mount, so clearing the key alone wouldn't update the already-running UI. The category-scoped clears never touch `pomodoro_settings`; only `resetAllData()` does.

`UnplannedCapture.jsx` is a shared add-only form (calls `addTask(text, null, { unplanned: true, urgent: true })`) used both standalone on the Timer tab and inside `TodoToday`'s Unplanned & Urgent box (which additionally renders the list).

The Timer keeps a "Finish Pomodoro" (finish-early) control even though methodology.md's Rule 2 says a Pomodoro should always ring — this is an intentional, documented deviation (see the comment in `Timer.jsx`): the confirm dialog teaches the overlearning rule but leaves the choice to the user, and confirming still records the Pomodoro as complete.

### Styling

Tailwind CSS v4 loaded via `@tailwindcss/vite` plugin. Custom design tokens (colors like `bg-pine`, `text-tomato`, `text-cream`, `text-sage`, `text-ink`, `text-amber`) are defined in `src/index.css` as CSS custom properties and referenced throughout components.

Light theme works by inverting the `pine`/`cream`/`sage` token *values* under a `.light` class on the app root (see `src/index.css`) — components never branch on theme in JS; they just keep using `bg-pine`/`text-cream`/etc. and the CSS variables do the swap. Don't add a component-level light/dark conditional; add or adjust a token override in the `.light` block instead.

### Completion feedback

Small, calm animation + sound pairs mark two moments — deliberately not gamified (no confetti/scores):

- **Pomodoro completion** (`completeWork` in `usePomodoro.js`) — a `completionPulseKey` counter increments, which `Timer.jsx` turns into a one-shot ~500ms `animate-ring-pulse` class on the ring `<svg>` (subtle scale + `drop-shadow(currentColor)`, so it automatically matches the tomato/amber `accentClass` already applied). Paired with a new `playPing()` (`alert.js`) alongside the existing configurable `playChime(chimeStyle)`. Per methodology a "Pomodoro" is specifically the work session, so both the pulse and the ping fire only on `completeWork`, never `completeBreak` — ending a break keeps its original chime-only behavior.
- **Task completion** (`finishTask` in `useTodayTasks.js`) — calls a new `playTaskCompleteChime()` (a longer, still-gentle ascending arpeggio). Visually, `TodoToday.jsx`'s `TaskRow` swaps the instant `line-through` for an absolutely-positioned `.task-strike` bar that draws left-to-right once (`task.done` flipping true is a one-time mount, so the CSS animation doesn't replay on later re-renders), and reuses the empty grid-slot placeholder for a `.animate-task-check` checkmark that pops in and fades out.

All three keyframes live in `index.css`, gated behind `@media (prefers-reduced-motion: no-preference)`. The base (non-media-query) rules are the reduced-motion fallback: `.task-strike` defaults to `width: 100%` (a done task should still visibly read as done — that's information, not decoration, so it doesn't disappear), while `.animate-ring-pulse`/`.animate-task-check` default to inert/invisible (matching the pre-animation appearance). Sound is untouched by the media query either way — nothing in the JS checks `prefers-reduced-motion`, so audio plays the same regardless of motion preference.

### Gotchas

- `vite-plugin-pwa` is wired into `vite.config.js` (`generateSW` strategy, `registerType: 'autoUpdate'`) — production builds emit a manifest and service worker, making the app installable and offline-capable. It only activates on `npm run build` + `npm run preview` (or a real deploy); `npm run dev` does not register a service worker unless `devOptions.enabled` is set.
- In-app comments and some identifiers are in Turkish; code style otherwise follows standard React/JS conventions.
- All user-facing app text (buttons, confirm/alert dialogs, notifications, placeholders) must be in English — this is a hard requirement, unlike the Turkish code comments above.
- Deployed to GitHub Pages via `.github/workflows/deploy.yml` on every push to `main`. The workflow runs `npm run lint` and `npm test` before `npm run build`, so a failing test or lint error blocks the deploy. `vite.config.js`'s `base` is only rewritten to `/pomodoro-app/` when the `GITHUB_PAGES` env var is set (the workflow sets it before `npm run build`), so local `dev`/`build`/`preview` stay unprefixed. GitHub Pages must have its Source set to "GitHub Actions" once in the repo settings (Settings → Pages) for the workflow's deploy step to succeed.

For full methodology reference, see docs/methodology.md
