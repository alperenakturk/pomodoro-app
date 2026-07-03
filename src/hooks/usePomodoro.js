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
      setSessionType('work')
      setSecondsLeft(DURATIONS.work)
    }
  }, [secondsLeft, isRunning, sessionType, completedPomodoros, onWorkComplete])

  const start = useCallback(() => setIsRunning(true), [])
  const pause = useCallback(() => setIsRunning(false), [])
  const reset = useCallback(() => {
    setIsRunning(false)
    setSecondsLeft(DURATIONS[sessionType])
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
    pause,
    reset,
    logInterruption,
  }
}
