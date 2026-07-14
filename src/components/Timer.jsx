import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import UnplannedCapture from './UnplannedCapture'
import KeyboardShortcutsModal from './KeyboardShortcutsModal'
import CoachMark from './CoachMark'
import { isPipSupported, copyStylesToWindow, fillPipDocument } from '../lib/pip'
import { useTranslation } from '../hooks/useTranslation'
import { useFullscreenBackgroundUrl } from '../hooks/useFullscreenBackgroundUrl'
import { themeClassName } from '../lib/theme'
import { pickCoachMark } from '../lib/constants'

const RING_PULSE_MS = 500

// Fullscreen Focus Mode's auto-hiding chrome (YouTube-style): how long the
// mouse can sit still, with no shortcut pressed, before controls fade out.
const FULLSCREEN_IDLE_HIDE_MS = 2500

const LABEL_KEYS = {
  work: 'timer.focus',
  shortBreak: 'timer.shortBreak',
  longBreak: 'timer.longBreak',
}

const SESSION_ORDER = ['work', 'shortBreak', 'longBreak']

// Short Break and Long Break used to both render in --color-amber — the
// same color for two different states, and (per index.css's note on these
// tokens) amber's contrast against every light theme is poor. Each session
// type now has its own dedicated, distinct, per-theme-tuned color. Written
// out as literal class-name strings (not built with a template like
// `text-${name}`) so Tailwind's build-time scanner — which looks for
// verbatim class-like substrings in source, not runtime-computed ones —
// actually generates these utilities.
const SESSION_COLORS = {
  work: {
    accent: 'text-focus',
    ring: 'stroke-focus',
    dot: 'fill-focus',
    pillActive: 'bg-focus/15 border-focus/60 text-focus',
  },
  shortBreak: {
    accent: 'text-short-break',
    ring: 'stroke-short-break',
    dot: 'fill-short-break',
    pillActive: 'bg-short-break/15 border-short-break/60 text-short-break',
  },
  longBreak: {
    accent: 'text-long-break',
    ring: 'stroke-long-break',
    dot: 'fill-long-break',
    pillActive: 'bg-long-break/15 border-long-break/60 text-long-break',
  },
}

const RADIUS = 46
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

// Fullscreen Focus Mode's auto-hiding chrome needs to both fade out AND
// collapse to zero height so the ring can recenter in the freed space (the
// content wrapper's flex `gap` is symmetric once both this and its sibling
// chrome block collapse, so the ring ends up dead-center for free — see
// Timer's own render below). A plain max-height/height transition can't
// animate to/from an intrinsic "auto" size, but a single-row CSS grid track
// can animate between 0fr and 1fr (the standard "grid accordion" trick),
// which is what the outer wrapper here does; the inner div layers an
// independent opacity fade on top so content visibly dims rather than just
// clipping away. Only ever rendered while isFullscreen — the normal Timer
// view never mounts this at all.
function CollapsibleChrome({ visible, children }) {
  return (
    <div
      className={`w-full grid transition-[grid-template-rows] duration-300 ease-in-out ${
        visible ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
      }`}
    >
      <div className="overflow-hidden">
        <div
          className={`transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          inert={!visible}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

// Purely presentational — usePomodoro is instantiated once in App.jsx (not
// here) so the countdown keeps running and is controllable from the Settings
// tab even while the Timer tab isn't the one showing.
function Timer({
  activeTask,
  addTask,
  theme,
  onGoToPlanning,
  onNavigateTab,
  fullscreenBackgroundPath,
  seenCoachMarks,
  onDismissCoachMark,
  onLearnMoreCoachMark,
  coachMarksSuppressed,
  sessionType,
  secondsLeft,
  isRunning,
  completedPomodoros,
  internalCount,
  externalCount,
  pauseCount,
  completionPulseKey,
  cycleLength,
  workMinutes,
  shortBreakMinutes,
  longBreakMinutes,
  start,
  pause,
  voidPomodoro,
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

  // Custom Fullscreen Focus Mode background (signed-in users only — see
  // backgroundStorage.js/SettingsModal.jsx). Only resolved while actually
  // fullscreen: the bucket is private, so this is a fresh signed URL each
  // time, not a value read straight off settings.
  const backgroundUrl = useFullscreenBackgroundUrl(fullscreenBackgroundPath, isFullscreen)

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

  // The PiP window's title bar is native browser/OS chrome — Document PiP
  // gives no API to remove or restyle it (only a favicon, page title, and
  // close button, the same minimal frame every such window gets, by
  // design, so the user always has an obvious way to identify and close
  // it). Since it can't be removed, the next best thing is making it
  // useful: mirroring the main tab's own title convention means the
  // countdown is still readable even if the mini window is occluded or the
  // user only glances at its title bar instead of the content.
  useEffect(() => {
    if (!pipWindow) return
    pipWindow.document.title = isRunning
      ? `${formatTime(secondsLeft)} · ${t(LABEL_KEYS[sessionType])}`
      : defaultTitle
  }, [pipWindow, isRunning, secondsLeft, sessionType, defaultTitle, t])

  async function togglePip() {
    if (pipWindow) {
      pipWindow.close()
      return
    }
    if (pipRequestInFlightRef.current) return
    pipRequestInFlightRef.current = true
    try {
      // width/height are a starting size, not a cap — the browser still
      // lets the user resize afterward. The old 220×160 left barely any
      // room around the countdown digits at their existing font size,
      // forcing a manual resize on every open; this is comfortable enough
      // to not need one immediately.
      const pip = await window.documentPictureInPicture.requestWindow({ width: 400, height: 300 })
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
  const sessionColors = SESSION_COLORS[sessionType]
  const accentClass = sessionColors.accent
  const ringClass = sessionColors.ring
  const dotClass = sessionColors.dot

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

  // Fullscreen Focus Mode's auto-hiding chrome (YouTube-style): after
  // FULLSCREEN_IDLE_HIDE_MS of no mouse movement and no keyboard shortcut,
  // every control fades out (see CollapsibleChrome above) and the ring
  // recenters in the freed space. Only active while isFullscreen — normal
  // Timer view never touches controlsVisible at all. Refs (not state) back
  // the "don't hide while a dialog needs the user's attention" check inside
  // the timeout callback below: that callback is scheduled once and fires
  // later, so it must read the *current* dialog state at fire time, not
  // whatever was true when it was scheduled — a plain closure over the
  // voidPromptOpen/shortcutsModalOpen state variables would go stale.
  const [controlsVisible, setControlsVisible] = useState(true)
  const hideControlsTimeoutRef = useRef(null)
  const voidPromptOpenRef = useRef(voidPromptOpen)
  const shortcutsModalOpenRef = useRef(shortcutsModalOpen)

  useEffect(() => {
    voidPromptOpenRef.current = voidPromptOpen
  }, [voidPromptOpen])

  useEffect(() => {
    shortcutsModalOpenRef.current = shortcutsModalOpen
  }, [shortcutsModalOpen])

  function clearHideControlsTimeout() {
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current)
      hideControlsTimeoutRef.current = null
    }
  }

  function wakeControls() {
    setControlsVisible(true)
    clearHideControlsTimeout()
    hideControlsTimeoutRef.current = setTimeout(() => {
      // A dialog that needs the user's attention (void reason, shortcuts
      // reference) suppresses hiding entirely — reading it here (not at
      // schedule time) is what makes that correct even if the dialog opened
      // after this timeout was already scheduled.
      if (voidPromptOpenRef.current || shortcutsModalOpenRef.current) return
      setControlsVisible(false)
    }, FULLSCREEN_IDLE_HIDE_MS)
  }

  useEffect(() => {
    if (!isFullscreen) {
      setControlsVisible(true)
      clearHideControlsTimeout()
      return
    }
    wakeControls()
    function handleMouseMove() {
      wakeControls()
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      clearHideControlsTimeout()
    }
  }, [isFullscreen])

  // A session that's idle with 0 < secondsLeft < its full duration can only
  // be in that state because pause() left it there — a fresh/just-switched
  // session always starts at the full duration. Used to relabel the Start
  // button "Resume" (see docs/methodology.md's Rule 2 section and
  // usePomodoro.js's pause() for why Pause exists as a deliberate deviation).
  const isPaused = !isRunning && secondsLeft > 0 && secondsLeft < sessionDuration

  // Running an untracked Pomodoro (no active task selected) means its
  // Pomodoros won't be attributable to anything in estimate-vs-actual
  // tracking — worth flagging, but not worth blocking on: the user may
  // genuinely want a task-free Pomodoro, and forcing a trip to Planning
  // first was friction without a corresponding rule in methodology.md.
  const noActiveTaskForWork = isWork && !activeTask

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
      // Any keyboard activity counts as "not idle," same as mouse movement
      // — checked before the input/textarea early-return below so typing
      // into the void-reason field also keeps the chrome awake.
      if (isFullscreen) wakeControls()

      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return

      if (e.code === 'Space') {
        e.preventDefault()
        if (isRunning) pause()
        else start()
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
      // 'F' toggles Fullscreen Focus Mode.
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen()
        return
      }
      // 'S' skips the current break early — mirrors the Skip break button,
      // which only ever renders for a running break session.
      if ((e.key === 's' || e.key === 'S') && isRunning && !isWork) {
        skipBreak()
        return
      }
      // '?' opens the keyboard-shortcuts reference (also reachable via the
      // small icon button next to Fullscreen/PiP).
      if (e.key === '?') {
        setShortcutsModalOpen(true)
        return
      }
      // T/P/R jump between tabs. Deliberately not the bare 1/2/3 keys removed
      // above for session switching (Focus/Short Break/Long Break) — that
      // was a different action in a different scope, and reusing the same
      // keys here would be confusing. Suppressed in Fullscreen Focus Mode:
      // that mode's entire point is hiding navigation chrome, and jumping
      // tabs wouldn't even look right, since fullscreen is requested on this
      // component's own container, not the other tabs' panels.
      if (!isFullscreen && onNavigateTab) {
        if (e.key === 't' || e.key === 'T') {
          onNavigateTab('timer')
          return
        }
        if (e.key === 'p' || e.key === 'P') {
          onNavigateTab('planning')
          return
        }
        if (e.key === 'r' || e.key === 'R') {
          onNavigateTab('reports')
          return
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  // Extracted so both regions can be rendered either plain (normal Timer
  // view — identical output to before this feature existed, since Fragments
  // add no DOM node of their own) or wrapped in CollapsibleChrome (Fullscreen
  // Focus Mode only) without duplicating their JSX.
  const iconRowRegion = (
    <div className="w-full flex flex-col items-center gap-3 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-0">
      <div className="hidden sm:block sm:col-start-1" aria-hidden="true" />

      {!isFullscreen && (
        <div className="flex gap-2 order-2 sm:order-none sm:col-start-2 sm:justify-self-center">
          {SESSION_ORDER.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleSwitch(type)}
              title={sessionType === type ? undefined : t('timer.switchTo', { label: t(LABEL_KEYS[type]) })}
              className={
                'font-display text-[11px] tracking-widest uppercase px-4 py-2 rounded-full border ' +
                (sessionType === type
                  ? SESSION_COLORS[type].pillActive
                  : 'border-cream/15 text-sage hover:border-cream/30')
              }
            >
              {t(LABEL_KEYS[type])}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 justify-end w-full order-1 sm:order-none sm:w-auto sm:col-start-3 sm:justify-self-end">
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
    </div>
  )

  const chromeBelowRingRegion = (
    <>
      <div className="text-center flex flex-col items-center gap-3">
        <div>
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

      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-3">
          {!isRunning && (
            <button
              type="button"
              onClick={start}
              className="font-sans px-10 py-4 rounded-full bg-tomato text-cream font-semibold text-base tracking-wide"
            >
              {isPaused ? t('timer.resume') : t('timer.start')}
            </button>
          )}
          {isRunning && (
            <button
              type="button"
              onClick={pause}
              className="font-sans px-7 py-3 rounded-full border border-sage text-sage font-semibold text-sm tracking-wide"
            >
              {t('timer.pause')}
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

        {/* Informational, not blocking — Start stays clickable with no
            active task (see noActiveTaskForWork above); this just makes
            the tradeoff visible so the choice is a conscious one. Only
            shown pre-start, since once running the moment for that
            choice has passed. */}
        {!isRunning && noActiveTaskForWork && (
          <p className="text-sage text-xs font-sans text-center max-w-xs">
            {t('timer.noTaskStartHint')}
          </p>
        )}

        {/* Subtle, non-alarming — mirrors the interruption counters'
            treatment. Shown whenever this session has been paused at
            least once, even after Pause is pressed again (isRunning
            false), so the count doesn't disappear the moment it's most
            relevant to see. */}
        {pauseCount > 0 && (
          <p className="text-sage text-xs font-sans">{t('timer.pauseCount', { count: pauseCount })}</p>
        )}

        {/* Softened on purpose — voiding is the "give up on this one"
            path, so it shouldn't carry the same visual weight as Start
            (previously an equally-bold tomato-bordered pill sitting right
            next to it). A quiet underlined link reads as secondary
            without hiding the control. */}
        {isRunning && isWork && (
          <button
            type="button"
            onClick={openVoidPrompt}
            className="font-sans text-xs text-sage hover:text-tomato underline decoration-dotted underline-offset-4 transition-colors"
          >
            {t('timer.voidPomodoro')}
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
    </>
  )

  // Which (if any) of Timer's coach marks should show right now — see
  // constants.js's pickCoachMark: the intro fires on first visit (no extra
  // condition), the rest only once the user has actually reached that moment
  // (a work session running, having just logged an interruption, a break
  // session running), so they naturally appear later in a real session
  // rather than all at once. 'timer-first-interruption' is what teaches a
  // brand-new user what the internal/external counters even are, *before*
  // Reports' interruption-trend marks (which assume the concept is already
  // known) can show — see coachMarks.reportsIntro/reportsFirstData.
  const timerCoachMark = coachMarksSuppressed
    ? null
    : pickCoachMark('timer', seenCoachMarks, {
        'timer-first-start': isRunning && sessionType === 'work',
        'timer-first-interruption': internalCount > 0 || externalCount > 0,
        'timer-first-break': isRunning && sessionType !== 'work',
      })

  return (
    <div
      ref={containerRef}
      className={
        isFullscreen
          ? 'relative bg-pine w-full h-full flex items-center justify-center p-6'
          : 'flex flex-col items-center gap-6 w-full'
      }
      style={
        isFullscreen && backgroundUrl
          ? { backgroundImage: `url(${backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : undefined
      }
    >
      {!isFullscreen && timerCoachMark && (
        <CoachMark
          titleKey={timerCoachMark.titleKey}
          bodyKey={timerCoachMark.bodyKey}
          onDismiss={() => onDismissCoachMark(timerCoachMark.id)}
          onLearnMore={() => onLearnMoreCoachMark(timerCoachMark.id)}
          className="max-w-xl"
        />
      )}

      {/* No card/border here on purpose — mockup 06's calmer direction has
          the ring and controls sitting directly on the page background,
          not boxed. `relative` is kept only as the positioning anchor for
          the PiP/fullscreen/help icons in the corner. */}
      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-xl py-4">
        {/* True 3-column layout at `sm`+ (spacer / pills / icons) so the
            pills land centered relative to the full row width, with the
            icon cluster balanced symmetrically in its own right-hand
            column — the previous absolute-positioned icon row had nothing
            matching it on the left, which read as lopsided. Below `sm`,
            falls back to two stacked rows (icons above pills, via the
            order-1/order-2 pair) since there isn't room for three columns
            side by side on a phone. In Fullscreen Focus Mode this whole
            region fades/collapses on inactivity (see controlsVisible). */}
        {isFullscreen ? (
          <CollapsibleChrome visible={controlsVisible}>{iconRowRegion}</CollapsibleChrome>
        ) : (
          iconRowRegion
        )}

        <div className="relative w-64 h-64 sm:w-80 sm:h-80">
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
            <p className="font-display text-7xl text-cream tracking-tight tabular-nums">
              {formatTime(secondsLeft)}
            </p>
          </div>
        </div>

        {/* Task info, controls, void panel, and interruption buttons all
            fade/collapse together in Fullscreen Focus Mode on inactivity —
            same controlsVisible-driven behavior as the icon row above. */}
        {isFullscreen ? (
          <CollapsibleChrome visible={controlsVisible}>
            <div className="flex flex-col items-center gap-8 w-full">{chromeBelowRingRegion}</div>
          </CollapsibleChrome>
        ) : (
          chromeBelowRingRegion
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
            className={`w-full h-full flex flex-col items-center justify-center gap-2 bg-pine ${themeClassName(theme)}`}
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
