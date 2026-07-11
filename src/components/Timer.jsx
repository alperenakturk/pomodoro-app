import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import UnplannedCapture from './UnplannedCapture'
import KeyboardShortcutsModal from './KeyboardShortcutsModal'
import { isPipSupported, copyStylesToWindow, fillPipDocument } from '../lib/pip'
import { useTranslation } from '../hooks/useTranslation'

const RING_PULSE_MS = 500

const LABEL_KEYS = {
  work: 'timer.focus',
  shortBreak: 'timer.shortBreak',
  longBreak: 'timer.longBreak',
}

const SESSION_ORDER = ['work', 'shortBreak', 'longBreak']

const RADIUS = 46
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

// Purely presentational — usePomodoro is instantiated once in App.jsx (not
// here) so the countdown keeps running and is controllable from the Settings
// tab even while the Timer tab isn't the one showing.
function Timer({
  activeTask,
  addTask,
  theme,
  onGoToPlanning,
  showWelcome,
  onDismissWelcome,
  sessionType,
  secondsLeft,
  isRunning,
  completedPomodoros,
  internalCount,
  externalCount,
  completionPulseKey,
  cycleLength,
  workMinutes,
  shortBreakMinutes,
  longBreakMinutes,
  start,
  voidPomodoro,
  finishEarly,
  skipBreak,
  switchSession,
  logInterruption,
  undoInterruption,
}) {
  const { t } = useTranslation()
  const defaultTitle = t('common.appTitle')

  // Shows the live countdown in the tab title so it's visible without
  // switching back to this tab; reverts to the default title when idle.
  useEffect(() => {
    document.title = isRunning
      ? `${formatTime(secondsLeft)} · ${t(LABEL_KEYS[sessionType])}`
      : defaultTitle
  }, [isRunning, secondsLeft, sessionType, defaultTitle, t])

  useEffect(() => {
    return () => {
      document.title = defaultTitle
    }
  }, [defaultTitle])

  // A brief one-shot ring-pulse whenever a Pomodoro completes.
  // completionPulseKey is reset to 0 on every mount (it isn't persisted), so
  // comparing against a ref — rather than any nonzero value — is what keeps
  // this from firing on mount/refresh, only on an actual increment.
  const [pulsing, setPulsing] = useState(false)
  const prevPulseKeyRef = useRef(completionPulseKey)
  useEffect(() => {
    if (completionPulseKey === prevPulseKeyRef.current) return
    prevPulseKeyRef.current = completionPulseKey
    setPulsing(true)
    const timeoutId = setTimeout(() => setPulsing(false), RING_PULSE_MS)
    return () => clearTimeout(timeoutId)
  }, [completionPulseKey])

  // Fullscreen Focus Mode. isFullscreen is driven entirely by the native
  // 'fullscreenchange' event rather than set optimistically on click — that
  // keeps it correct if the request is rejected (fullscreen requires a user
  // gesture, but browsers can still refuse it in some contexts) or if the
  // user exits some other way the button doesn't know about.
  const containerRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === containerRef.current)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      containerRef.current?.requestFullscreen().catch(() => {})
    }
  }

  // Picture-in-Picture mini timer. pipWindow is the open PiP Window object
  // (or null when closed); its content is a React portal, so it re-renders
  // in step with the main countdown automatically — no separate timer, no
  // manual sync. Read-only by design: no interruption buttons or controls,
  // just the time and session type, matching document.title's existing
  // countdown fallback for browsers without this API (Safari) in spirit.
  const [pipWindow, setPipWindow] = useState(null)
  const pipRequestInFlightRef = useRef(false)
  const pipSupported = isPipSupported()

  // Fires when the PiP window closes, whether the user closed it directly or
  // we called .close() ourselves from toggling it off — single source of
  // truth for "is it open", so state can't drift from reality.
  useEffect(() => {
    if (!pipWindow) return
    function handlePipClosed() {
      setPipWindow(null)
    }
    pipWindow.addEventListener('pagehide', handlePipClosed)
    return () => pipWindow.removeEventListener('pagehide', handlePipClosed)
  }, [pipWindow])

  async function togglePip() {
    if (pipWindow) {
      pipWindow.close()
      return
    }
    if (pipRequestInFlightRef.current) return
    pipRequestInFlightRef.current = true
    try {
      const pip = await window.documentPictureInPicture.requestWindow({ width: 220, height: 160 })
      copyStylesToWindow(pip)
      fillPipDocument(pip)
      setPipWindow(pip)
    } catch {
      // Rejected/cancelled (e.g. no transient user activation) — stay put.
    } finally {
      pipRequestInFlightRef.current = false
    }
  }

  const isWork = sessionType === 'work'
  const accentClass = isWork ? 'text-tomato' : 'text-amber'
  const ringClass = isWork ? 'stroke-tomato' : 'stroke-amber'
  const dotClass = isWork ? 'fill-tomato' : 'fill-amber'

  // Mirrors usePomodoro's own per-session-type duration so the ring's
  // progress arc stays correct regardless of the user's configured work/
  // short/long break lengths (Settings) — usePomodoro itself owns secondsLeft.
  const sessionDuration =
    sessionType === 'work'
      ? workMinutes * 60
      : sessionType === 'longBreak'
        ? longBreakMinutes * 60
        : shortBreakMinutes * 60
  const progress = 1 - secondsLeft / sessionDuration
  const dashOffset = CIRCUMFERENCE * (1 - progress)
  const angleRad = ((progress * 360 - 90) * Math.PI) / 180
  const dotX = 50 + RADIUS * Math.cos(angleRad)
  const dotY = 50 + RADIUS * Math.sin(angleRad)

  const filledDots =
    completedPomodoros > 0 && completedPomodoros % cycleLength === 0
      ? cycleLength
      : completedPomodoros % cycleLength

  // Void Reason Logging: replaces the old plain window.confirm with an
  // inline panel (matching TaskRow's re-estimate panel elsewhere in the app)
  // that both confirms the void and collects an optional reason in one calm
  // step, instead of stacking a confirm() and a second prompt().
  const [voidPromptOpen, setVoidPromptOpen] = useState(false)
  const [voidReason, setVoidReason] = useState('')

  function openVoidPrompt() {
    setVoidReason('')
    setVoidPromptOpen(true)
  }

  function confirmVoid(e) {
    e.preventDefault()
    voidPomodoro(voidReason.trim())
    setVoidPromptOpen(false)
  }

  function cancelVoid() {
    setVoidPromptOpen(false)
  }

  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false)

  // Rule 2 says a Pomodoro always rings and there's no "finish early" —
  // overrunning time is meant for overlearning, not for stopping the clock.
  // We deliberately deviate from that: the confirm dialog *teaches* the rule
  // (spells out what overlearning is and why finishing early isn't the
  // default), but leaves the actual call to the user rather than blocking
  // it outright. Confirming still finishes the Pomodoro as complete (an X
  // is recorded), same as letting it ring naturally. Not offered at all in
  // Fullscreen Focus Mode — that view keeps only Start/Void/Skip, the
  // methodology-clean core controls.
  function handleFinishEarly() {
    if (window.confirm(t('timer.finishEarlyConfirm'))) {
      finishEarly()
    }
  }

  function handleSwitch(type) {
    if (type === sessionType) return
    if (sessionType === 'work' && isRunning) {
      if (!window.confirm(t('timer.switchAwayConfirm'))) {
        return
      }
    }
    switchSession(type)
  }

  // Keyboard shortcuts. No dependency array — re-subscribing every render is
  // cheap for a single window listener and guarantees the closures above
  // always see the latest state instead of going stale.
  useEffect(() => {
    function handleKeyDown(e) {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return

      if (e.code === 'Space') {
        e.preventDefault()
        if (!isRunning) start()
        return
      }
      if (e.key === 'Escape') {
        // While fullscreen, Escape is the browser's own "exit fullscreen"
        // gesture — fullscreenchange syncs isFullscreen, nothing to do here,
        // and it must NOT also open the void prompt underneath.
        if (isFullscreen) return
        if (shortcutsModalOpen) {
          setShortcutsModalOpen(false)
          return
        }
        if (voidPromptOpen) {
          cancelVoid()
          return
        }
        if (isRunning && isWork) {
          openVoidPrompt()
          return
        }
        return
      }
      // 'F' toggles Fullscreen Focus Mode. Previously bound to Finish
      // Pomodoro — moved to 'E' (below) to make room, since fullscreen is
      // the more frequently reached-for shortcut of the two.
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen()
        return
      }
      if ((e.key === 'e' || e.key === 'E') && isRunning && isWork) {
        handleFinishEarly()
        return
      }
      // '?' opens the keyboard-shortcuts reference (also reachable via the
      // small icon button next to Fullscreen/PiP).
      if (e.key === '?') {
        setShortcutsModalOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  return (
    <div
      ref={containerRef}
      className={
        isFullscreen
          ? 'bg-pine w-full h-full flex items-center justify-center p-6'
          : 'flex flex-col items-center gap-4 w-full'
      }
    >
      {!isFullscreen && showWelcome && (
        <div className="relative bg-black/20 border border-cream/10 rounded-3xl px-6 py-5 shadow-lg w-full max-w-md">
          <button
            type="button"
            onClick={onDismissWelcome}
            className="absolute top-3 right-3 text-sage hover:text-cream text-lg leading-none"
            aria-label={t('onboarding.dismissAria')}
          >
            ×
          </button>
          <p className="font-display text-cream font-bold text-xs tracking-widest uppercase mb-2 pr-6">
            {t('onboarding.title')}
          </p>
          <p className="font-sans text-sage text-sm">{t('onboarding.body')}</p>
          <button
            type="button"
            onClick={onDismissWelcome}
            className="font-sans text-xs px-3 py-1.5 rounded-lg bg-tomato text-cream mt-3"
          >
            {t('onboarding.dismiss')}
          </button>
        </div>
      )}

      <div
        className={
          isFullscreen
            ? 'relative flex flex-col items-center gap-6 w-full max-w-md'
            : 'relative bg-black/20 border border-cream/10 rounded-3xl px-6 sm:px-10 py-10 shadow-lg w-full max-w-md flex flex-col items-center gap-6'
        }
      >
        <div className="absolute top-3 right-3 flex items-center gap-3">
          {!isFullscreen && (
            <button
              type="button"
              onClick={() => setShortcutsModalOpen(true)}
              className="text-sage hover:text-cream text-sm leading-none font-display"
              aria-label={t('timer.keyboardShortcutsTitle')}
              title={t('timer.keyboardShortcutsTitle')}
            >
              ?
            </button>
          )}
          {!isFullscreen && pipSupported && (
            <button
              type="button"
              onClick={togglePip}
              className="text-sage hover:text-cream text-xs leading-none"
              aria-label={pipWindow ? t('timer.closeMiniTimerAria') : t('timer.openMiniTimerAria')}
              title={pipWindow ? t('timer.closeMiniTimerTitle') : t('timer.openMiniTimerTitle')}
            >
              PiP
            </button>
          )}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="text-sage hover:text-cream text-sm leading-none"
            aria-label={isFullscreen ? t('timer.exitFullscreenAria') : t('timer.enterFullscreenAria')}
            title={isFullscreen ? t('timer.exitFullscreenTitle') : t('timer.enterFullscreenTitle')}
          >
            ⛶
          </button>
        </div>

        {!isFullscreen && (
          <div className="flex gap-2">
            {SESSION_ORDER.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleSwitch(type)}
                title={sessionType === type ? undefined : t('timer.switchTo', { label: t(LABEL_KEYS[type]) })}
                className={
                  'font-display text-[11px] tracking-widest uppercase px-4 py-2 rounded-full border ' +
                  (sessionType === type
                    ? 'bg-tomato/15 border-tomato/60 text-tomato'
                    : 'border-cream/15 text-sage hover:border-cream/30')
                }
              >
                {t(LABEL_KEYS[type])}
              </button>
            ))}
          </div>
        )}

        <div className="relative w-60 h-60 sm:w-72 sm:h-72">
          <svg
            viewBox="0 0 100 100"
            className={`w-full h-full ${accentClass} ${pulsing ? 'animate-ring-pulse' : ''}`}
          >
            <circle cx="50" cy="50" r={RADIUS} fill="none" strokeWidth="1.5" className="stroke-cream/10" />
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              strokeWidth="1.5"
              strokeLinecap="round"
              className={ringClass}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 50 50)"
            />
            <circle cx={dotX} cy={dotY} r="2.2" className={dotClass} />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <p className={`font-display text-xs tracking-widest uppercase ${accentClass}`}>
              {t(LABEL_KEYS[sessionType])}
            </p>
            <p className="font-display text-6xl text-cream tracking-tight tabular-nums">
              {formatTime(secondsLeft)}
            </p>
            <div className="flex gap-2">
              {Array.from({ length: cycleLength }, (_, i) => (
                <span
                  key={i}
                  className={
                    'w-2 h-2 rounded-full ' +
                    (i < filledDots ? 'bg-tomato' : 'border border-sage/40')
                  }
                />
              ))}
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sage text-xs font-sans tracking-widest uppercase mb-1">{t('timer.currentTask')}</p>
          {activeTask ? (
            <p className="font-sans text-cream font-semibold">{activeTask.text}</p>
          ) : (
            <div>
              <p className="font-sans text-cream font-semibold">{t('timer.noActiveTask')}</p>
              {!isFullscreen && onGoToPlanning && (
                <button
                  type="button"
                  onClick={onGoToPlanning}
                  className="font-sans text-tomato text-xs underline decoration-dotted mt-1"
                >
                  {t('timer.goToPlanningButton')}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          {!isRunning && (
            <button
              type="button"
              onClick={start}
              className="font-sans px-7 py-3 rounded-full bg-tomato text-cream font-semibold text-sm tracking-wide"
            >
              {t('timer.start')}
            </button>
          )}
          {isRunning && isWork && (
            <button
              type="button"
              onClick={openVoidPrompt}
              className="font-sans px-7 py-3 rounded-full border border-tomato text-tomato font-semibold text-sm tracking-wide"
            >
              {t('timer.voidPomodoro')}
            </button>
          )}
          {!isFullscreen && isRunning && isWork && (
            <button
              type="button"
              onClick={handleFinishEarly}
              className="font-sans px-7 py-3 rounded-full border border-sage text-sage font-semibold text-sm tracking-wide"
            >
              {t('timer.finishPomodoro')}
            </button>
          )}
          {isRunning && !isWork && (
            <button
              type="button"
              onClick={skipBreak}
              className="font-sans px-7 py-3 rounded-full border border-cream/20 text-cream text-sm tracking-wide"
            >
              {t('timer.skipBreak')}
            </button>
          )}
        </div>

        {voidPromptOpen && (
          <form
            onSubmit={confirmVoid}
            className="w-full bg-tomato/5 border border-tomato/20 rounded-xl p-3 flex flex-col gap-2"
          >
            <p className="text-tomato text-xs font-sans">
              {t('timer.voidPanelWarning')}
            </p>
            <label htmlFor="void-reason" className="text-sage text-xs font-sans">
              {t('timer.voidReasonLabel')}
            </label>
            <input
              id="void-reason"
              type="text"
              autoFocus
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder={t('timer.voidReasonPlaceholder')}
              aria-label={t('timer.voidReasonAria')}
              className="bg-cream/5 border border-cream/15 rounded-lg text-cream placeholder:text-sage/50 outline-none focus:border-tomato focus:ring-2 focus:ring-tomato/40 px-3 py-2 text-sm font-sans"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="submit"
                className="font-sans text-xs px-3 py-1.5 rounded-lg bg-tomato text-cream"
              >
                {t('timer.voidPomodoro')}
              </button>
              <button
                type="button"
                onClick={cancelVoid}
                className="font-sans text-xs px-3 py-1.5 rounded-lg border border-cream/20 text-cream"
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        )}

        {isWork && isRunning && (
          <div className="flex flex-col items-center gap-2 pt-4 border-t border-cream/10 w-full">
            <p className="text-sage text-xs font-sans">{t('timer.hadInterruption')}</p>
            <div className="flex gap-3">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => logInterruption('internal')}
                  className="font-sans px-4 py-2 rounded-full border border-cream/15 text-cream text-xs"
                >
                  {t('timer.internalInterruption', { count: internalCount })}
                </button>
                <button
                  type="button"
                  onClick={() => undoInterruption('internal')}
                  disabled={internalCount === 0}
                  className="font-sans w-6 h-6 rounded-full border border-cream/15 text-cream text-xs disabled:opacity-30"
                  aria-label={t('timer.undoInternalAria')}
                >
                  -1
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => logInterruption('external')}
                  className="font-sans px-4 py-2 rounded-full border border-cream/15 text-cream text-xs"
                >
                  {t('timer.externalInterruption', { count: externalCount })}
                </button>
                <button
                  type="button"
                  onClick={() => undoInterruption('external')}
                  disabled={externalCount === 0}
                  className="font-sans w-6 h-6 rounded-full border border-cream/15 text-cream text-xs disabled:opacity-30"
                  aria-label={t('timer.undoExternalAria')}
                >
                  -1
                </button>
              </div>
            </div>
          </div>
        )}

        {!isFullscreen && (
          <div className="flex flex-col items-center gap-2 pt-4 border-t border-cream/10 w-full">
            <p className="text-sage text-xs font-sans">{t('timer.unplannedPrompt')}</p>
            <UnplannedCapture addTask={addTask} className="w-full" />
          </div>
        )}
      </div>

      {pipWindow &&
        createPortal(
          <div
            className={`w-full h-full flex flex-col items-center justify-center gap-2 bg-pine ${theme === 'light' ? 'light' : ''}`}
          >
            <p className={`font-display text-xs tracking-widest uppercase ${accentClass}`}>
              {t(LABEL_KEYS[sessionType])}
            </p>
            <p className="font-display text-5xl text-cream tracking-tight tabular-nums">
              {formatTime(secondsLeft)}
            </p>
          </div>,
          pipWindow.document.body
        )}

      {shortcutsModalOpen && (
        <KeyboardShortcutsModal onClose={() => setShortcutsModalOpen(false)} />
      )}
    </div>
  )
}

export default Timer
