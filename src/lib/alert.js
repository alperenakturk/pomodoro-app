let audioCtx = null

// Autoplay kısıtlaması olmadan çalabilmek için AudioContext, kullanıcı
// tıklamasıyla (Start butonu) burada oluşturulup açılıyor.
export function unlockAudio() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    audioCtx = new AudioContextClass()
  }
  if (audioCtx.state === 'suspended') audioCtx.resume()
}

// Module-level, 0-1 — every playTone call below scales its peak gain by this,
// so the Settings volume slider (0-100, see usePomodoro's setSoundVolume)
// affects every sound (chime/ping/task-complete/ticking) without threading a
// volume argument through each individual playX() call site.
let volume = 1

export function setVolume(percent) {
  volume = Math.min(1, Math.max(0, percent / 100))
}

function playTone(freq, offset, duration, peak = 0.3) {
  const now = audioCtx.currentTime
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  // Floored rather than allowed to hit exactly 0 — exponentialRampToValueAtTime
  // throws a RangeError on a zero target, and this is reached for real at the
  // volume slider's minimum.
  const effectivePeak = Math.max(0.0001, peak * volume)
  gain.gain.setValueAtTime(0.0001, now + offset)
  gain.gain.exponentialRampToValueAtTime(effectivePeak, now + offset + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + duration)
  osc.connect(gain)
  gain.connect(audioCtx.destination)
  osc.start(now + offset)
  osc.stop(now + offset + duration + 0.02)
}

export const CHIME_STYLES = ['classic', 'soft', 'alert']

export function playChime(style = 'classic') {
  if (!audioCtx) return

  if (style === 'soft') {
    playTone(523, 0, 0.5, 0.22)
    return
  }

  if (style === 'alert') {
    playTone(880, 0, 0.1)
    playTone(880, 0.15, 0.1)
    playTone(880, 0.3, 0.1)
    return
  }

  // classic: three-note ascending chime
  playTone(660, 0, 0.16)
  playTone(660, 0.18, 0.16)
  playTone(880, 0.36, 0.16)
}

// A tiny, always-the-same acknowledgment tone for when a Pomodoro rings —
// distinct from playChime() above: that's a configurable *notification*
// ("pay attention, time to switch"), this is a UI *micro-confirmation*
// ("that just completed"), so it isn't tied to the user's chimeStyle choice.
export function playPing() {
  if (!audioCtx) return
  playTone(720, 0, 0.15, 0.16)
}

// A fuller, still-calm confirmation for finishing a task — a gentle
// ascending arpeggio, longer and warmer than playPing() but deliberately far
// from an "achievement unlocked" sound; this app values focus, not
// gamification.
export function playTaskCompleteChime() {
  if (!audioCtx) return
  playTone(523, 0, 0.35, 0.15)
  playTone(659, 0.18, 0.35, 0.16)
  playTone(784, 0.36, 0.4, 0.17)
  playTone(880, 0.56, 0.55, 0.15)
}

// Ambient ticking during an active work session (see usePomodoro's
// tickingSoundEnabled effect, which starts/stops this based on
// isRunning/sessionType). A single quiet click rather than a style picker
// like CHIME_STYLES: this plays continuously in the background rather than
// being consciously chosen/heard once, so offering a handful of ticking
// "styles" would add a picker UI for a sound nobody compares side by side —
// unlike the chime, which rings once and is worth being able to pick a favorite.
let tickIntervalId = null

function playTickTone() {
  if (!audioCtx) return
  playTone(1800, 0, 0.03, 0.05)
}

export function startTicking() {
  if (tickIntervalId) return
  playTickTone()
  tickIntervalId = setInterval(playTickTone, 1000)
}

export function stopTicking() {
  if (tickIntervalId) {
    clearInterval(tickIntervalId)
    tickIntervalId = null
  }
}

export function requestNotificationPermission() {
  if (!('Notification' in window)) return
  if (Notification.permission === 'default') Notification.requestPermission()
}

export function notify(title, body) {
  if (!('Notification' in window)) return
  if (Notification.permission === 'granted') {
    new Notification(title, { body })
  }
}
