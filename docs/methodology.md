# Pomodoro Technique Methodology

> This document defines the methodology this application implements.
> It is written in our own words based on our study of the original technique.
> Source: Francesco Cirillo, "The Pomodoro Technique" (2006) — CC BY-NC-ND 3.0
> Reference: https://francescocirillo.com/products/the-pomodoro-technique

---

## What This App Implements

This application is a faithful digital implementation of the Pomodoro Technique as
defined by Francesco Cirillo. The goal is not to be yet another timer app, but to
implement the full system: planning, tracking, interruption management, estimation,
and recording — all in one place.

---

## Core Concept

A **Pomodoro** is a 25-minute uninterrupted work session followed by a 5-minute break.
After every 4 Pomodoros, a longer break of 15–30 minutes is taken.

The technique treats time not as an enemy that slips away, but as a series of finite,
manageable boxes. Each Pomodoro is a commitment, not just a timer.

---

## The Five Stages (Daily Cycle)

| Stage       | When              | Purpose                                              |
|-------------|-------------------|------------------------------------------------------|
| Planning    | Start of day      | Choose tasks from Inventory, fill Today's Tasks      |
| Tracking    | Throughout day    | Mark Pomodoros and interruptions in real time        |
| Recording   | End of day        | Archive completed Pomodoros and task data            |
| Processing  | End of day        | Transform raw data into meaningful metrics           |
| Visualizing | End of day        | Present metrics to support process improvement       |

**Implementation note:** Our app handles Planning (Inventory → Today), Tracking
(timer + interruption markers), and Recording (Records log) automatically. Processing
and Visualizing are covered by the Reports panel.

---

## The Rules

### Rule 1: A Pomodoro Is Indivisible

A Pomodoro cannot be split, paused, or partially counted.
- If a Pomodoro is definitively interrupted, it is **void** — as if it never started.
- A void Pomodoro does NOT get an X mark. It is marked with an interruption symbol only.
- There is no such thing as "half a Pomodoro."

**Implementation note:**
- When the user voids a Pomodoro (gives up mid-session), the timer resets to 0.
- No tick/X is written to storage for that session.
- The interruption marker (internal `'` or external `-`) is still recorded.
- UI must make it clear the Pomodoro is void, not paused.
- Voiding opens an inline prompt for an optional free-text reason. This is
  logged to the Void log (see Data Model below) purely as a daily
  self-observation journal, in the same reflective spirit as end-of-day
  Processing/Visualizing — it is deliberately NOT fed into Reports as an
  aggregated metric.

---

### Rule 2: Once a Pomodoro Begins, It Has to Ring

If a Pomodoro starts, it must complete its full 25 minutes. No stopping early.
Exception: if definitively interrupted, it is voided entirely (see Rule 1).

If a task is **completed before the Pomodoro rings**, the user does NOT stop the timer.
Instead, they use remaining time for **overlearning**: reviewing, refining, noting
what was learned. The Pomodoro still rings at 25 minutes.

**Implementation note:**
- There is no "finish early" button that stops the timer mid-Pomodoro.
- The timer always runs to completion unless the user explicitly voids it.
- After task completion, the UI can suggest switching to review mode, but the
  timer continues counting.

---

### Rule 3: After Every 4 Pomodoros, Take a Long Break

- Short break: 3–5 minutes (after each Pomodoro)
- Long break: 15–30 minutes (after every 4th Pomodoro)

The Pomodoro counter resets after the long break.

**Implementation note:**
- `usePomodoro` hook tracks `pomodoroCount` (0–3).
- After completing the 4th Pomodoro, transition is to `long_break`, not `short_break`.
- After long break ends, `pomodoroCount` resets to 0.

---

### Rule 4: If It Takes More Than 5–7 Pomodoros, Break It Down

Any task estimated at more than 5–7 Pomodoros is too complex. It must be split into
smaller, incremental sub-tasks in the Activity Inventory.

**Why this matters:** Smaller tasks are easier to estimate accurately and deliver
incremental value, which boosts motivation.

**Implementation note:**
- The app should visually warn (not block) when a user sets an estimate > 7 on a task.
- This is a soft rule — the user decides, but the system should make the rule visible.

---

### Rule 5: If It Takes Less Than One Pomodoro, Add It Up

Tasks estimated at less than 1 Pomodoro should be combined with other similar tasks
until they fill a full Pomodoro.

**Implementation note:**
- In the Inventory, tasks can be grouped/combined.
- The UI should support this pattern (e.g., selecting multiple tasks to combine for Today).
- Currently not fully implemented — a known gap.

---

## The Three Sheets (Data Model)

### Activity Inventory

The master backlog of all tasks. Tasks live here until done or deleted.

| Field      | Description                                              |
|------------|----------------------------------------------------------|
| id         | Unique identifier                                        |
| title      | Task description                                         |
| estimate   | Number of Pomodoros estimated (integer, ≥ 1)             |
| notes      | Optional long-text description (collapsed in the list view, expand on click) |
| categoryId | Reference to a user-defined Category, or `null` (see Categories below) |
| unplanned  | Boolean — was this task unplanned? (marked "U")          |
| deadline   | Optional date string                                     |
| done       | Boolean — completed and crossed out                      |

**Storage key:** `pomodoro_inventory`

---

### To Do Today Sheet

Daily working list. Tasks are copied here from the Inventory each morning.

| Field       | Description                                           |
|-------------|-------------------------------------------------------|
| id          | Unique identifier                                     |
| inventoryId | Reference to source task in Inventory                 |
| title       | Task description (copied from Inventory)              |
| categoryId  | Reference to a user-defined Category, or `null` — carried over when copied from Inventory |
| notes       | Optional long-text description — carried over when copied from Inventory |
| estimate    | Estimated Pomodoros for today (the original commitment) |
| reestimate1 | Optional first re-estimate, set when the task is running long |
| reestimate2 | Optional second re-estimate                            |
| real        | Actual Pomodoros completed (auto-incremented)         |
| diff        | real − estimate (auto-calculated)                     |
| internal    | Count of internal interruptions (apostrophe `'`)      |
| external    | Count of external interruptions (dash `-`)            |
| done        | Boolean — task completed today                        |
| unplanned   | Boolean — added during the day, not from Inventory    |
| urgent      | Boolean — added to Unplanned & Urgent section         |

**Storage key:** `pomodoro_today_tasks`

**Important:** Unplanned & Urgent tasks appear at the BOTTOM of Today's sheet,
written bottom-up as they arrive.

---

### Records Sheet

The archive. Each completed day's data is stored here for reporting.

| Field       | Description                                              |
|-------------|-----------------------------------------------------------|
| date        | ISO date string                                          |
| time        | Start time of activity (HH:MM)                          |
| categoryId  | Reference to a user-defined Category, or `null` — carried over from the Today task |
| activity    | Description                                              |
| notes       | Optional long-text description, carried over from the Today task |
| estimate    | Original estimated Pomodoros                             |
| reestimate1 | Optional first re-estimate carried over from the Today task, or `null` |
| reestimate2 | Optional second re-estimate carried over from the Today task, or `null` |
| real        | Actual Pomodoros completed                               |
| diff        | Estimation error vs. the original estimate (real − estimate), or `null` if no estimate was set |
| diffI       | Estimation error vs. `reestimate1` (real − reestimate1), or `null` if never re-estimated |
| diffII      | Estimation error vs. `reestimate2` (real − reestimate2), or `null` if never re-estimated a second time |
| internal    | Internal interruption count accrued while working the task |
| external    | External interruption count accrued while working the task |
| unplanned   | Boolean — carried over from the Today task (qualitative-error tracking) |

Reports aggregates (average estimation error, the estimation-trend chart) use
whichever of `diffII`, `diffI`, `diff` is most recent for a record — the point
of re-estimating is to judge accuracy against the latest commitment, not the
now-stale original guess.

**Storage key:** `pomodoro_activity_log`

---

### Categories

User-defined labels (name + a color from a small curated palette) that
replace what used to be a free-text "type" field on Inventory/Today/Records.
Deleting a category doesn't cascade — tasks/records referencing it just fall
back to showing "no category"/"Uncategorized," the same graceful handling
already needed for legacy data saved before Categories existed.

| Field | Description                          |
|-------|---------------------------------------|
| id    | Unique identifier                     |
| name  | Category name                         |
| color | Hex color, from the curated palette   |

**Storage key:** `pomodoro_categories`

---

### Ticks

Lightweight per-event records used to power the Reports panel (daily/weekly
pomodoro counts, interruption counts) without re-deriving them from the
Records Sheet on every render.

| Field     | Description                                              |
|-----------|-----------------------------------------------------------|
| id        | Unique identifier                                          |
| type      | `pomodoro` \| `interruption-internal` \| `interruption-external` |
| date      | ISO date string                                             |
| timestamp | Full ISO timestamp                                          |

**Storage key:** `pomodoro_ticks`

---

### Void log

A simple daily journal of voided Pomodoros (Rule 1), each with an optional
free-text reason — self-observation, not a metric. Reports never reads this
key; RecordsLog shows it as a separate, unobtrusive list.

| Field          | Description                                              |
|----------------|-----------------------------------------------------------|
| id             | Unique identifier                                          |
| date           | ISO date string                                             |
| time           | Time of the void (HH:MM)                                    |
| activity       | Active task's name at the time of the void, or `null`       |
| categoryIds    | Active task's category tags at the time of the void          |
| elapsedSeconds | How much of the 25-minute Pomodoro had elapsed (e.g. shown as "12:33 / 25:00") |
| reason         | Optional free-text reason, or `''` if skipped                |

**Storage key:** `pomodoro_void_log`

---

## Interruption Taxonomy

Interruptions are tracked differently based on their origin.

### Internal Interruptions `'` (apostrophe)

Origin: The user themselves. Sudden urges, distractions, second-guessing priorities.

Handling protocol:
1. Mark an apostrophe `'` next to the current task on Today's sheet.
2. Write the new impulse in the Activity Inventory (marked "U") or in Unplanned & Urgent if truly imminent.
3. Continue the current Pomodoro without acting on the interruption.

**Implementation note:**
- Internal interruption button increments `todayTask.internal` counter.
- The increment is stored immediately to localStorage.
- The timer continues — pressing this button does NOT void the Pomodoro.

---

### External Interruptions `-` (dash)

Origin: Other people or systems. A colleague, a phone call, an email notification.

Handling protocol (Inform, Negotiate, Call Back):
1. Mark a dash `-` next to the current task.
2. Inform the person you're busy, negotiate a callback time.
3. Write the topic in Unplanned & Urgent with a promised callback time.
4. Call back as agreed — keep the commitment.

**Implementation note:**
- External interruption button increments `todayTask.external` counter.
- Same behavior as internal: non-destructive, timer continues.
- If the interruption cannot be managed and the Pomodoro must stop: void the Pomodoro (Rule 1).

---

## Estimation System (Estimate / Real / Diff)

This is one of the key differentiators of this app vs. simple timer apps.

### How it works:
- **Estimate:** Set at the start of the day for each task. Integer Pomodoros.
- **Real:** Auto-incremented each time a Pomodoro completes on an active task.
- **Diff:** `real - estimate`. Calculated automatically.
  - `Diff = 0` → perfect estimate
  - `Diff > 0` → underestimation (task took longer)
  - `Diff < 0` → overestimation (task took less time)

### Two types of estimation error:
- **Quantitative error:** Wrong number of Pomodoros estimated for a known task.
- **Qualitative error:** Failed to identify all necessary sub-tasks during planning.
  (Measured by tracking unplanned tasks that emerge during the day.)

**Implementation note:**
- `diff` is computed as `real - estimate` when the task finishes.
- If a task had no estimate set, `diff` is stored as `null` rather than faked as
  `0` — an un-estimated task has no estimation error to report, and forcing it
  to `0` would misrepresent it as a perfect estimate.
- The goal over time is to reduce |diff| across tasks (improvement tracking).

---

## Timer State Machine

```
IDLE
  │
  ▼ [start]
WORK (25 min)
  │
  ├─── [void] ──────────────────────────────────────► IDLE
  │                                                   (no X recorded)
  │
  ▼ [ring]
  X recorded, pomodoroCount++
  │
  ├─── pomodoroCount < 4 ──► SHORT_BREAK (3–5 min)
  │                               │
  │                               ▼ [ring or skip]
  │                             WORK
  │
  └─── pomodoroCount = 4 ──► LONG_BREAK (15–30 min)
                                  │
                                  ▼ [ring or skip]
                                pomodoroCount = 0
                                WORK
```

**States:** `idle` | `work` | `short_break` | `long_break`
**Transitions:** `start` | `ring` | `void` | `skip_break`

---

## Edge Cases

| Situation | Correct Behavior |
|-----------|-----------------|
| Task finished before Pomodoro rings | Timer continues; user enters review mode |
| Pomodoro definitively interrupted | Pomodoro is void; no X; timer resets |
| Interruption that CAN be deferred | Mark `'` or `-`; timer continues |
| Task takes more than estimated | Add real Pomodoros beyond estimate; diff increases |
| Task takes fewer than estimated | Cross out task; remaining Pomodoro time used for review |
| New urgent task mid-Pomodoro | Write in Unplanned & Urgent; handle after current Pomodoro |
| User adds unplanned task during day | Mark as `unplanned: true`; appears in U&U section |

---

## Planning Aids

- **Available Pomodoros calculator** (`AvailablePomodoros.jsx`) — enter hours available today, get an estimate of how many Pomodoros fit (simulating the work/break cycle), compared against the sum of today's task estimates.
- **Timetable** (`Timetable.jsx`) — define time blocks for the day (e.g. 09:00–11:00), the currently active block is highlighted.
- **Second/third estimate tracking (Diff I, Diff II)** — a running task can be re-estimated (up to twice) when it's taking longer than planned; Records shows Diff (vs. original estimate), Diff I and Diff II (vs. each re-estimate) side by side.
- **Task combination** — select 2+ small Inventory tasks and combine them into one (Rule 5), summing their estimates.
- **Categories** (Settings tab) — user-defined name + color labels for Inventory/Today/Records tasks, replacing the old free-text "type" field; see the Categories data-model section above.
- **Fullscreen Focus Mode** (Timer tab) — a toggle (button or `F`) that uses the browser Fullscreen API to show only the ring, current task, interruption buttons, and Start/Void/Skip controls — no navigation, no other chrome. `Esc` (or the toggle) exits back to the normal Timer tab.
- **Picture-in-Picture mini timer** (Timer tab) — where supported (feature-detected; hidden entirely on browsers without it, e.g. Safari), a toggle opens a small always-on-top window showing just the countdown and session type, so it stays visible when switching tabs/apps. Read-only — no interruption buttons or controls — `document.title`'s countdown remains the fallback everywhere else.

---

## Attribution

This application implements the Pomodoro Technique® as created by Francesco Cirillo.
"Pomodoro Technique" and "Pomodoro" as a time management method are associated with
Francesco Cirillo. This app avoids using "Pomodoro" in its brand name out of respect
for active trademark considerations.

Source material studied: Cirillo, F. (2006). "The Pomodoro Technique."
Licensed under Creative Commons Attribution-Noncommercial-No Derivative Works 3.0.
This methodology document is written in our own words and does not reproduce
Cirillo's original text. It documents our implementation decisions.
