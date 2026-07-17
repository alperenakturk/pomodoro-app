import { useState, useEffect, useCallback, useRef } from 'react'
import {
  addTick,
  removeLastTick,
  loadSettings,
  patchSettings,
  loadTimerState,
  saveTimerState,
} from '../lib/storage'
import {
  unlockAudio,
  playChime,
  playPing,
  requestNotificationPermission,
  notify,
  setEffectsVolume as setAlertEffectsVolume,
  setAmbientVolume as setAlertAmbientVolume,
  startAmbientSound,
  stopAmbientSound,
} from '../lib/alert'
import { translate } from '../lib/i18n'

export const DEFAULT_CYCLE_LENGTH = 4

// Unlike short/long break, the Pomodoro Technique's 25-minute work interval
// has no "recommended range" in this app — it's freely adjustable. Only a
// sane absolute ceiling/floor guards against a broken timer (e.g. 0 or
// unreasonably long); SettingsModal shows an informational (non-blocking) note
// whenever the value differs from the standard 25, rather than a
// recommended-range hint like the break durations get.
export const DEFAULT_WORK_MINUTES = 25
export const WORK_MIN = 1
export const WORK_MAX = 180

// Rule 3: short break 3-5 min recommended, long break 15-30 min recommended
// (docs/methodology.md). Min/max are hard bounds the input enforces; the
// recommended range is only ever surfaced as a non-blocking hint in
// SettingsModal — values outside it are still valid and fully allowed.
export const DEFAULT_SHORT_BREAK_MINUTES = 5
export const SHORT_BREAK_MIN = 3
export const SHORT_BREAK_MAX = 10
export const SHORT_BREAK_RECOMMENDED_MAX = 5

export const DEFAULT_LONG_BREAK_MINUTES = 15
export const LONG_BREAK_MIN = 15
export const LONG_BREAK_MAX = 60
export const LONG_BREAK_RECOMMENDED_MAX = 30

function todayString() {
  return new Date().toISOString().slice(0, 10)
}

// `t` defaults to a plain English lookup (bypassing the LanguageContext
// entirely) so this hook stays usable standalone — same reasoning as the
// onWorkComplete/onInterruption/onVoid callbacks below: usePomodoro doesn't
// otherwise know about cross-cutting concerns, App.jsx supplies the real
// translator from useTranslation() since it does.
export function usePomodoro({ onWorkComplete, onInterruption, onVoid, t = (key, vars) => translate('en', key, vars) } = {}) {
  // Restored on mount so a refresh doesn't lose a session in progress. If a
  // countdown was actually running when the page closed/reloaded, secondsLeft
  // is recomputed from the persisted `endAt` timestamp against the current
  // wall clock — not trusted literally — so real time that passed while the
  // tab was gone (closed, or just heavily throttled in the background)
  // isn't silently dropped. See the endAtRef/interval effect below for why
  // this matters even while the tab stays open.
  const restored = loadTimerState()
  const [sessionType, setSessionType] = useState(() => restored?.sessionType ?? 'work')
  const [secondsLeft, setSecondsLeft] = useState(() => {
    if (restored?.isRunning && restored?.endAt) {
      return Math.max(0, Math.round((restored.endAt - Date.now()) / 1000))
    }
    return restored?.secondsLeft ?? loadSettings().workMinutes * 60
  })
  const [isRunning, setIsRunning] = useState(() => restored?.isRunning ?? false)
  // Not React state — read/written inside the once-a-second interval tick,
  // which only needs the latest value, not a re-render of its own. Wall-
  // clock timestamp (Date.now() + secondsLeft*1000) for exactly when the
  // running countdown should reach 0; recomputing secondsLeft from this each
  // tick (rather than decrementing the previous value) means a throttled or
  // delayed tick still lands on the correct remaining time instead of
  // compounding lost ticks into permanent drift.
  const endAtRef = useRef(restored?.isRunning && restored?.endAt ? restored.endAt : null)
  // True only right after pause() — distinguishes "idle because paused
  // mid-session" from "idle because never started/just transitioned",
  // which the idle-resync effect below needs: a paused session's partial
  // secondsLeft must survive that effect, while a genuinely fresh idle
  // session should still pick up duration-setting changes immediately.
  const pausedRef = useRef(false)
  const [completedPomodoros, setCompletedPomodoros] = useState(0)
  const [internalCount, setInternalCount] = useState(0)
  const [externalCount, setExternalCount] = useState(0)
  // How many times the *current* session (work or break) has been paused —
  // reset to 0 at every transition to a fresh session (see completeWork/
  // completeBreak/skipBreak/switchSession/voidPomodoro below). Purely a
  // live/session-scoped display counter; the historical record for Reports
  // is the 'pause' tick pause() also writes.
  const [pauseCount, setPauseCount] = useState(0)
  // Whether the motivation card (MotivationOverlay) has already been drawn
  // since the last completed Pomodoro. Reset to false in ONE place only —
  // completeWork(), when a work session genuinely finishes — and nowhere
  // else. An earlier version reset it in start() (any fresh, non-resume
  // work-session start), which was wrong on inspection: skipping a break,
  // voiding a Pomodoro, or just reloading the page all end up back at an
  // idle fresh work session, and starting *that* new session isn't the
  // same thing as having *completed* one. Per the product rule — "the
  // only, unconditional way to draw again is finishing one full Pomodoro"
  // — completion is the sole trigger, so this must also be persisted
  // (unlike pauseCount/completionPulseKey, which are deliberately session-
  // only): restored from pomodoro_timer_state on mount so a reload can't
  // be used to bypass the limit either.
  const [motivationCardUsed, setMotivationCardUsed] = useState(() => restored?.motivationCardUsed ?? false)
  const markMotivationCardUsed = useCallback(() => setMotivationCardUsed(true), [])
  // Bumped only when a Pomodoro (work session) actually completes — Timer.jsx
  // watches this to trigger a brief one-shot ring-pulse animation. A counter
  // rather than a boolean so consecutive completions each retrigger the
  // effect even if a render happens to land between them.
  const [completionPulseKey, setCompletionPulseKey] = useState(0)
  // Rule 3: normalde her 4 pomodorodan sonra long break gelir, ama kullanıcı
  // bu oranı kendi çalışma ritmine göre ayarlayabilir.
  const [cycleLength, setCycleLengthState] = useState(
    () => loadSettings().cycleLength
  )

  const setCycleLength = useCallback((n) => {
    const value = Math.max(1, Math.round(n) || DEFAULT_CYCLE_LENGTH)
    setCycleLengthState(value)
    patchSettings({ cycleLength: value })
  }, [])

  const resetCycleLength = useCallback(() => {
    setCycleLengthState(DEFAULT_CYCLE_LENGTH)
    patchSettings({ cycleLength: DEFAULT_CYCLE_LENGTH })
  }, [])

  const [shortBreakMinutes, setShortBreakMinutesState] = useState(
    () => loadSettings().shortBreakMinutes
  )
  const setShortBreakMinutes = useCallback((n) => {
    const rounded = Math.round(n) || DEFAULT_SHORT_BREAK_MINUTES
    const value = Math.min(SHORT_BREAK_MAX, Math.max(SHORT_BREAK_MIN, rounded))
    setShortBreakMinutesState(value)
    patchSettings({ shortBreakMinutes: value })
  }, [])

  const [longBreakMinutes, setLongBreakMinutesState] = useState(
    () => loadSettings().longBreakMinutes
  )
  const setLongBreakMinutes = useCallback((n) => {
    const rounded = Math.round(n) || DEFAULT_LONG_BREAK_MINUTES
    const value = Math.min(LONG_BREAK_MAX, Math.max(LONG_BREAK_MIN, rounded))
    setLongBreakMinutesState(value)
    patchSettings({ longBreakMinutes: value })
  }, [])

  // Freely adjustable — no recommended-range clamp, just the sane absolute
  // WORK_MIN/WORK_MAX bounds (see the comment on those constants above).
  const [workMinutes, setWorkMinutesState] = useState(() => loadSettings().workMinutes)
  const setWorkMinutes = useCallback((n) => {
    const rounded = Math.round(n) || DEFAULT_WORK_MINUTES
    const value = Math.min(WORK_MAX, Math.max(WORK_MIN, rounded))
    setWorkMinutesState(value)
    patchSettings({ workMinutes: value })
  }, [])

  // "Auto-start breaks"/"Auto-start Pomodoros" — both default off, preserving
  // the existing manual-Start behavior unless the user opts in. Consulted in
  // completeWork/completeBreak/skipBreak below.
  const [autoStartBreaks, setAutoStartBreaksState] = useState(
    () => loadSettings().autoStartBreaks
  )
  const setAutoStartBreaks = useCallback((value) => {
    setAutoStartBreaksState(value)
    patchSettings({ autoStartBreaks: value })
  }, [])

  const [autoStartPomodoros, setAutoStartPomodorosState] = useState(
    () => loadSettings().autoStartPomodoros
  )
  const setAutoStartPomodoros = useCallback((value) => {
    setAutoStartPomodorosState(value)
    patchSettings({ autoStartPomodoros: value })
  }, [])

  const [chimeStyle, setChimeStyleState] = useState(() => loadSettings().chimeStyle)

  const setChimeStyle = useCallback((style) => {
    setChimeStyleState(style)
    patchSettings({ chimeStyle: style })
  }, [])

  // 0-100, applied to the completion sounds only (chime/ping/task-complete) —
  // see alert.js's setEffectsVolume. Kept as a separate setting/slider from
  // ambientVolume below so a user can e.g. run ambient sound quietly in the
  // background while completion chimes stay at full volume, or vice versa.
  const [soundVolume, setSoundVolumeState] = useState(() => loadSettings().soundVolume)
  const setSoundVolume = useCallback((n) => {
    const value = Math.min(100, Math.max(0, Math.round(n)))
    setSoundVolumeState(value)
    patchSettings({ soundVolume: value })
  }, [])
  useEffect(() => {
    setAlertEffectsVolume(soundVolume)
  }, [soundVolume])

  // 0-100, applied only to the ambient background bed (ticking/rain/cafe/
  // whiteNoise) — see alert.js's setAmbientVolume. Independent of
  // soundVolume above.
  const [ambientVolume, setAmbientVolumeState] = useState(() => loadSettings().ambientVolume)
  const setAmbientVolume = useCallback((n) => {
    const value = Math.min(100, Math.max(0, Math.round(n)))
    setAmbientVolumeState(value)
    patchSettings({ ambientVolume: value })
  }, [])
  useEffect(() => {
    setAlertAmbientVolume(ambientVolume)
  }, [ambientVolume])

  // Ambient background sound during an active work session only — see the
  // effect below that starts/stops it based on isRunning/sessionType. One of
  // alert.js's AMBIENT_SOUNDS ('none' default, 'ticking', 'rain', 'cafe',
  // 'whiteNoise').
  const [ambientSound, setAmbientSoundState] = useState(() => loadSettings().ambientSound)
  const setAmbientSound = useCallback((value) => {
    setAmbientSoundState(value)
    patchSettings({ ambientSound: value })
  }, [])

  useEffect(() => {
    if (ambientSound !== 'none' && isRunning && sessionType === 'work') {
      startAmbientSound(ambientSound)
    } else {
      stopAmbientSound()
    }
    return () => stopAmbientSound()
  }, [ambientSound, isRunning, sessionType])

  useEffect(() => {
    saveTimerState({ sessionType, secondsLeft, isRunning, endAt: endAtRef.current, motivationCardUsed })
  }, [sessionType, secondsLeft, isRunning, motivationCardUsed])

  useEffect(() => {
    if (!isRunning) return
    const intervalId = setInterval(() => {
      const remaining = endAtRef.current ? Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000)) : 0
      setSecondsLeft(remaining)
    }, 1000)
    return () => clearInterval(intervalId)
  }, [isRunning])

  // Keeps an *idle* countdown's displayed duration in sync with the current
  // setting even before the next natural transition — e.g. changing the
  // work duration while sitting on an un-started work session should apply
  // the next time Start is pressed, not silently run the old duration for
  // one more cycle. A session that's actually running is never resized out
  // from under the user (guarded by isRunning). Harmless no-op the rest of
  // the time: every transition (completeWork/completeBreak/skipBreak/
  // switchSession) already sets secondsLeft to this same value itself, so
  // this effect re-applies an identical value on the renders that follow.
  useEffect(() => {
    if (isRunning || pausedRef.current) return
    setSecondsLeft(
      sessionType === 'work'
        ? workMinutes * 60
        : sessionType === 'longBreak'
          ? longBreakMinutes * 60
          : shortBreakMinutes * 60
    )
  }, [isRunning, sessionType, workMinutes, shortBreakMinutes, longBreakMinutes])

  // Sadece zil çaldığında (secondsLeft === 0) tetiklenir — Rule 2 gereği artık
  // erken bitirme yolu yok (bkz. kaldırılan finishEarly/"Finish Pomodoro").
  const completeWork = useCallback(() => {
    setIsRunning(false)
    endAtRef.current = null
    // Per methodology, a "Pomodoro" is specifically the work session — breaks
    // aren't Pomodoros — so the ping + ring-pulse (Pomodoro completion feedback)
    // live only here, not in completeBreak. playChime is the separate,
    // user-configurable "time to switch" notification and still fires for both.
    playPing()
    playChime(chimeStyle)
    setCompletionPulseKey((k) => k + 1)
    const newCount = completedPomodoros + 1
    setCompletedPomodoros(newCount)
    setPauseCount(0)
    // The one and only place motivationCardUsed resets — see its own
    // declaration comment above for why every other transition (start,
    // skip, void, reload) deliberately leaves it alone.
    setMotivationCardUsed(false)
    pausedRef.current = false
    addTick({
      id: crypto.randomUUID(),
      type: 'pomodoro',
      date: todayString(),
      timestamp: new Date().toISOString(),
    })
    onWorkComplete && onWorkComplete()
    const nextType = newCount % cycleLength === 0 ? 'longBreak' : 'shortBreak'
    notify(
      t('notifications.pomodoroCompleteTitle'),
      nextType === 'longBreak' ? t('notifications.longBreakBody') : t('notifications.shortBreakBody')
    )
    setSessionType(nextType)
    const nextDuration = nextType === 'longBreak' ? longBreakMinutes * 60 : shortBreakMinutes * 60
    setSecondsLeft(nextDuration)
    if (autoStartBreaks) {
      endAtRef.current = Date.now() + nextDuration * 1000
      setIsRunning(true)
    }
  }, [
    completedPomodoros,
    cycleLength,
    onWorkComplete,
    chimeStyle,
    t,
    shortBreakMinutes,
    longBreakMinutes,
    autoStartBreaks,
  ])

  const completeBreak = useCallback(() => {
    setIsRunning(false)
    endAtRef.current = null
    playChime(chimeStyle)
    // Rule 3: the pomodoro count resets only when a long break ends.
    if (sessionType === 'longBreak') setCompletedPomodoros(0)
    setPauseCount(0)
    pausedRef.current = false
    // Mirrors completeWork's addTick call — breaks previously wrote no tick
    // at all, leaving cumulative break-time achievements with no data source.
    addTick({
      id: crypto.randomUUID(),
      type: sessionType === 'longBreak' ? 'break-long' : 'break-short',
      date: todayString(),
      timestamp: new Date().toISOString(),
    })
    notify(t('notifications.breakOverTitle'), t('notifications.backToWorkBody'))
    setSessionType('work')
    setSecondsLeft(workMinutes * 60)
    if (autoStartPomodoros) {
      endAtRef.current = Date.now() + workMinutes * 60 * 1000
      setIsRunning(true)
    }
  }, [sessionType, chimeStyle, t, workMinutes, autoStartPomodoros])

  useEffect(() => {
    if (secondsLeft !== 0 || !isRunning) return
    if (sessionType === 'work') completeWork()
    else completeBreak()
  }, [secondsLeft, isRunning, sessionType, completeWork, completeBreak])

  // Also doubles as "resume" after pause() — secondsLeft already holds
  // however much time was left when paused (pause() doesn't reset it), so
  // recomputing endAt from the *current* secondsLeft is correct for both a
  // fresh start and a resume, with no separate resume() needed.
  const start = useCallback(() => {
    unlockAudio()
    requestNotificationPermission()
    endAtRef.current = Date.now() + secondsLeft * 1000
    pausedRef.current = false
    setIsRunning(true)
  }, [secondsLeft])

  // Rule 2 deviation, made deliberately: real Pomodoro sessions do get
  // interrupted by things a user needs to genuinely step away for, and
  // pretending that never happens (by offering only Void, which throws the
  // whole session away) isn't more faithful to the method, just less
  // honest about how people actually use it. Pausing keeps the same
  // session running (no X lost, no reason-journal entry needed) but is
  // tracked openly — a per-session counter (pauseCount, reset at every
  // fresh session) plus a 'pause' tick for Reports — so "I paused a lot
  // today" stays visible instead of being a silent, unmeasured escape
  // hatch. See docs/methodology.md's Rule 2 section for the same note.
  const pause = useCallback(() => {
    if (!isRunning) return
    const remaining = endAtRef.current ? Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000)) : secondsLeft
    setSecondsLeft(remaining)
    endAtRef.current = null
    pausedRef.current = true
    setIsRunning(false)
    setPauseCount((c) => c + 1)
    addTick({
      id: crypto.randomUUID(),
      type: 'pause',
      date: todayString(),
      timestamp: new Date().toISOString(),
    })
  }, [isRunning, secondsLeft])

  // Rule 1: voiding only applies to a Pomodoro (work session) — it resets
  // the timer as if it never started and writes no tick, so no X is recorded.
  // The interruption marker itself is still logged elsewhere (logInterruption);
  // this is a separate, optional journal entry — task/category/elapsed time
  // and an optional free-text reason — for daily self-observation only (per
  // methodology, never fed into Reports as an aggregated metric).
  const voidPomodoro = useCallback(
    (reason = '') => {
      if (sessionType !== 'work') return
      const elapsedSeconds = workMinutes * 60 - secondsLeft
      onVoid && onVoid({ reason, elapsedSeconds })
      setIsRunning(false)
      endAtRef.current = null
      setSecondsLeft(workMinutes * 60)
      setPauseCount(0)
    pausedRef.current = false
    },
    [sessionType, secondsLeft, onVoid, workMinutes]
  )

  // Breaks aren't Pomodoros, so ending one early is a "skip" straight to
  // the next work session, not a "void". Still honors autoStartPomodoros —
  // from the user's perspective this is still "a break ending," just early.
  const skipBreak = useCallback(() => {
    if (sessionType === 'work') return
    setIsRunning(false)
    endAtRef.current = null
    if (sessionType === 'longBreak') setCompletedPomodoros(0)
    setPauseCount(0)
    pausedRef.current = false
    setSessionType('work')
    setSecondsLeft(workMinutes * 60)
    if (autoStartPomodoros) {
      endAtRef.current = Date.now() + workMinutes * 60 * 1000
      setIsRunning(true)
    }
  }, [sessionType, workMinutes, autoStartPomodoros])

  // Kullanıcı istediği an work/short break/long break arasında manuel geçiş
  // yapabilir. Bir work session'ından çıkılıyorsa bu bir void'dür (X yazılmaz) —
  // onay Timer.jsx tarafında isteniyor.
  const switchSession = useCallback(
    (type) => {
      if (type === sessionType) return
      setIsRunning(false)
      endAtRef.current = null
      setPauseCount(0)
    pausedRef.current = false
      setSessionType(type)
      setSecondsLeft(
        type === 'work' ? workMinutes * 60 : type === 'longBreak' ? longBreakMinutes * 60 : shortBreakMinutes * 60
      )
    },
    [sessionType, workMinutes, shortBreakMinutes, longBreakMinutes]
  )

  const logInterruption = useCallback(
    (kind) => {
      addTick({
        id: crypto.randomUUID(),
        type: kind === 'internal' ? 'interruption-internal' : 'interruption-external',
        date: todayString(),
        timestamp: new Date().toISOString(),
      })
      if (kind === 'internal') setInternalCount((c) => c + 1)
      else setExternalCount((c) => c + 1)
      onInterruption && onInterruption(kind, 1)
    },
    [onInterruption]
  )

  // Yanlışlıkla eklenen bir kesintiyi geri alır — sayaç 0'ın altına inmez.
  const undoInterruption = useCallback(
    (kind) => {
      const count = kind === 'internal' ? internalCount : externalCount
      if (count <= 0) return
      removeLastTick(kind === 'internal' ? 'interruption-internal' : 'interruption-external')
      if (kind === 'internal') setInternalCount((c) => c - 1)
      else setExternalCount((c) => c - 1)
      onInterruption && onInterruption(kind, -1)
    },
    [internalCount, externalCount, onInterruption]
  )

  return {
    sessionType,
    secondsLeft,
    isRunning,
    completedPomodoros,
    internalCount,
    externalCount,
    pauseCount,
    motivationCardUsed,
    markMotivationCardUsed,
    completionPulseKey,
    cycleLength,
    setCycleLength,
    resetCycleLength,
    workMinutes,
    setWorkMinutes,
    shortBreakMinutes,
    setShortBreakMinutes,
    longBreakMinutes,
    setLongBreakMinutes,
    autoStartBreaks,
    setAutoStartBreaks,
    autoStartPomodoros,
    setAutoStartPomodoros,
    chimeStyle,
    setChimeStyle,
    soundVolume,
    setSoundVolume,
    ambientVolume,
    setAmbientVolume,
    ambientSound,
    setAmbientSound,
    start,
    pause,
    voidPomodoro,
    skipBreak,
    switchSession,
    logInterruption,
    undoInterruption,
  }
}
