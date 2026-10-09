// The app's notion of "a day" is the user's LOCAL calendar day. Never derive
// it from toISOString().slice(0, 10): that converts to UTC first, so the date
// flips at UTC midnight instead of the user's (e.g. 03:00 in Turkey, and a
// full wrong day for evenings in the Americas).
export function localDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayString() {
  return localDateString(new Date())
}
