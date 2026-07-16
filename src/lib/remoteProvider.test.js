import { describe, it, expect, vi, beforeEach } from 'vitest'

// A minimal chainable + thenable mock of supabase-js's query builder. Every
// chain method (eq/select/delete/upsert/in) returns the same chain object so
// any call order the real code uses resolves correctly, and the chain
// itself implements .then() so `await supabase.from(t).select('*').eq(...)`
// resolves to whatever this test configured for that table via `responses`.
function createMockSupabase(responses) {
  const calls = []

  function makeChain(table) {
    const resolveWith = (key, fallback) => Promise.resolve(responses[table]?.[key] ?? fallback)

    const chain = {
      eq(column, value) {
        calls.push({ table, method: 'eq', args: [column, value] })
        return chain
      },
      in(column, values) {
        calls.push({ table, method: 'in', args: [column, values] })
        return resolveWith('deleteResult', { error: null })
      },
      maybeSingle() {
        calls.push({ table, method: 'maybeSingle' })
        return resolveWith('singleSelect', { data: null, error: null })
      },
      select(columns) {
        calls.push({ table, method: 'select', args: [columns] })
        return chain
      },
      upsert(rows, options) {
        calls.push({ table, method: 'upsert', args: [rows, options] })
        // Returns a chain (not a bare promise) so upsertSingletonAndFetch's
        // `.upsert(...).select().single()` can keep chaining off it, while
        // still resolving directly for every other caller that just
        // `await`s the upsert call bare (upsertArrayTable/upsertSingleton) —
        // its own .then() below resolves with the plain 'upsertResult' key,
        // untouched by the .select()/.single() addition.
        return {
          select(columns) {
            calls.push({ table, method: 'select', args: [columns] })
            return {
              single() {
                calls.push({ table, method: 'single' })
                return resolveWith('upsertAndFetchResult', { data: null, error: null })
              },
            }
          },
          then(onFulfilled, onRejected) {
            return resolveWith('upsertResult', { error: null }).then(onFulfilled, onRejected)
          },
        }
      },
      delete() {
        calls.push({ table, method: 'delete' })
        return chain
      },
      then(onFulfilled, onRejected) {
        return resolveWith('arraySelect', { data: [], error: null }).then(onFulfilled, onRejected)
      },
    }
    return chain
  }

  return { supabase: { from: (table) => makeChain(table) }, calls }
}

let mockSupabase
let mockCalls

vi.mock('./supabaseClient', () => ({
  get supabase() {
    return mockSupabase
  },
}))

beforeEach(() => {
  vi.resetModules()
})

async function loadRemoteProviderWith(responses) {
  const mock = createMockSupabase(responses)
  mockSupabase = mock.supabase
  mockCalls = mock.calls
  return import('./remoteProvider')
}

describe('initializeRemoteData', () => {
  it('fetches every array table and caches it as-is, with no local data involved at all', async () => {
    const { initializeRemoteData, get } = await loadRemoteProviderWith({
      inventory: { arraySelect: { data: [{ id: 'i1', text: 'Remote task', user_id: 'user-1' }], error: null } },
      settings: { singleSelect: { data: { theme: 'dark', cycle_length: 4, user_id: 'user-1' }, error: null } },
    })

    const result = await initializeRemoteData('user-1')

    expect(result.error).toBeNull()
    expect(get('pomodoro_inventory', null)).toMatchObject([{ id: 'i1', text: 'Remote task' }])
    // No upsert should ever be issued for a table that already has data —
    // this function only ever reads, except for creating a brand-new
    // account's settings row (see the isNewAccount tests below).
    expect(mockCalls.some((c) => c.table === 'inventory' && c.method === 'upsert')).toBe(false)
  })

  it('an existing account with its own settings keeps them, and reports isNewAccount: false', async () => {
    const { initializeRemoteData, get } = await loadRemoteProviderWith({
      settings: { singleSelect: { data: { theme: 'dark', cycle_length: 4, user_id: 'user-1' }, error: null } },
    })

    const result = await initializeRemoteData('user-1')

    expect(result.error).toBeNull()
    expect(result.isNewAccount).toBe(false)
    expect(get('pomodoro_settings', null)).toMatchObject({ theme: 'dark', cycleLength: 4 })
  })

  it('creates a minimal settings row (not a full default object) when none exists yet, and reports isNewAccount: true', async () => {
    const { initializeRemoteData, get } = await loadRemoteProviderWith({
      settings: {
        singleSelect: { data: null, error: null },
        // What Postgres actually returns for the row this call creates —
        // see upsertSingletonAndFetch, which now trusts this response for
        // the cache instead of assuming the payload it sent is the whole
        // row (see the false-negative regression test below for why).
        upsertAndFetchResult: { data: { user_id: 'user-1' }, error: null },
      },
    })

    const result = await initializeRemoteData('user-1')

    expect(result.error).toBeNull()
    expect(result.isNewAccount).toBe(true)
    expect(get('pomodoro_settings', null)).toMatchObject({ userId: 'user-1' })

    // The upsert payload is deliberately minimal — just what toRemoteRow()
    // always stamps (user_id/created_at/updated_at) — not a full settings
    // object. There's no local snapshot to send anymore; every other column
    // is left to its own Postgres-side default and filled in client-side by
    // loadSettings()'s merge onto DEFAULT_SETTINGS on read.
    const upsertCall = mockCalls.find((c) => c.table === 'settings' && c.method === 'upsert')
    expect(upsertCall.args[0]).toMatchObject({ user_id: 'user-1' })
    expect(upsertCall.args[0]).not.toHaveProperty('theme')
    expect(upsertCall.args[0]).not.toHaveProperty('cycle_length')
  })

  // Regression test for a MAJOR reported bug: a signed-in user's theme,
  // language, display name, daily Pomodoro goal, and seen-coach-marks all
  // reverting to their defaults on a page reload — while Planning/Reports
  // data and categories (all separate array tables, unaffected by this code
  // path) kept persisting fine. Root cause: fetchSingletonTableWithRetry's
  // "no row found" result is trusted as conclusive proof of a brand-new
  // account after just one retry, but that single retry was never proven to
  // rule out every real-world false negative (see its own comment) — e.g.
  // replication lag right after this exact account's row was written moments
  // earlier, or a page reload racing a still-in-flight write. When that
  // happens for an account that already has a real settings row server-side,
  // the old code still hardcoded the local cache to `{ userId }`, discarding
  // every real field for the rest of the session — exactly the theme/
  // language/name/goal/coachmarks reset that was reported, and, if anything
  // in that session later called patchSettings (routine — e.g. the coach-
  // mark or default-category-seeding effects that run right after sign-in),
  // it would push that blanked object back to Supabase and clobber the real
  // row server-side too, turning a transient hiccup into permanent loss.
  // Fixed by trusting upsertSingletonAndFetch's response (a real .select()
  // read of the row Postgres ends up with) for the cache instead of
  // assuming the minimal upsert payload IS the whole row — self-healing to
  // the account's real data even when the "no row" signal was wrong.
  it('recovers the real settings instead of wiping them when "no row found" turns out to be a false negative', async () => {
    const realExistingRow = {
      user_id: 'user-1',
      theme: 'dark',
      language: 'tr',
      display_name: 'Alperen',
      daily_pomodoro_goal: 8,
      seen_coach_marks: ['timer-intro', 'planning-intro'],
    }
    const { initializeRemoteData, get } = await loadRemoteProviderWith({
      settings: {
        // The SELECT (used for the "does a row exist" check) comes back
        // empty even though the row genuinely exists — simulating the
        // documented, unproven-but-possible false-negative race.
        singleSelect: { data: null, error: null },
        // But the upsert's own .select() (a real read of the resulting row,
        // issued moments later in the same request) sees it — Postgres
        // upsert with a `{ user_id }`-only payload only touches user_id/
        // created_at/updated_at, so the pre-existing columns are exactly as
        // they were.
        upsertAndFetchResult: { data: realExistingRow, error: null },
      },
    })

    const result = await initializeRemoteData('user-1')

    // isNewAccount is still (incorrectly) true here — this fix doesn't
    // claim to make that determination race-proof, only to stop it from
    // costing the user their real data. AccountSetupFlow re-showing once in
    // this rare case is the accepted residual cosmetic cost.
    expect(result.isNewAccount).toBe(true)
    expect(result.error).toBeNull()
    // The important part: the account's REAL settings, not a blanked
    // { userId } object, are what's in the cache after this call.
    expect(get('pomodoro_settings', null)).toMatchObject({
      userId: 'user-1',
      theme: 'dark',
      language: 'tr',
      displayName: 'Alperen',
      dailyPomodoroGoal: 8,
      seenCoachMarks: ['timer-intro', 'planning-intro'],
    })
  })

  // Regression test for the reported bug: AccountSetupFlow re-triggering on
  // a second sign-in to an account that had already completed it. Root
  // cause was that the settings row used to only get created when a
  // (now-removed) local-merge snapshot happened to include settings data —
  // an account whose first sign-in skipped that write never got a row at
  // all, so every later call kept finding "no row" and kept reporting
  // isNewAccount: true forever. Fixed by creating the row unconditionally
  // the moment its absence is detected (see initializeRemoteData's own
  // comment) — this test simulates two sign-ins to the same account within
  // one session by calling initializeRemoteData twice against the same
  // mock, updating the mock's settings response in between to reflect the
  // row the first call actually created.
  it('a second call for the same account finds the row the first call created, and reports isNewAccount: false', async () => {
    const responses = {
      settings: {
        singleSelect: { data: null, error: null },
        upsertAndFetchResult: { data: { user_id: 'user-1' }, error: null },
      },
    }
    const { initializeRemoteData } = await loadRemoteProviderWith(responses)

    const first = await initializeRemoteData('user-1')
    expect(first.isNewAccount).toBe(true)

    // Reflects the row initializeRemoteData's own upsertSingleton() call
    // just wrote — a real second sign-in would find exactly this.
    responses.settings.singleSelect = {
      data: { user_id: 'user-1', theme: 'light-terracotta', cycle_length: 4 },
      error: null,
    }

    const second = await initializeRemoteData('user-1')
    expect(second.isNewAccount).toBe(false)
  })

  // A single collection's fetch failing (e.g. a stray schema/CHECK-constraint
  // mismatch on just one table) must not discard the rest of an otherwise-
  // successful load — see initializeRemoteData's own comment for the real
  // bug this regression-tests (a 'pause' tick and a non-default theme value
  // used to poison the *entire* fetch this way, surfacing a false
  // "couldn't load your account" error even though most collections had
  // already loaded).
  it("logs but does not surface an error when only one collection's fetch fails, since everything else succeeded", async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { initializeRemoteData, get } = await loadRemoteProviderWith({
      inventory: { arraySelect: { data: null, error: { message: 'network error' } } },
      settings: { singleSelect: { data: { theme: 'dark', cycle_length: 4, user_id: 'user-1' }, error: null } },
    })

    const result = await initializeRemoteData('user-1')

    expect(result.error).toBeNull()
    // The failing collection's cache never got warmed — callers fall back
    // to whatever default they pass to get(), same as "nothing loaded yet".
    expect(get('pomodoro_inventory', 'fallback')).toBe('fallback')
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('pomodoro_inventory'), expect.anything())
    consoleErrorSpy.mockRestore()
  })

  it('returns an error only when every single collection fails (a real total failure)', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const failure = { data: null, error: { message: 'network error' } }
    const { initializeRemoteData } = await loadRemoteProviderWith({
      inventory: { arraySelect: failure },
      today_tasks: { arraySelect: failure },
      activity_log: { arraySelect: failure },
      ticks: { arraySelect: failure },
      timetable: { arraySelect: failure },
      categories: { arraySelect: failure },
      void_log: { arraySelect: failure },
      card_draws: { arraySelect: failure },
      timer_state: { singleSelect: failure },
      settings: { singleSelect: failure },
    })

    const result = await initializeRemoteData('user-1')

    expect(result.error).toBeTruthy()
    consoleErrorSpy.mockRestore()
  })
})

describe('get/set/remove after initializeRemoteData', () => {
  it('set() upserts the new array and deletes ids that were removed from it', async () => {
    const { initializeRemoteData, set } = await loadRemoteProviderWith({
      inventory: {
        arraySelect: {
          data: [
            { id: 'i1', text: 'A', user_id: 'user-1' },
            { id: 'i2', text: 'B', user_id: 'user-1' },
          ],
          error: null,
        },
      },
    })
    await initializeRemoteData('user-1')
    mockCalls.length = 0 // only interested in calls made by set() below

    set('pomodoro_inventory', [{ id: 'i1', text: 'A renamed', updatedAt: '2026-01-02T00:00:00.000Z' }])
    await new Promise((resolve) => setTimeout(resolve, 0)) // let the fire-and-forget promise chain run

    const upsertCall = mockCalls.find((c) => c.table === 'inventory' && c.method === 'upsert')
    expect(upsertCall.args[0]).toMatchObject([{ id: 'i1', text: 'A renamed' }])
    const deleteCall = mockCalls.find((c) => c.table === 'inventory' && c.method === 'in')
    expect(deleteCall.args).toEqual(['id', ['i2']])
  })

  // OPTIMIZATIONS.md finding #3: set() used to upsert every item in `value`
  // on every save, and toRemoteRow() stamps a fresh updated_at on whatever
  // it's given — so editing one row used to re-write (and re-stamp
  // updated_at on) every other untouched row in the same collection too.
  // set() now diffs against its own cache by updatedAt and only upserts rows
  // that actually changed.
  it("set() only upserts the item whose updatedAt actually changed, never touching a sibling row's payload", async () => {
    const { initializeRemoteData, set } = await loadRemoteProviderWith({
      inventory: {
        arraySelect: {
          data: [
            { id: 'i1', text: 'A', user_id: 'user-1', updated_at: '2026-01-01T00:00:00.000Z' },
            { id: 'i2', text: 'B', user_id: 'user-1', updated_at: '2026-01-01T00:00:00.000Z' },
          ],
          error: null,
        },
      },
    })
    await initializeRemoteData('user-1')
    mockCalls.length = 0

    // Mirrors what a real single-item edit looks like by the time it reaches
    // here: i1's updatedAt genuinely changed (a hook's stampUpdated ran on
    // it), i2 is passed through byte-identical to what was just fetched
    // (every other hook update passes sibling items through map() untouched).
    set('pomodoro_inventory', [
      { id: 'i1', text: 'A renamed', updatedAt: '2026-01-02T00:00:00.000Z' },
      { id: 'i2', text: 'B', updatedAt: '2026-01-01T00:00:00.000Z' },
    ])
    await new Promise((resolve) => setTimeout(resolve, 0))

    const upsertCall = mockCalls.find((c) => c.table === 'inventory' && c.method === 'upsert')
    expect(upsertCall.args[0]).toHaveLength(1)
    expect(upsertCall.args[0]).toMatchObject([{ id: 'i1', text: 'A renamed' }])
    // The real point of this test: i2's row must never even appear in the
    // upsert payload — that's what keeps Supabase from touching its
    // updated_at (or any other column) at all.
    expect(upsertCall.args[0].some((row) => row.id === 'i2')).toBe(false)
  })

  it('set() issues no upsert at all when nothing in the collection actually changed', async () => {
    // Mirrors the mount-triggered save every collection hook's own useEffect
    // fires right after loading — before this fix, that alone was enough to
    // re-upload the entire collection with fresh updated_at stamps, even
    // though nothing had actually changed since the fetch that just warmed
    // the cache.
    const { initializeRemoteData, get, set } = await loadRemoteProviderWith({
      inventory: {
        arraySelect: {
          data: [{ id: 'i1', text: 'A', user_id: 'user-1', updated_at: '2026-01-01T00:00:00.000Z' }],
          error: null,
        },
      },
    })
    await initializeRemoteData('user-1')
    mockCalls.length = 0

    set('pomodoro_inventory', get('pomodoro_inventory', []))
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(mockCalls.some((c) => c.table === 'inventory' && c.method === 'upsert')).toBe(false)
    // The unaffected id must also not be reported as removed.
    expect(mockCalls.some((c) => c.table === 'inventory' && c.method === 'in')).toBe(false)
  })

  it('a brand-new item (no prior cache entry) is always upserted, even though it has no updatedAt to compare yet', async () => {
    const { initializeRemoteData, set } = await loadRemoteProviderWith({
      inventory: { arraySelect: { data: [], error: null } },
    })
    await initializeRemoteData('user-1')
    mockCalls.length = 0

    set('pomodoro_inventory', [{ id: 'new-1', text: 'Brand new item' }])
    await new Promise((resolve) => setTimeout(resolve, 0))

    const upsertCall = mockCalls.find((c) => c.table === 'inventory' && c.method === 'upsert')
    expect(upsertCall.args[0]).toMatchObject([{ id: 'new-1', text: 'Brand new item' }])
  })

  // Regression test for a real bug: remove() used to fire the Supabase
  // delete and return immediately without awaiting it, so a caller that
  // reloads the page right after calling remove() (every Danger Zone
  // button, including Factory Reset) could have window.location.reload()
  // tear down the JS runtime — aborting the in-flight request — before it
  // ever reached Supabase. remove() must now stay pending until the delete
  // call actually resolves.
  it("remove() doesn't resolve until its Supabase delete call actually completes", async () => {
    const responses = { inventory: { arraySelect: { data: [], error: null } } }
    const { initializeRemoteData, remove, get } = await loadRemoteProviderWith(responses)
    await initializeRemoteData('user-1')

    let resolveDelete
    responses.inventory.arraySelect = new Promise((resolve) => {
      resolveDelete = () => resolve({ data: [], error: null })
    })

    let removed = false
    const removePromise = remove('pomodoro_inventory').then(() => {
      removed = true
    })

    // Flush a few microtask ticks — if remove() were still fire-and-forget,
    // it would have already resolved by now regardless of the pending delete.
    await Promise.resolve()
    await Promise.resolve()
    expect(removed).toBe(false)

    resolveDelete()
    await removePromise
    expect(removed).toBe(true)
    expect(get('pomodoro_inventory', 'fallback')).toEqual([])
  })

  it('resetToLocalMode clears the cache so a later initializeRemoteData starts clean', async () => {
    const { initializeRemoteData, resetToLocalMode, get } = await loadRemoteProviderWith({
      inventory: { arraySelect: { data: [{ id: 'i1', text: 'A', user_id: 'user-1' }], error: null } },
    })
    await initializeRemoteData('user-1')
    expect(get('pomodoro_inventory', null)).toHaveLength(1)

    resetToLocalMode()
    expect(get('pomodoro_inventory', 'fallback')).toBe('fallback')
  })
})
