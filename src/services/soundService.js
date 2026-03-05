/**
 * POS sound effects via Web Audio API
 * - Scan beep: when product is added (escanear producto)
 * - Register open: when F2/Cobrar opens payment modal (caja registradora)
 * - Sale complete: "cachín" when venta finalizada
 */

let audioContext = null

function getContext() {
  if (audioContext) return audioContext
  audioContext = new (window.AudioContext || window.webkitAudioContext)()
  return audioContext
}

function beep(frequency, durationMs, type = 'sine', volume = 0.15) {
  try {
    const ctx = getContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = frequency
    osc.type = type
    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + durationMs / 1000)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + durationMs / 1000)
  } catch (_) {
    // Ignore if audio not allowed (e.g. no user gesture yet)
  }
}

/**
 * Short beep when a product is scanned/added to the sale.
 */
export function playScanBeep() {
  beep(880, 60, 'sine', 0.12)
}

/**
 * Sound when opening checkout (F2 / Cobrar) - like opening the cash register.
 */
export function playRegisterOpen() {
  try {
    const ctx = getContext()
    const osc1 = ctx.createOscillator()
    const gain = ctx.createGain()
    osc1.connect(gain)
    gain.connect(ctx.destination)
    osc1.frequency.setValueAtTime(1200, ctx.currentTime)
    osc1.frequency.setValueAtTime(1500, ctx.currentTime + 0.06)
    osc1.type = 'sine'
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.02)
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.1)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)
    osc1.start(ctx.currentTime)
    osc1.stop(ctx.currentTime + 0.22)
  } catch (_) {}
}

/**
 * "Cachín" when the sale is completed (payment confirmed).
 */
export function playSaleComplete() {
  try {
    const ctx = getContext()
    const t = ctx.currentTime
    // Two-tone cha-ching: low then high
    const playTone = (freq, start, duration, vol = 0.18) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.connect(g)
      g.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type = 'sine'
      g.gain.setValueAtTime(0, t + start)
      g.gain.linearRampToValueAtTime(vol, t + start + 0.02)
      g.gain.exponentialRampToValueAtTime(0.01, t + start + duration)
      osc.start(t + start)
      osc.stop(t + start + duration)
    }
    playTone(523, 0, 0.12)   // C5
    playTone(1047, 0.08, 0.2) // C6 - classic cachín
  } catch (_) {}
}
