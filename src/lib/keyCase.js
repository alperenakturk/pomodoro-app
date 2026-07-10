// Generic camelCase (JS) <-> snake_case (Postgres) key conversion for the
// Supabase remote provider — every field name in supabase/schema.sql is a
// mechanical snake_case transform of storage.js's camelCase field, EXCEPT
// diffI/diffII, which the generic algorithm can't round-trip correctly:
// "diffII".replace(/[A-Z]/g, c => '_'+c.toLowerCase()) produces "diff_i_i",
// not the actual column name "diff_ii" (consecutive capitals each get their
// own underscore). Everything else round-trips fine, so these two get an
// explicit override instead of complicating the general algorithm.
const TO_SNAKE_OVERRIDES = { diffI: 'diff_i', diffII: 'diff_ii' }
const TO_CAMEL_OVERRIDES = { diff_i: 'diffI', diff_ii: 'diffII' }

export function camelToSnakeKey(key) {
  if (key in TO_SNAKE_OVERRIDES) return TO_SNAKE_OVERRIDES[key]
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
}

export function snakeToCamelKey(key) {
  if (key in TO_CAMEL_OVERRIDES) return TO_CAMEL_OVERRIDES[key]
  return key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase())
}

// Shallow key mapping only — none of storage.js's records nest objects
// (categoryIds etc. are arrays of scalars, not nested objects), so a deep
// mapper isn't needed.
export function mapKeysToSnake(obj) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [camelToSnakeKey(k), v]))
}

export function mapKeysToCamel(obj) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [snakeToCamelKey(k), v]))
}
