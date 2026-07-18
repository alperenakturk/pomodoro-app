import { useRef, useState } from 'react'
import { importBackup, importActivityLogCSV, exportAllData, loadActivityLog } from '../lib/storage'
import { validateBackupShape, parseCSV, validateActivityCSV } from '../lib/importData'
import { activityLogToCSV, downloadFile } from '../lib/export'
import { useTranslation } from '../hooks/useTranslation'

const rowClass =
  'flex items-center justify-between gap-3 text-sage text-xs font-sans py-3 border-b border-cream/10 last:border-b-0'

// All data-transfer options (export and import, both JSON-full-backup and
// CSV-records-only) live in one place — previously export lived in
// RecordsLog.jsx while import lived here; moved export in alongside it so a
// user managing their data doesn't have to look in two different tabs.
// Import paths share one shape: pick a file -> validate its structure
// (reject with a clear error before touching any existing data) -> ask
// Replace or Merge -> confirm (window.confirm, same style as Settings'
// Danger Zone) -> write via storage.js -> reload (the existing hooks only
// read storage once at mount, same reason the Danger Zone reloads after a
// reset).
function DataTransfer({ categories }) {
  const { t } = useTranslation()
  const jsonInputRef = useRef(null)
  const csvInputRef = useRef(null)
  const [jsonError, setJsonError] = useState(null)
  const [pendingJson, setPendingJson] = useState(null)
  const [csvError, setCsvError] = useState(null)
  const [pendingCsv, setPendingCsv] = useState(null)

  function handleExportJSON() {
    downloadFile('pomodoro-backup.json', JSON.stringify(exportAllData(), null, 2), 'application/json')
  }

  function handleExportCSV() {
    downloadFile('pomodoro-records.csv', activityLogToCSV(loadActivityLog(), categories), 'text/csv')
  }

  function handleJsonFile(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    setPendingJson(null)
    setJsonError(null)
    const reader = new FileReader()
    reader.onload = () => {
      let data
      try {
        data = JSON.parse(reader.result)
      } catch {
        setJsonError(t('dataImport.invalidJsonError'))
        return
      }
      if (!validateBackupShape(data)) {
        setJsonError(t('dataImport.invalidJsonError'))
        return
      }
      setPendingJson(data)
    }
    reader.readAsText(file)
  }

  function handleCsvFile(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    setPendingCsv(null)
    setCsvError(null)
    const reader = new FileReader()
    reader.onload = () => {
      const rows = parseCSV(reader.result)
      if (!validateActivityCSV(rows)) {
        setCsvError(t('dataImport.invalidCsvError'))
        return
      }
      setPendingCsv(rows)
    }
    reader.readAsText(file)
  }

  function runJsonImport(mode) {
    const confirmed = window.confirm(
      mode === 'replace' ? t('dataImport.jsonReplaceConfirm') : t('dataImport.jsonMergeConfirm')
    )
    if (!confirmed) return
    importBackup(pendingJson, mode)
    window.location.reload()
  }

  function runCsvImport(mode) {
    const confirmed = window.confirm(
      mode === 'replace' ? t('dataImport.csvReplaceConfirm') : t('dataImport.csvMergeConfirm')
    )
    if (!confirmed) return
    importActivityLogCSV(pendingCsv, categories, mode)
    window.location.reload()
  }

  return (
    <div className="bg-pine-dark border border-cream/10 rounded-3xl px-6 py-6 shadow-lg w-full mt-6">
      <p className="font-display text-cream font-bold text-xs tracking-widest uppercase mb-2">
        {t('dataImport.title')}
      </p>

      <div className={rowClass}>
        <div>
          <p className="text-cream">{t('dataImport.jsonExportLabel')}</p>
          <p className="text-sage text-[11px] mt-0.5">{t('dataImport.jsonExportDesc')}</p>
        </div>
        <button
          type="button"
          onClick={handleExportJSON}
          className="text-cream border border-cream/15 rounded-full px-3 py-1 flex-shrink-0"
        >
          {t('dataImport.exportButton')}
        </button>
      </div>

      <div className={rowClass}>
        <div>
          <p className="text-cream">{t('dataImport.csvExportLabel')}</p>
          <p className="text-sage text-[11px] mt-0.5">{t('dataImport.csvExportDesc')}</p>
        </div>
        <button
          type="button"
          onClick={handleExportCSV}
          className="text-cream border border-cream/15 rounded-full px-3 py-1 flex-shrink-0"
        >
          {t('dataImport.exportButton')}
        </button>
      </div>

      <div className={rowClass}>
        <div>
          <p className="text-cream">{t('dataImport.jsonImportLabel')}</p>
          <p className="text-sage text-[11px] mt-0.5">{t('dataImport.jsonImportDesc')}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <input
            ref={jsonInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleJsonFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => jsonInputRef.current.click()}
            className="text-cream border border-cream/15 rounded-full px-3 py-1"
          >
            {t('dataImport.chooseFileButton')}
          </button>
        </div>
      </div>
      {jsonError && <p className="text-tomato-text text-[11px] font-sans -mt-1 mb-2">{jsonError}</p>}
      {pendingJson && (
        <div className="flex flex-col gap-2 bg-tomato/5 border border-tomato/20 rounded-xl px-3 py-2 mb-2">
          <p className="text-sage text-xs font-sans">{t('dataImport.choosePrompt')}</p>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => runJsonImport('replace')}
              className="font-sans text-xs px-3 py-1 rounded-lg bg-tomato text-on-tomato"
            >
              {t('dataImport.replaceButton')}
            </button>
            <button
              type="button"
              onClick={() => runJsonImport('merge')}
              className="font-sans text-xs px-3 py-1 rounded-lg border border-cream/20 text-cream"
            >
              {t('dataImport.mergeButton')}
            </button>
            <button
              type="button"
              onClick={() => setPendingJson(null)}
              className="font-sans text-xs px-3 py-1 rounded-lg text-sage"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      <div className={rowClass}>
        <div>
          <p className="text-cream">{t('dataImport.csvImportLabel')}</p>
          <p className="text-sage text-[11px] mt-0.5">{t('dataImport.csvImportDesc')}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <input
            ref={csvInputRef}
            type="file"
            accept="text/csv,.csv"
            onChange={handleCsvFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => csvInputRef.current.click()}
            className="text-cream border border-cream/15 rounded-full px-3 py-1"
          >
            {t('dataImport.chooseFileButton')}
          </button>
        </div>
      </div>
      {csvError && <p className="text-tomato-text text-[11px] font-sans -mt-1 mb-2">{csvError}</p>}
      {pendingCsv && (
        <div className="flex flex-col gap-2 bg-tomato/5 border border-tomato/20 rounded-xl px-3 py-2">
          <p className="text-sage text-xs font-sans">{t('dataImport.choosePrompt')}</p>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => runCsvImport('replace')}
              className="font-sans text-xs px-3 py-1 rounded-lg bg-tomato text-on-tomato"
            >
              {t('dataImport.replaceButton')}
            </button>
            <button
              type="button"
              onClick={() => runCsvImport('merge')}
              className="font-sans text-xs px-3 py-1 rounded-lg border border-cream/20 text-cream"
            >
              {t('dataImport.mergeButton')}
            </button>
            <button
              type="button"
              onClick={() => setPendingCsv(null)}
              className="font-sans text-xs px-3 py-1 rounded-lg text-sage"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataTransfer
