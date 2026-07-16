import { supabase } from './supabaseClient'
import { mapKeysToSnake, mapKeysToCamel } from './keyCase'

// Maps storage.js's localStorage key strings directly to their Supabase
// table names — using the same key strings as cache keys (rather than a
// separate translation layer) keeps this provider a drop-in match for
// localStorageProvider's get(collection, fallback)/set(collection, value)
// shape, where `collection` is already e.g. 'pomodoro_inventory'.
const ARRAY_TABLES = {
  pomodoro_inventory: 'inventory',
  pomodoro_today_tasks: 'today_tasks',
  pomodoro_activity_log: 'activity_log',
  pomodoro_ticks: 'ticks',
  pomodoro_timetable: 'timetable',
  pomodoro_categories: 'categories',
  pomodoro_void_log: 'void_log',
  pomodoro_card_draws: 'card_draws',
}

// Singletons (one row per user) — see supabase/schema.sql's file-header
// note 3 and CLAUDE.md's Authentication section.
const SINGLETON_TABLES = {
  pomodoro_timer_state: 'timer_state',
  pomodoro_settings: 'settings',
}

// In-memory cache, always read synchronously by get() — this is what lets
// storage.js's loadX()/saveX() keep their existing synchronous-looking
// signatures even though the actual persistence is a network call. Warmed
// once by initializeRemoteData() before storage.js switches its active
// provider over to this module (see storage.js's signInToRemote).
const cache = {}
// Array collections only: the set of ids last known to exist remotely, so
// set() can tell which ids were removed from a freshly-saved array and
// issue an explicit delete for them (an upsert alone never deletes rows —
// see the file-level note in CLAUDE.md's Authentication section).
const knownIds = {}
let activeUserId = null

function nowIso() {
  return new Date().toISOString()
}

async function fetchArrayTable(table, userId) {
  const { data, error } = await supabase.from(table).select('*').eq('user_id', userId)
  if (error) throw error
  return data.map(mapKeysToCamel)
}

async function fetchSingletonTable(table, userId) {
  const { data, error } = await supabase.from(table).select('*').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data ? mapKeysToCamel(data) : null
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// A "no row found" result for a singleton that demonstrably exists has been
// observed transiently right after sign-in (most reproducible with
// concurrent sign-ins to the same account from two clients at once — e.g.
// two devices/tabs). Since initializeRemoteData treats "no settings row" as
// "brand new account, create a minimal one," a false negative here would
// upsert that minimal row over an established one (onConflict: 'user_id'
// matches the same row) — harmless in practice (the minimal payload only
// touches user_id/created_at/updated_at, so PostgREST's upsert leaves every
// other column on an existing row untouched), but still worth avoiding
// since it would also incorrectly report isNewAccount: true for an
// established account. One retry after a short delay is cheap insurance
// against that specific failure mode.
async function fetchSingletonTableWithRetry(table, userId) {
  const first = await fetchSingletonTable(table, userId)
  if (first) return first
  await sleep(300)
  return fetchSingletonTable(table, userId)
}

// Fills in userId (always, in case a stale/placeholder value is present)
// and createdAt (only if genuinely missing — e.g. an item added in this
// session, before its first sync) without overriding a createdAt a
// previously-synced item already carries. updatedAt is always bumped to
// now: a full-array save always means "this is the current state," and any
// finer-grained conflict resolution between devices is out of scope here
// (see CLAUDE.md).
function toRemoteRow(item, userId) {
  return mapKeysToSnake({
    ...item,
    userId,
    createdAt: item.createdAt ?? nowIso(),
    updatedAt: nowIso(),
  })
}

async function upsertArrayTable(table, userId, items) {
  if (items.length === 0) return
  const { error } = await supabase.from(table).upsert(items.map((item) => toRemoteRow(item, userId)))
  if (error) throw error
}

async function deleteRows(table, userId, ids) {
  if (ids.length === 0) return
  // .eq('user_id', ...) alongside .in('id', ...) is defense-in-depth, not
  // the actual boundary — RLS's own delete policy (user_id = auth.uid())
  // already prevents this from ever touching another user's row even
  // without it. Scoping the query itself means a future RLS
  // misconfiguration wouldn't be the only thing standing between this call
  // and a cross-user delete.
  const { error } = await supabase.from(table).delete().eq('user_id', userId).in('id', ids)
  if (error) throw error
}

async function upsertSingleton(table, userId, value) {
  // Reuses toRemoteRow (not a bare mapKeysToSnake) specifically because
  // settings/timer_state can carry `createdAt: null`/`updatedAt: null` from
  // the JS side (normalizeMeta's pre-account-era default) — sent as-is that
  // violates the schema's NOT NULL constraint on both columns; toRemoteRow
  // fills them in exactly like it does for array-collection rows.
  const { error } = await supabase
    .from(table)
    .upsert(toRemoteRow(value, userId), { onConflict: 'user_id' })
  if (error) throw error
}

// Same upsert as above, but returns the row Postgres actually ends up with
// (via .select()) instead of discarding the response — see
// initializeRemoteData's "no row found" branch for why this distinction
// matters. A plain upsert's response isn't fetched at all normally (fire-
// and-forget saves via set() don't need it), so this is a separate function
// rather than a flag on upsertSingleton, to keep that hot path's response
// handling unchanged.
async function upsertSingletonAndFetch(table, userId, value) {
  const { data, error } = await supabase
    .from(table)
    .upsert(toRemoteRow(value, userId), { onConflict: 'user_id' })
    .select()
    .single()
  if (error) throw error
  return mapKeysToCamel(data)
}

// Runs once, right after sign-in, before storage.js switches its active
// provider to this module — fetches every collection straight from Supabase
// and warms the cache. Deliberately does NOT look at localStorage at all:
// there used to be an automatic local-to-cloud migration step here (snapshot
// the guest's localStorage, merge it into the account's remote data via
// mergeCollectionById — the same merge function the JSON-import feature
// still uses on its own, unrelated path). That whole migration flow was
// removed — signing in never touches or merges local/guest data anymore; a
// user who wants their guest data in their account uses the manual JSON/CSV
// export-then-import feature in Settings > Data instead. This function is
// now just a fetch.
//
// Each collection is isolated in its own try/catch — one table rejecting a
// row (e.g. a schema/CHECK-constraint mismatch on the Supabase side; see
// schema.sql's "schema-drift fix" block for the real example that used to
// hit this) must not discard every OTHER collection that already fetched
// successfully. This used to be one big try/catch around the whole
// function: a single bad row in, say, `ticks` (a tick type added by a
// later JS feature, e.g. `'pause'`, that the CHECK constraint didn't know
// about yet) aborted the entire fetch — silently leaving
// `timetable`/`categories`/`void_log`/`settings`/`timer_state` never even
// attempted, while `inventory`/`today_tasks`/`activity_log` (processed
// earlier in the loop) had already loaded fine. The caller still saw a
// blanket "couldn't load your account" error, because the thrown exception
// discarded that already-successful work along with everything after it.
//
// Returns { error, isNewAccount }. `error` is only non-null when NOTHING
// loaded at all (every collection's fetch failed — a real total failure,
// e.g. network down or a misconfigured project) — anything less than that
// stays in remote mode, with the specific failure(s) only logged to the
// console, not surfaced as a scary blanket error for what's actually a
// partial, mostly-successful load.
//
// `isNewAccount` is AccountSetupFlow's trigger signal (see App.jsx): true
// only when this user's `pomodoro_settings` row didn't exist yet before this
// call, i.e. this is the very first session this account has ever
// completed — regardless of sign-up method (email/Google). When that's the
// case, this function *unconditionally* creates a minimal settings row right
// here (see upsertSingleton below — an empty object stamped with
// userId/createdAt/updatedAt is enough; every other column has its own
// Postgres-side default, so loadSettings()'s `{ ...DEFAULT_SETTINGS, ...raw }`
// merge fills in the rest on read). This is the fix for a real bug: an
// earlier version only wrote this row when the (now-removed) local-merge
// snapshot happened to include settings data, which depended on a user
// consent step that didn't always run — an account whose very first sign-in
// took that skip-the-write path never got a settings row at all, so every
// later sign-in kept finding "no row" and re-reported isNewAccount: true,
// re-triggering AccountSetupFlow forever. Creating the row unconditionally,
// the moment its absence is detected, means every account gets exactly one
// settings row on its true first sign-in and never looks "new" again after.
// Every table fetch below is independently scoped by user_id, so none of
// them have to wait on each other — they're issued concurrently (Promise.all
// over per-table async functions that each catch their own error, rather
// than a bare Promise.all/allSettled over the raw fetches) so a slow or
// failing table doesn't hold up the others, and total sign-in latency is the
// slowest single table instead of the sum of all of them. Each table keeps
// exactly the same isolated try/catch it had when this ran sequentially — a
// rejection is caught right where it happens and turned into a plain
// { key, error } result, never left to reject the surrounding Promise.all
// itself, so one bad table still can't discard the others' already-resolved
// results (see the two loops below for the real bug this isolation exists
// for).
export async function initializeRemoteData(userId) {
  let anySuccess = false
  let lastError = null
  let isNewAccount = false

  const arrayOutcomes = await Promise.all(
    Object.entries(ARRAY_TABLES).map(async ([key, table]) => {
      try {
        const items = await fetchArrayTable(table, userId)
        return { key, items }
      } catch (error) {
        console.error(`Failed to load ${key} from Supabase:`, error)
        return { key, error }
      }
    })
  )
  for (const outcome of arrayOutcomes) {
    if (outcome.error) {
      lastError = outcome.error
      continue
    }
    cache[outcome.key] = outcome.items
    knownIds[outcome.key] = new Set(outcome.items.map((item) => item.id))
    anySuccess = true
  }

  const singletonOutcomes = await Promise.all(
    Object.entries(SINGLETON_TABLES).map(async ([key, table]) => {
      try {
        const remoteValue = await fetchSingletonTableWithRetry(table, userId)
        if (remoteValue) return { key, value: remoteValue }
        if (key !== 'pomodoro_settings') return { key, value: null }
        // Uses the *AndFetch variant and trusts its response for the cache,
        // rather than assuming the upsert created a blank row and hardcoding
        // cache[key] = { userId }. That assumption was a real bug: when the
        // "no row found" signal above is a false negative (fetchSingleton-
        // TableWithRetry's own comment already flags this as a known,
        // unproven-but-not-ruled-out race — e.g. replication lag right after
        // this same account's real first-ever row was written, or two tabs
        // signing in at once), the row already exists with the user's real
        // theme/language/displayName/seenCoachMarks/dailyPomodoroGoal — this
        // upsert's payload (just `{ userId }`) only touches user_id/created_at/
        // updated_at (Postgres upsert leaves columns absent from the payload
        // untouched), so the *server* row was always safe. But hardcoding the
        // *local* cache to `{ userId }` regardless meant this session's UI
        // showed every settings field reset to default anyway — and, worse,
        // the next time anything called patchSettings() (e.g. the coach-mark/
        // category-seeding effects below, or just the user touching a Settings
        // toggle), it would merge onto that blanked cache and push the full
        // default-filled object back to Supabase, this time actually
        // clobbering the real row for good. Fetching the row back after the
        // upsert closes that gap: a genuinely new account gets the freshly-
        // created minimal row back (identical to the old hardcoded value), but
        // a false-negative "no row" for an established account self-heals to
        // its real data within this same session instead of only fixing
        // itself server-side while the client stays wrong.
        const created = await upsertSingletonAndFetch(table, userId, {})
        return { key, value: created, isNewAccount: true }
      } catch (error) {
        console.error(`Failed to load ${key} from Supabase:`, error)
        return { key, error }
      }
    })
  )
  for (const outcome of singletonOutcomes) {
    if (outcome.error) {
      lastError = outcome.error
      continue
    }
    cache[outcome.key] = outcome.value
    anySuccess = true
    if (outcome.isNewAccount) isNewAccount = true
  }

  if (anySuccess) activeUserId = userId
  return { error: anySuccess ? null : lastError, isNewAccount }
}

// Called on sign-out — storage.js switches its active provider back to
// localStorageProvider right after this.
export function resetToLocalMode() {
  activeUserId = null
  for (const key of Object.keys(cache)) delete cache[key]
  for (const key of Object.keys(knownIds)) delete knownIds[key]
}

// --- The provider shape storage.js's loadJSON/saveJSON expect ------------

export function get(collection, fallback) {
  return cache[collection] ?? fallback
}

export function set(collection, value) {
  // Captured before cache[collection] is overwritten below — this is the
  // "last known" snapshot the new value gets diffed against, so it has to be
  // read first.
  const previous = cache[collection]
  cache[collection] = value
  if (!activeUserId) return

  if (ARRAY_TABLES[collection]) {
    const table = ARRAY_TABLES[collection]
    const newIds = new Set(value.map((item) => item.id))
    const idsToDelete = [...(knownIds[collection] ?? [])].filter((id) => !newIds.has(id))
    knownIds[collection] = newIds

    // Only upsert items whose updatedAt actually differs from what was
    // cached for that same id (a brand-new id, absent from `previous`
    // entirely, always counts as changed too) — every hook that owns one of
    // these collections stamps updatedAt on the one item it actually edits
    // and leaves every other item's object untouched (see e.g.
    // useInventory.js's updateItem), so this is a reliable "did this
    // specific row change" signal, not a guess. Previously this upserted
    // *every* item in `value` on every save, and toRemoteRow() stamps a
    // fresh updated_at on whatever it's given — so a one-field edit to a
    // single task used to bump updated_at on every other unrelated row in
    // the same collection too, and send their full contents over the wire
    // for nothing. See OPTIMIZATIONS.md finding #3 for the full write-up.
    // `?? null` on both sides treats a missing/undefined updatedAt the same
    // as an explicit null, matching mergeCollectionById's own "no timestamp"
    // convention in importData.js.
    const previousById = new Map((previous ?? []).map((item) => [item.id, item]))
    const changed = value.filter((item) => {
      const prevItem = previousById.get(item.id)
      return !prevItem || (prevItem.updatedAt ?? null) !== (item.updatedAt ?? null)
    })

    upsertArrayTable(table, activeUserId, changed)
      .then(() => deleteRows(table, activeUserId, idsToDelete))
      .catch((error) => console.error(`Failed to sync ${collection} to Supabase:`, error))
  } else if (SINGLETON_TABLES[collection]) {
    const table = SINGLETON_TABLES[collection]
    upsertSingleton(table, activeUserId, value).catch((error) =>
      console.error(`Failed to sync ${collection} to Supabase:`, error)
    )
  }
}

// Async and awaited by its callers (storage.js's clearX()/resetAllData()) —
// unlike set() above, which is deliberately fire-and-forget for normal
// interactive saves, remove() is used right before a Danger Zone action
// reloads the page. A fire-and-forget delete here would race that reload:
// window.location.reload() tears down the JS runtime (and any in-flight
// fetch) as soon as it's called, which was aborting the DELETE request
// before Supabase ever received it — Factory Reset (and every other Danger
// Zone button) would appear to do nothing for a signed-in user, even after
// confirming. Awaiting here, and awaiting *that* in storage.js before the
// caller reloads, guarantees the request actually completes first.
export async function remove(collection) {
  const isArray = Boolean(ARRAY_TABLES[collection])
  cache[collection] = isArray ? [] : null
  if (isArray) knownIds[collection] = new Set()
  if (!activeUserId) return

  const table = ARRAY_TABLES[collection] ?? SINGLETON_TABLES[collection]
  const { error } = await supabase.from(table).delete().eq('user_id', activeUserId)
  if (error) console.error(`Failed to clear ${collection} on Supabase:`, error)
}
