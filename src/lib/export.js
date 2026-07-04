const CSV_COLUMNS = [
  'date',
  'time',
  'activity',
  'type',
  'estimate',
  'real',
  'diff',
  'internal',
  'external',
  'unplanned',
]

function escapeCSVField(value) {
  const s = value == null ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function activityLogToCSV(records) {
  const lines = [CSV_COLUMNS.join(',')]
  for (const record of records) {
    lines.push(CSV_COLUMNS.map((col) => escapeCSVField(record[col])).join(','))
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
