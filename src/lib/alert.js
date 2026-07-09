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

function playTone(freq, offset, duration, peak = 0.3) {
  const now = audioCtx.currentTime
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, now + offset)
  gain.gain.exponentialRampToValueAtTime(peak, now + offset + 0.02)
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
