# AGENTS.md

Pomodoro Technique timer app. React 19 + Vite 8 + Tailwind v4, oxlint. Supabase backend is optional/additive — accounts are opt-in; guest mode (plain `localStorage`) must always keep working, including with no `.env` configured.

## Commands

- `npm run dev` / `npm run build` / `npm run preview`
- `npm run lint` (oxlint; `npx oxlint <file>` for one file) — must pass
- `npm test` (Vitest + jsdom) — must pass
- Run lint + test before finishing any change: CI (`.github/workflows/deploy.yml`) runs both before every deploy to `main` and blocks on failure.
- npm only — no yarn/pnpm lockfile.

## Storage — hard constraints

- `src/lib/storage.js` is the **only** place allowed to touch `localStorage` or the Supabase client. Never call `localStorage.*` or `supabase.*` directly from components/hooks.
- Use `patchSettings(partial)`, never `saveSettings(...)`, when changing only some settings keys — `saveSettings` overwrites the whole object and clobbers unrelated fields.
- `activeProvider` (`localStorageProvider` vs `remoteProvider`) is the single persistence switch, flipped by `signInToRemote`/`signOutFromRemote`. Don't add a second persistence path — every `loadX`/`saveX` must go through it so guest and signed-in modes behave identically to callers.
- A write that non-prop-fed components need to see (`RecordsLog`, `Reports`) must fire the `pomodoro-data-changed` event (via storage.js's existing tick/record helpers) — those components only re-read storage on that event.
- Danger Zone / import actions call `window.location.reload()` after writing — required because hooks only read storage once at mount. Don't drop the reload without also making hooks reactive to external writes.
- Never use the Supabase service-role key or `supabase.auth.admin.*` client-side. Account deletion goes through the `delete_user()` Postgres RPC (`SECURITY DEFINER`, scoped to `auth.uid()`) already wired in `AuthContext.jsx`.

## Known gotchas — real shipped bugs, don't reintroduce

- **A new field in any `storage.js` normalize\*()/DEFAULT_SETTINGS entry needs a matching Supabase column in the same change, or it silently breaks writes for signed-in users.** Every array-table save and every settings save sends the *whole* record/object (`toRemoteRow` in `remoteProvider.js`), never a partial patch — so one unrecognized key (e.g. `default_categories_seeded`, `is_default` on categories — both shipped with no migration and went unnoticed for a long time) gets the **entire row rejected** by PostgREST (`PGRST204: could not find the '<col>' column ... in the schema cache`), not just that field. Symptom: every other field in that same object (theme, name, goal, coach marks, etc.) silently stops persisting too, which reads as "everything resets on reload" even though nothing was ever reset — it just never saved. This is distinct from, and more severe than, a CHECK-constraint value going out of sync (`settings.theme`, `ticks.type`, etc. — those only reject rows using the missing enum value); check both when adding a field. Verify via the browser Network tab (filter `supabase.co`, look for 400s), not just app behavior — the failure is silent (`remoteProvider.js`'s `set()` only `console.error`s it). Schema changes are **not applied automatically** — they must be manually pasted into the Supabase SQL Editor; say so when you change `schema.sql`.
- **Sign-in "new account" misdetection can wipe real settings.** `remoteProvider.js`'s singleton fetch for `pomodoro_settings` must never let a "no row found" result overwrite an existing account's cached settings with a blank/default object — a false negative here previously reset theme/language/displayName/dailyPomodoroGoal/seenCoachMarks to defaults on reload even though the real row existed server-side. Any change to `initializeRemoteData`'s new-account detection must keep trusting the upsert's own returned row for the cache, never an assumed-blank object.
- **Default categories must be seeded with the language known at seed time, not at mount time.** `useCategories.js` defers seeding for a new account (`deferSeeding`/`isNewAccount`) until `AccountSetupFlow`'s `onFinish` calls `seedIfNeeded()` — after the language step has actually resolved. `signInToRemote()` in `storage.js` must NOT eagerly seed categories when `isNewAccount: true`; doing so seeds in the browser's auto-detected language before the user picks one in the wizard, and marks `defaultCategoriesSeeded: true` so the deferred path never gets a turn.
- The two sign-in-detection gotchas above only reproduce reliably under realistic network timing (StrictMode double-invoke + real async delay) — instantly-resolving unit-test mocks hide them; verify with a timing-realistic integration test, not just an instant mock. The missing-column gotcha is the opposite: it reproduces deterministically on the very first write and unit-test mocks hide it for a different reason — a fake Supabase client that doesn't enforce real column/schema shape will happily accept a payload the real one would 400 on. Neither test style alone is enough; when touching sign-in/reload/settings code, also check the real schema (or the Network tab against a real project).

## i18n

- Every user-facing string must go through `t()` / the `src/lib/i18n/en.js` + `tr.js` dictionaries — never hardcode UI text in a component.
- `common.appTitle` is deliberately identical (untranslated) in both dictionaries — it's a fixed brand name, not a missed translation. Don't "fix" it.

## Timer correctness constraints

- The countdown is driven by an absolute `endAt` timestamp, recomputed on each tick/mount (`endAtRef` in `usePomodoro.js`) — never revert it to a per-tick `secondsLeft - 1` decrement; that reintroduces drift on throttled/backgrounded tabs and loses time across a reload.
- All four tab panels (Timer/Planning/Reports/Settings) stay mounted at all times; only visibility toggles (Tailwind `hidden`). Unmounting the Timer panel on tab switch stops `usePomodoro`'s interval, silently pausing a running Pomodoro — don't switch this to conditional rendering.
- Pause (`usePomodoro.js`) is an intentional, documented deviation from `docs/methodology.md`'s Rule 2 ("a Pomodoro must always ring") — don't remove it or "fix" it as a bug.

## Tests

- Hook tests use `@testing-library/react`'s `renderHook` + Vitest fake timers (see `usePomodoro.test.js`) — don't wait on real time.
- `AudioContext`/`Notification` don't exist in jsdom — browser-only side effects live in `src/lib/alert.js` and are mocked with `vi.mock` in tests.
- Pure calculation helpers used by a component (e.g. `pomodoroMath.js`, `timetable.js`) must live in their own `src/lib/*.js` file, not be exported from a component file — co-exporting a plain function from a component breaks Fast Refresh, and oxlint's `only-export-components` warns on it.

## Env / deploy

- `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) is optional and gitignored; missing it must not crash — `supabaseClient.js` exports `supabase: null` and the app runs guest-only. Don't write code that assumes `supabase` is non-null.
- Deployed via GitHub Pages on push to `main`; `vite.config.js`'s `base` only becomes `/pomodoro-app/` when the `GITHUB_PAGES` env var is set by the workflow — don't hardcode that path.
