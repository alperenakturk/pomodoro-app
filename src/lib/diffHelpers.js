// Shared estimate-vs-actual diff formatting: a positive diff means the task
// ran over estimate (tomato), negative means it finished early (amber), and
// null/zero stays neutral. Used by DayReview, RecordsLog, and TodoToday.
export function diffLabel(diff) {
  if (diff == null) return '-'
  return `${diff > 0 ? '+' : ''}${diff}`
}

export function diffClass(diff) {
  if (diff == null) return 'text-sage'
  if (diff > 0) return 'text-tomato-text'
  if (diff < 0) return 'text-amber-text'
  return 'text-cream'
}
