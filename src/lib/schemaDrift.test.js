import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mapKeysToSnake } from './keyCase'
import {
  loadInventory,
  loadTodayTasks,
  loadActivityLog,
  loadTicks,
  loadTimetable,
  loadCategories,
  loadVoidLog,
  loadCardDraws,
  loadAchievementUnlocks,
  loadTimerState,
  loadSettings,
} from './storage'

// remoteProvider.js's toRemoteRow() sends EVERY key of a normalized record to
// PostgREST, and one column the table doesn't have rejects the WHOLE row
// (PGRST204) — this is the "silent, everything stops saving" class of bug
// AGENTS.md warns about. The hand-rolled supabase mock elsewhere can't catch
// it because it doesn't know the schema, so this test parses the real
// supabase/schema.sql and checks every field storage.js can emit against it.

const SCHEMA = readFileSync(resolve(__dirname, '../../supabase/schema.sql'), 'utf8').replace(/--.*$/gm, '')

function parseColumns() {
  const tables = {}

  for (const match of SCHEMA.matchAll(/create table (?:if not exists )?public\.(\w+)\s*\(([\s\S]*?)\n\);/g)) {
    const cols = (tables[match[1]] ??= new Set())
    for (const line of match[2].split('\n')) {
      const first = line.trim().split(/\s+/)[0]?.replace(/,$/, '').replaceAll('"', '')
      if (!first || /^(constraint|primary|unique|check|foreign|references|\)|\()/i.test(first)) continue
      if (/^\w+$/.test(first)) cols.add(first)
    }
  }

  for (const match of SCHEMA.matchAll(/alter table (?:if exists )?public\.(\w+)\s+([^;]*);/g)) {
    for (const add of match[2].matchAll(/add column (?:if not exists )?"?(\w+)/gi)) {
      ;(tables[match[1]] ??= new Set()).add(add[1])
    }
  }
  return tables
}

const COLUMNS = parseColumns()

// Columns toRemoteRow() always adds on top of the normalized record.
const ALWAYS_SENT = ['user_id', 'created_at', 'updated_at']

function sentKeys(record) {
  return [...new Set([...Object.keys(mapKeysToSnake(record)), ...ALWAYS_SENT])]
}

beforeEach(() => {
  localStorage.clear()
})

function seeded(key, items, load) {
  localStorage.setItem(key, JSON.stringify(items))
  return load()
}

const ARRAY_CASES = [
  ['inventory', () => seeded('pomodoro_inventory', [{ id: 'a', text: 't' }], loadInventory)],
  ['today_tasks', () => seeded('pomodoro_today_tasks', [{ id: 'a', text: 't' }], loadTodayTasks)],
  ['activity_log', () => seeded('pomodoro_activity_log', [{ id: 'a', text: 't' }], loadActivityLog)],
  ['ticks', () => seeded('pomodoro_ticks', [{ id: 'a', type: 'pomodoro', date: '2026-01-01' }], loadTicks)],
  ['timetable', () => seeded('pomodoro_timetable', [{ id: 'a', title: 't', start: '09:00', end: '10:00' }], loadTimetable)],
  ['categories', () => seeded('pomodoro_categories', [{ id: 'a', name: 'n' }], loadCategories)],
  ['void_log', () => seeded('pomodoro_void_log', [{ id: 'a', reason: 'r' }], loadVoidLog)],
  ['card_draws', () => seeded('pomodoro_card_draws', [{ id: 'a' }], loadCardDraws)],
  ['achievement_unlocks', () => seeded('pomodoro_achievement_unlocks', [{ id: 'a', achievementId: 'x' }], loadAchievementUnlocks)],
]

describe('schema.sql parsing sanity', () => {
  it('finds every table with at least its primary key and user_id', () => {
    for (const table of [...ARRAY_CASES.map(([t]) => t), 'settings', 'timer_state']) {
      expect(COLUMNS[table], table).toBeDefined()
      expect(COLUMNS[table].has('id') || table === 'settings' || table === 'timer_state', table).toBe(true)
      expect(COLUMNS[table].has('user_id'), table).toBe(true)
    }
  })
})

describe('storage.js normalizers vs supabase/schema.sql (no column drift)', () => {
  for (const [table, build] of ARRAY_CASES) {
    it(`every field a ${table} record can carry has a ${table} column`, () => {
      const [record] = build()
      const missing = sentKeys(record).filter((key) => !COLUMNS[table].has(key))
      expect(missing, `columns missing from public.${table} in schema.sql`).toEqual([])
    })
  }

  it('every settings field has a settings column', () => {
    const missing = sentKeys(loadSettings()).filter((key) => !COLUMNS.settings.has(key))
    expect(missing, 'columns missing from public.settings in schema.sql').toEqual([])
  })

  it('every timer_state field has a timer_state column', () => {
    const missing = sentKeys(seeded('pomodoro_timer_state', {}, loadTimerState)).filter((key) => !COLUMNS.timer_state.has(key))
    expect(missing, 'columns missing from public.timer_state in schema.sql').toEqual([])
  })
})
