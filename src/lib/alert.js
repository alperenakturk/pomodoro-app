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

export function playChime() {
  if (!audioCtx) return
  const now = audioCtx.currentTime
  ;[0, 0.18, 0.36].forEach((offset, i) => {
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = 'sine'
    osc.frequency.value = i === 2 ? 880 : 660
    gain.gain.setValueAtTime(0.0001, now + offset)
    gain.gain.exponentialRampToValueAtTime(0.3, now + offset + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.16)
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.start(now + offset)
    osc.stop(now + offset + 0.18)
  })
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
