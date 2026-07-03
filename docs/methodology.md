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

| Field    | Description                                              |
|----------|----------------------------------------------------------|
| id       | Unique identifier                                        |
| title    | Task description                                         |
| estimate | Number of Pomodoros estimated (integer, ≥ 1)             |
| notes    | Optional notes                                           |
| unplanned| Boolean — was this task unplanned? (marked "U")          |
| deadline | Optional date string                                     |
| done     | Boolean — completed and crossed out                      |

**Storage key:** `pomodoro_inventory`

---

### To Do Today Sheet

Daily working list. Tasks are copied here from the Inventory each morning.

| Field       | Description                                           |
|-------------|-------------------------------------------------------|
| id          | Unique identifier                                     |
| inventoryId | Reference to source task in Inventory                 |
| title       | Task description (copied from Inventory)              |
| estimate    | Estimated Pomodoros for today                         |
| real        | Actual Pomodoros completed (auto-incremented)         |
| diff        | real − estimate (auto-calculated)                     |
| internal    | Count of internal interruptions (apostrophe `'`)      |
| external    | Count of external interruptions (dash `-`)            |
| done        | Boolean — task completed today                        |
| unplanned   | Boolean — added during the day, not from Inventory    |
| urgent      | Boolean — added to Unplanned & Urgent section         |

**Storage key:** `pomodoro_today`

**Important:** Unplanned & Urgent tasks appear at the BOTTOM of Today's sheet,
written bottom-up as they arrive.

---

### Records Sheet

The archive. Each completed day's data is stored here for reporting.

| Field    | Description                                              |
|----------|----------------------------------------------------------|
| date     | ISO date string                                          |
| time     | Start time of activity (HH:MM)                          |
| type     | Category/type of activity                                |
| activity | Description                                              |
| estimate | Estimated Pomodoros                                      |
| real     | Actual Pomodoros completed                               |
| diff     | Estimation error (real − estimate)                       |

**Storage key:** `pomodoro_records`

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
- `diff` is never stored directly — it is always computed as `real - estimate` at display time.
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

## What This App Does NOT Implement (Known Gaps)

- Available Pomodoros calculator (how many Pomodoros fit in today's schedule)
- Timetable / work-session planning (sets of 4 Pomodoros across the day)
- Second/third estimate tracking (Diff I, Diff II for re-estimated tasks)
- Task combination UI for sub-1-Pomodoro tasks
- Team/pair Pomodoro support

These are future enhancements. The core technique is fully implemented.

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
