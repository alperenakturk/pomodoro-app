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
  // Continuous ambient beds (rain/cafe/whiteNoise) are already playing when
  // the user drags the slider, unlike the one-shot tones below (which just
  // read `volume` fresh the next time they're triggered) — so this is the
  // one place that needs to reach into an already-running audio graph.
  if (ambientGainNode) {
    ambientGainNode.gain.value = Math.max(0.0001, ambientBaseGain * volume)
  }
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

// Ambient background sound during an active work session only (see
// usePomodoro's ambientSound effect, which calls startAmbientSound/
// stopAmbientSound based on isRunning/sessionType). One picker rather than a
// boolean toggle now that there's more than one option, but still just one
// sound at a time — starting a new one always stops whatever was playing.
//
// 'ticking' keeps the original discrete-click implementation (a plain
// setInterval re-triggering a short playTone every second — its volume is
// picked up fresh on every tick, so it never needs a live-update path).
// 'rain'/'cafe'/'whiteNoise' are continuous textures, which ticking's
// one-shot-per-second approach can't produce — those three instead share a
// single noise-buffer graph (AudioBufferSourceNode -> optional
// BiquadFilterNode -> GainNode -> destination), differing only in which
// filter (if any) shapes the raw noise:
//   - whiteNoise: unfiltered — the rawest, most "static" texture.
//   - rain: band-passed around 2.2kHz, approximating a steady hiss.
//   - cafe: low-passed into a deep rumble (a room's murmur bed), plus
//     occasional random short high-pitched blips layered on top (a rough
//     stand-in for distant cups/dishware) — no attempt at literal voices or
//     recordings, just a simple abstraction built from the same synthesized-
//     tone primitives as the rest of this file.
// These are deliberately simple approximations, not recordings — consistent
// with this file's no-external-assets, everything-synthesized approach.
export const AMBIENT_SOUNDS = ['none', 'ticking', 'rain', 'cafe', 'whiteNoise']

let tickIntervalId = null
let ambientNoiseSource = null
let ambientGainNode = null
let ambientBaseGain = 0
let ambientClinkIntervalId = null

function playTickTone() {
  if (!audioCtx) return
  playTone(1800, 0, 0.03, 0.05)
}

function createNoiseBuffer(seconds = 2) {
  const length = Math.floor(audioCtx.sampleRate * seconds)
  const buffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1
  }
  return buffer
}

function playCafeClink() {
  if (!audioCtx) return
  playTone(1600 + Math.random() * 900, 0, 0.05, 0.04)
}

// `filterConfig` is null for unfiltered white noise, or { type, frequency,
// Q? } for a BiquadFilterNode shaping the same raw noise into rain/cafe.
function startNoiseBed(baseGain, filterConfig) {
  const source = audioCtx.createBufferSource()
  source.buffer = createNoiseBuffer()
  source.loop = true

  const gain = audioCtx.createGain()
  ambientBaseGain = baseGain
  gain.gain.value = Math.max(0.0001, baseGain * volume)

  let lastNode = source
  if (filterConfig) {
    const filter = audioCtx.createBiquadFilter()
    filter.type = filterConfig.type
    filter.frequency.value = filterConfig.frequency
    if (filterConfig.Q != null) filter.Q.value = filterConfig.Q
    source.connect(filter)
    lastNode = filter
  }
  lastNode.connect(gain)
  gain.connect(audioCtx.destination)
  source.start()

  ambientNoiseSource = source
  ambientGainNode = gain
}

function stopNoiseBed() {
  if (ambientNoiseSource) {
    ambientNoiseSource.stop()
    ambientNoiseSource.disconnect()
    ambientNoiseSource = null
  }
  if (ambientGainNode) {
    ambientGainNode.disconnect()
    ambientGainNode = null
  }
  ambientBaseGain = 0
  if (ambientClinkIntervalId) {
    clearInterval(ambientClinkIntervalId)
    ambientClinkIntervalId = null
  }
}

export function startAmbientSound(kind) {
  stopAmbientSound()
  if (!audioCtx || !kind || kind === 'none') return

  if (kind === 'ticking') {
    playTickTone()
    tickIntervalId = setInterval(playTickTone, 1000)
    return
  }
  if (kind === 'whiteNoise') {
    startNoiseBed(0.05, null)
    return
  }
  if (kind === 'rain') {
    startNoiseBed(0.07, { type: 'bandpass', frequency: 2200, Q: 0.7 })
    return
  }
  if (kind === 'cafe') {
    startNoiseBed(0.06, { type: 'lowpass', frequency: 500, Q: 0.5 })
    ambientClinkIntervalId = setInterval(() => {
      if (Math.random() < 0.3) playCafeClink()
    }, 2000)
  }
}

export function stopAmbientSound() {
  if (tickIntervalId) {
    clearInterval(tickIntervalId)
    tickIntervalId = null
  }
  stopNoiseBed()
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
