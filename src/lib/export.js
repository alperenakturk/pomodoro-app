// Exported so importData.js's CSV parser can validate an imported file's
// header row against this exact same list, rather than duplicating it.
export const CSV_COLUMNS = [
  'date',
  'time',
  'activity',
  'category',
  'estimate',
  'reestimate1',
  'reestimate2',
  'real',
  'diff',
  'diffI',
  'diffII',
  'internal',
  'external',
  'unplanned',
  'notes',
]

// Guards against CSV/formula injection: a field opened by Excel/Sheets/etc.
// that starts with =, +, -, @, tab, or CR is interpreted as a formula, not
// literal text — e.g. an `activity`/`notes` value of
// `=HYPERLINK("https://evil.example","click")` would auto-execute for
// whoever opens the exported file. Prefixing with `'` forces it back to a
// literal string in every major spreadsheet app, same as Google Sheets'/
// Excel's own recommended mitigation.
function escapeCSVField(value) {
  let s = value == null ? '' : String(value)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// categoryIds are UUIDs, useless to a human reading the CSV in a spreadsheet —
// resolve them to a "; "-joined list of category names (or '' if
// uncategorized, or a tag's category was since deleted) instead of exporting
// the raw ids.
export function activityLogToCSV(records, categories = []) {
  const nameById = new Map(categories.map((c) => [c.id, c.name]))
  const lines = [CSV_COLUMNS.join(',')]
  for (const record of records) {
    const category = (record.categoryIds ?? [])
      .map((id) => nameById.get(id))
      .filter(Boolean)
      .join('; ')
    const row = { ...record, category }
    lines.push(CSV_COLUMNS.map((col) => escapeCSVField(row[col])).join(','))
  }
  return lines.join('\n')
}

export function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
