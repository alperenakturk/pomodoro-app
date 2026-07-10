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

const EMPTY_SNAPSHOTS = {
  pomodoro_inventory: [],
  pomodoro_today_tasks: [],
  pomodoro_activity_log: [],
  pomodoro_ticks: [],
  pomodoro_timetable: [],
  pomodoro_categories: [],
  pomodoro_void_log: [],
  pomodoro_timer_state: null,
  pomodoro_settings: { theme: 'dark', cycleLength: 4 },
}

describe('initializeRemoteData', () => {
  it('with no local array data and an already-existing remote settings row, resolves with migrated: false', async () => {
    // loadSettings() always returns a real object (defaults merged in), never
    // null, so an account with its own existing settings row is the only way
    // to see migrated: false end-to-end — a brand new account with no
    // settings row yet would still get one written from the guest defaults
    // (see the "writes the local settings as the initial row" test below).
    const { initializeRemoteData, get } = await loadRemoteProviderWith({
      settings: { singleSelect: { data: { theme: 'dark', cycle_length: 4, user_id: 'user-1' }, error: null } },
    })
    const result = await initializeRemoteData('user-1', EMPTY_SNAPSHOTS)

    expect(result).toEqual({ migrated: false, error: null })
    expect(get('pomodoro_inventory', 'fallback')).toEqual([])
  })

  it('merges local guest data into an account with no prior remote data, and upserts it', async () => {
    const localSnapshots = {
      ...EMPTY_SNAPSHOTS,
      pomodoro_inventory: [{ id: 'i1', text: 'Guest task', updatedAt: '2026-01-01T00:00:00.000Z' }],
    }
    const { initializeRemoteData, get } = await loadRemoteProviderWith({
      inventory: { arraySelect: { data: [], error: null } },
    })

    const result = await initializeRemoteData('user-1', localSnapshots)

    expect(result.migrated).toBe(true)
    expect(result.error).toBeNull()
    expect(get('pomodoro_inventory', null)).toMatchObject([{ id: 'i1', text: 'Guest task' }])

    const upsertCall = mockCalls.find((c) => c.table === 'inventory' && c.method === 'upsert')
    expect(upsertCall.args[0]).toMatchObject([{ id: 'i1', text: 'Guest task', user_id: 'user-1' }])
  })

  it('keeps the remote record when it has a newer updatedAt than the local one (same id)', async () => {
    const localSnapshots = {
      ...EMPTY_SNAPSHOTS,
      pomodoro_inventory: [{ id: 'i1', text: 'stale local', updatedAt: '2026-01-01T00:00:00.000Z' }],
    }
    const { initializeRemoteData, get } = await loadRemoteProviderWith({
      inventory: {
        arraySelect: {
          data: [{ id: 'i1', text: 'current remote', user_id: 'user-1', updated_at: '2026-02-01T00:00:00.000Z' }],
          error: null,
        },
      },
    })

    const result = await initializeRemoteData('user-1', localSnapshots)

    expect(result.migrated).toBe(true)
    expect(get('pomodoro_inventory', null)[0].text).toBe('current remote')
  })

  it('an account with existing settings keeps them rather than being overwritten by guest defaults', async () => {
    const localSnapshots = { ...EMPTY_SNAPSHOTS, pomodoro_settings: { theme: 'light', cycleLength: 6 } }
    const { initializeRemoteData, get } = await loadRemoteProviderWith({
      settings: { singleSelect: { data: { theme: 'dark', cycle_length: 4, user_id: 'user-1' }, error: null } },
    })

    await initializeRemoteData('user-1', localSnapshots)

    expect(get('pomodoro_settings', null)).toMatchObject({ theme: 'dark', cycleLength: 4 })
  })

  it('writes the local settings as the initial row when the account has none yet', async () => {
    const localSnapshots = { ...EMPTY_SNAPSHOTS, pomodoro_settings: { theme: 'light', cycleLength: 6 } }
    const { initializeRemoteData, get } = await loadRemoteProviderWith({
      settings: { singleSelect: { data: null, error: null } },
    })

    const result = await initializeRemoteData('user-1', localSnapshots)

    expect(result.migrated).toBe(true)
    expect(get('pomodoro_settings', null)).toMatchObject({ theme: 'light', cycleLength: 6 })
  })

  it('returns an error (and leaves nothing migrated) when a fetch fails, without throwing', async () => {
    const { initializeRemoteData } = await loadRemoteProviderWith({
      inventory: { arraySelect: { data: null, error: { message: 'network error' } } },
    })

    const result = await initializeRemoteData('user-1', EMPTY_SNAPSHOTS)

    expect(result.error).toBeTruthy()
    expect(result.migrated).toBe(false)
  })
})

describe('get/set/remove after initializeRemoteData', () => {
  it('set() upserts the new array and deletes ids that were removed from it', async () => {
    const localSnapshots = {
      ...EMPTY_SNAPSHOTS,
      pomodoro_inventory: [
        { id: 'i1', text: 'A', updatedAt: '2026-01-01T00:00:00.000Z' },
        { id: 'i2', text: 'B', updatedAt: '2026-01-01T00:00:00.000Z' },
      ],
    }
    const { initializeRemoteData, set } = await loadRemoteProviderWith({
      inventory: { arraySelect: { data: [], error: null } },
    })
    await initializeRemoteData('user-1', localSnapshots)
    mockCalls.length = 0 // only interested in calls made by set() below

    set('pomodoro_inventory', [{ id: 'i1', text: 'A renamed', updatedAt: '2026-01-02T00:00:00.000Z' }])
    await new Promise((resolve) => setTimeout(resolve, 0)) // let the fire-and-forget promise chain run

    const upsertCall = mockCalls.find((c) => c.table === 'inventory' && c.method === 'upsert')
    expect(upsertCall.args[0]).toMatchObject([{ id: 'i1', text: 'A renamed' }])
    const deleteCall = mockCalls.find((c) => c.table === 'inventory' && c.method === 'in')
    expect(deleteCall.args).toEqual(['id', ['i2']])
  })

  it('resetToLocalMode clears the cache so a later initializeRemoteData starts clean', async () => {
    const { initializeRemoteData, resetToLocalMode, get } = await loadRemoteProviderWith({
      inventory: { arraySelect: { data: [{ id: 'i1', text: 'A', user_id: 'user-1' }], error: null } },
    })
    await initializeRemoteData('user-1', EMPTY_SNAPSHOTS)
    expect(get('pomodoro_inventory', null)).toHaveLength(1)

    resetToLocalMode()
    expect(get('pomodoro_inventory', 'fallback')).toBe('fallback')
  })
})
