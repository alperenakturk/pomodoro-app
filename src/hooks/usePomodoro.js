import { useState, useEffect, useCallback } from 'react'
import { addTick } from '../lib/storage'

const DURATIONS = {
  work: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
}

function todayString() {
  return new Date().toISOString().slice(0, 10)
}

export function usePomodoro({ onWorkComplete, onInterruption } = {}) {
  const [sessionType, setSessionType] = useState('work')
  const [secondsLeft, setSecondsLeft] = useState(DURATIONS.work)
  const [isRunning, setIsRunning] = useState(false)
  const [completedPomodoros, setCompletedPomodoros] = useState(0)

  useEffect(() => {
    if (!isRunning) return
    const intervalId = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => clearInterval(intervalId)
  }, [isRunning])

  useEffect(() => {
    if (secondsLeft !== 0 || !isRunning) return
    setIsRunning(false)

    if (sessionType === 'work') {
      const newCount = completedPomodoros + 1
      setCompletedPomodoros(newCount)
      addTick({
        id: crypto.randomUUID(),
        type: 'pomodoro',
        date: todayString(),
        timestamp: new Date().toISOString(),
      })
      onWorkComplete && onWorkComplete()
      const nextType = newCount % 4 === 0 ? 'longBreak' : 'shortBreak'
      setSessionType(nextType)
      setSecondsLeft(DURATIONS[nextType])
    } else {
      // Rule 3: the pomodoro count resets only when a long break ends.
      if (sessionType === 'longBreak') setCompletedPomodoros(0)
      setSessionType('work')
      setSecondsLeft(DURATIONS.work)
    }
  }, [secondsLeft, isRunning, sessionType, completedPomodoros, onWorkComplete])

  const start = useCallback(() => setIsRunning(true), [])

  // Rule 1: voiding only applies to a Pomodoro (work session) — it resets
  // the timer as if it never started and writes no tick, so no X is recorded.
  const voidPomodoro = useCallback(() => {
    if (sessionType !== 'work') return
    setIsRunning(false)
    setSecondsLeft(DURATIONS.work)
  }, [sessionType])

  // Breaks aren't Pomodoros, so ending one early is a "skip" straight to
  // the next work session, not a "void".
  const skipBreak = useCallback(() => {
    if (sessionType === 'work') return
    setIsRunning(false)
    if (sessionType === 'longBreak') setCompletedPomodoros(0)
    setSessionType('work')
    setSecondsLeft(DURATIONS.work)
  }, [sessionType])

  const logInterruption = useCallback(
    (kind) => {
      addTick({
        id: crypto.randomUUID(),
        type: kind === 'internal' ? 'interruption-internal' : 'interruption-external',
        date: todayString(),
        timestamp: new Date().toISOString(),
      })
      onInterruption && onInterruption(kind)
    },
    [onInterruption]
  )

  return {
    sessionType,
    secondsLeft,
    isRunning,
    completedPomodoros,
    start,
    voidPomodoro,
    skipBreak,
    logInterruption,
  }
}
