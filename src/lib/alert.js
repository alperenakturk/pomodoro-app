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
