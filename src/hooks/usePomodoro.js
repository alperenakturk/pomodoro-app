import { useState, useEffect, useCallback } from 'react'
import {
  addTick,
  removeLastTick,
  loadSettings,
  patchSettings,
  loadTimerState,
  saveTimerState,
} from '../lib/storage'
import { unlockAudio, playChime, playPing, requestNotificationPermission, notify } from '../lib/alert'

const DURATIONS = {
  work: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
}

export const DEFAULT_CYCLE_LENGTH = 4

function todayString() {
  return new Date().toISOString().slice(0, 10)
}

export function usePomodoro({ onWorkComplete, onInterruption, onVoid } = {}) {
  // Restored on mount so a refresh doesn't lose a session in progress.
  const [sessionType, setSessionType] = useState(() => loadTimerState()?.sessionType ?? 'work')
  const [secondsLeft, setSecondsLeft] = useState(
    () => loadTimerState()?.secondsLeft ?? DURATIONS.work
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

  const [chimeStyle, setChimeStyleState] = useState(() => loadSettings().chimeStyle)

  const setChimeStyle = useCallback((style) => {
    setChimeStyleState(style)
    patchSettings({ chimeStyle: style })
  }, [])

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
      'Pomodoro complete',
      nextType === 'longBreak' ? 'Time for a long break.' : 'Time for a short break.'
    )
    setSessionType(nextType)
    setSecondsLeft(DURATIONS[nextType])
  }, [completedPomodoros, cycleLength, onWorkComplete, chimeStyle])

  const completeBreak = useCallback(() => {
    setIsRunning(false)
    playChime(chimeStyle)
    // Rule 3: the pomodoro count resets only when a long break ends.
    if (sessionType === 'longBreak') setCompletedPomodoros(0)
    notify('Break over', 'Time to get back to work.')
    setSessionType('work')
    setSecondsLeft(DURATIONS.work)
  }, [sessionType, chimeStyle])

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
      const elapsedSeconds = DURATIONS.work - secondsLeft
      onVoid && onVoid({ reason, elapsedSeconds })
      setIsRunning(false)
      setSecondsLeft(DURATIONS.work)
    },
    [sessionType, secondsLeft, onVoid]
  )

  // Kullanıcının bilinçli tercihiyle, zil beklenmeden pomodoro'yu tamamlanmış
  // sayan çıkış yolu (Void'in aksine X alır). Timer.jsx bunu onay diyaloğu
  // arkasına koyuyor.
  const finishEarly = useCallback(() => {
    if (sessionType !== 'work' || !isRunning) return
    completeWork()
  }, [sessionType, isRunning, completeWork])

  // Breaks aren't Pomodoros, so ending one early is a "skip" straight to
  // the next work session, not a "void".
  const skipBreak = useCallback(() => {
    if (sessionType === 'work') return
    setIsRunning(false)
    if (sessionType === 'longBreak') setCompletedPomodoros(0)
    setSessionType('work')
    setSecondsLeft(DURATIONS.work)
  }, [sessionType])

  // Kullanıcı istediği an work/short break/long break arasında manuel geçiş
  // yapabilir. Bir work session'ından çıkılıyorsa bu bir void'dür (X yazılmaz) —
  // onay Timer.jsx tarafında isteniyor.
  const switchSession = useCallback(
    (type) => {
      if (type === sessionType) return
      setIsRunning(false)
      setSessionType(type)
      setSecondsLeft(DURATIONS[type])
    },
    [sessionType]
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
    chimeStyle,
    setChimeStyle,
    start,
    voidPomodoro,
    finishEarly,
    skipBreak,
    switchSession,
    logInterruption,
    undoInterruption,
  }
}
