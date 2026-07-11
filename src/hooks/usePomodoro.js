import { useState, useEffect, useCallback } from 'react'
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
  setVolume as setAlertVolume,
  startAmbientSound,
  stopAmbientSound,
} from '../lib/alert'
import { translate } from '../lib/i18n'

export const DEFAULT_CYCLE_LENGTH = 4

// Unlike short/long break, the Pomodoro Technique's 25-minute work interval
// has no "recommended range" in this app — it's freely adjustable. Only a
// sane absolute ceiling/floor guards against a broken timer (e.g. 0 or
// unreasonably long); SettingsTab shows an informational (non-blocking) note
// whenever the value differs from the standard 25, rather than a
// recommended-range hint like the break durations get.
export const DEFAULT_WORK_MINUTES = 25
export const WORK_MIN = 1
export const WORK_MAX = 180

// Rule 3: short break 3-5 min recommended, long break 15-30 min recommended
// (docs/methodology.md). Min/max are hard bounds the input enforces; the
// recommended range is only ever surfaced as a non-blocking hint in
// SettingsTab — values outside it are still valid and fully allowed.
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
  // Restored on mount so a refresh doesn't lose a session in progress.
  const [sessionType, setSessionType] = useState(() => loadTimerState()?.sessionType ?? 'work')
  const [secondsLeft, setSecondsLeft] = useState(
    () => loadTimerState()?.secondsLeft ?? loadSettings().workMinutes * 60
  )
  const [isRunning, setIsRunning] = useState(() => loadTimerState()?.isRunning ?? false)
  const [completedPomodoros, setCompletedPomodoros] = useState(0)
  const [internalCount, setInternalCount] = useState(0)
  const [externalCount, setExternalCount] = useState(0)
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

  // 0-100, applied to every alert.js playback call (chime/ping/task-complete/
  // ticking) via its own module-level volume — see alert.js's setVolume.
  const [soundVolume, setSoundVolumeState] = useState(() => loadSettings().soundVolume)
  const setSoundVolume = useCallback((n) => {
    const value = Math.min(100, Math.max(0, Math.round(n)))
    setSoundVolumeState(value)
    patchSettings({ soundVolume: value })
  }, [])
  useEffect(() => {
    setAlertVolume(soundVolume)
  }, [soundVolume])

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
    saveTimerState({ sessionType, secondsLeft, isRunning })
  }, [sessionType, secondsLeft, isRunning])

  useEffect(() => {
    if (!isRunning) return
    const intervalId = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1))
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
    if (isRunning) return
    setSecondsLeft(
      sessionType === 'work'
        ? workMinutes * 60
        : sessionType === 'longBreak'
          ? longBreakMinutes * 60
          : shortBreakMinutes * 60
    )
  }, [isRunning, sessionType, workMinutes, shortBreakMinutes, longBreakMinutes])

  // Bir work session'ının tamamlanma mantığı: hem zil çaldığında hem de
  // kullanıcı "Pomodoro'yu bitir" ile erken tamamladığında aynı yolu izler.
  const completeWork = useCallback(() => {
    setIsRunning(false)
    // Per methodology, a "Pomodoro" is specifically the work session — breaks
    // aren't Pomodoros — so the ping + ring-pulse (Pomodoro completion feedback)
    // live only here, not in completeBreak. playChime is the separate,
    // user-configurable "time to switch" notification and still fires for both.
    playPing()
    playChime(chimeStyle)
    setCompletionPulseKey((k) => k + 1)
    const newCount = completedPomodoros + 1
    setCompletedPomodoros(newCount)
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
    setSecondsLeft(nextType === 'longBreak' ? longBreakMinutes * 60 : shortBreakMinutes * 60)
    if (autoStartBreaks) setIsRunning(true)
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
    playChime(chimeStyle)
    // Rule 3: the pomodoro count resets only when a long break ends.
    if (sessionType === 'longBreak') setCompletedPomodoros(0)
    notify(t('notifications.breakOverTitle'), t('notifications.backToWorkBody'))
    setSessionType('work')
    setSecondsLeft(workMinutes * 60)
    if (autoStartPomodoros) setIsRunning(true)
  }, [sessionType, chimeStyle, t, workMinutes, autoStartPomodoros])

  useEffect(() => {
    if (secondsLeft !== 0 || !isRunning) return
    if (sessionType === 'work') completeWork()
    else completeBreak()
  }, [secondsLeft, isRunning, sessionType, completeWork, completeBreak])

  const start = useCallback(() => {
    unlockAudio()
    requestNotificationPermission()
    setIsRunning(true)
  }, [])

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
      setSecondsLeft(workMinutes * 60)
    },
    [sessionType, secondsLeft, onVoid, workMinutes]
  )

  // Kullanıcının bilinçli tercihiyle, zil beklenmeden pomodoro'yu tamamlanmış
  // sayan çıkış yolu (Void'in aksine X alır). Timer.jsx bunu onay diyaloğu
  // arkasına koyuyor.
  const finishEarly = useCallback(() => {
    if (sessionType !== 'work' || !isRunning) return
    completeWork()
  }, [sessionType, isRunning, completeWork])

  // Breaks aren't Pomodoros, so ending one early is a "skip" straight to
  // the next work session, not a "void". Still honors autoStartPomodoros —
  // from the user's perspective this is still "a break ending," just early.
  const skipBreak = useCallback(() => {
    if (sessionType === 'work') return
    setIsRunning(false)
    if (sessionType === 'longBreak') setCompletedPomodoros(0)
    setSessionType('work')
    setSecondsLeft(workMinutes * 60)
    if (autoStartPomodoros) setIsRunning(true)
  }, [sessionType, workMinutes, autoStartPomodoros])

  // Kullanıcı istediği an work/short break/long break arasında manuel geçiş
  // yapabilir. Bir work session'ından çıkılıyorsa bu bir void'dür (X yazılmaz) —
  // onay Timer.jsx tarafında isteniyor.
  const switchSession = useCallback(
    (type) => {
      if (type === sessionType) return
      setIsRunning(false)
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
    ambientSound,
    setAmbientSound,
    start,
    voidPomodoro,
    finishEarly,
    skipBreak,
    switchSession,
    logInterruption,
    undoInterruption,
  }
}
