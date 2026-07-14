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
        return resolveWith('upsertResult', { error: null })
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
      settings: { singleSelect: { data: null, error: null } },
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
    const responses = { settings: { singleSelect: { data: null, error: null } } }
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
