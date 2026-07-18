import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from '../hooks/useTranslation'

// Same tiny two-color mascot the old corner animation used — tomato-red
// body, ink for every feature, both fixed across every theme variant (see
// MotivationOverlay.jsx's own note on that exact trap), so it reads
// correctly in Dark and all four light themes with no theme-conditional
// styling. Scaling it way up for this full-screen context works unchanged:
// it's a plain viewBox'd SVG, no baked-in pixel sizing.
function TomatoMan({ className }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <circle cx="20" cy="22" r="15" fill="var(--color-tomato)" />
      <path
        d="M20 7 L15 2 L18 8 L11 5 L17 10 L9 9 L17 12 L20 12 L23 12 L31 9 L23 10 L29 5 L22 8 L25 2 Z"
        fill="var(--color-ink)"
      />
      <circle cx="14.5" cy="20" r="1.8" fill="var(--color-ink)" />
      <circle cx="25.5" cy="20" r="1.8" fill="var(--color-ink)" />
      <path
        d="M10 27 Q14 23.5 18 27 Q14 29.5 10 27 Z M30 27 Q26 23.5 22 27 Q26 29.5 30 27 Z"
        fill="var(--color-ink)"
      />
    </svg>
  )
}

// A regular day's particle ring — 16 dots at a wide radius, since there's a
// whole screen to fill now instead of the few pixels the old corner version
// had next to the header pill.
const INCREMENT_PARTICLE_ANGLES = Array.from({ length: 16 }, (_, i) => i * 22.5)

// A handful of organic (non-circular) blob outlines, cycled through rather
// than randomized per blob — keeps the splat looking hand-made without a
// different random shape on literally every render.
const BLOB_BORDER_RADII = [
  '60% 40% 55% 45% / 55% 45% 60% 40%',
  '45% 55% 40% 60% / 60% 40% 55% 45%',
  '55% 45% 60% 40% / 40% 60% 45% 55%',
  '50% 50% 65% 35% / 45% 55% 40% 60%',
]

const SPLAT_BLOB_COUNT = 22
// Deterministic angle spacing (so the burst is a real ring, not a random
// scatter that might clump) with small per-blob jitter layered on top —
// jitter is what keeps 22 evenly-spaced blobs from reading as a mechanical
// dot pattern. Distance/scale/spin/color/shape are cheap cosmetic variety,
// recomputed fresh each time a milestone actually fires (celebrations are
// rare, one-shot events — a slightly different splat pattern each time is a
// feature, not a bug).
function buildSplatBlobs() {
  return Array.from({ length: SPLAT_BLOB_COUNT }, (_, i) => {
    const baseAngle = (360 / SPLAT_BLOB_COUNT) * i
    const angle = baseAngle + (Math.random() * 14 - 7)
    const distance = 110 + Math.random() * 130
    const blobScale = 0.5 + Math.random() * 0.9
    const spin = Math.random() * 240 - 120
    const delay = Math.random() * 0.12
    const useDarkTone = i % 3 === 0
    const size = 14 + Math.random() * 16
    const borderRadius = BLOB_BORDER_RADII[i % BLOB_BORDER_RADII.length]
    return { id: i, angle, distance, blobScale, spin, delay, useDarkTone, size, borderRadius }
  })
}

const DRIP_COUNT = 6
function buildDrips() {
  return Array.from({ length: DRIP_COUNT }, (_, i) => {
    const offsetX = -70 + (140 / (DRIP_COUNT - 1)) * i + (Math.random() * 16 - 8)
    const delay = 0.35 + Math.random() * 0.25
    const useDarkTone = i % 2 === 0
    return { id: i, offsetX, delay, useDarkTone }
  })
}

// Triggered by useStreak()'s transient `celebration` signal ('increment' |
// 'milestone' | null). Replaces the old StreakCelebration.jsx (a small
// animation anchored next to the header's streak pill) with a full-screen
// takeover, deliberately closer in weight to StreakDetailsModal (opened by
// clicking that same pill) than to a toast — this is meant to read as a
// real "show," Duolingo-style, not a decorative flourish glimpsed in the
// corner.
//
// A milestone gets a categorically bigger moment than a plain increment,
// not just a scaled-up version of it: every regular day gets the mascot
// growing in with a bouncy wobble plus a particle ring/glow (the burst
// treatment a milestone used to get exclusively); a milestone now gets the
// tomato genuinely "splatting" — it squashes, vanishes, and a burst of
// sauce-colored blobs and drips takes over the screen, with one full-screen
// tomato-tinted flash at the moment of impact. See index.css's "Milestone-
// only: the tomato splats" block for the underlying keyframes.
//
// Unlike the old component (which skipped rendering entirely under
// prefers-reduced-motion, since it was purely decorative next to an
// already-visible number), this screen is real information — the streak
// count and, for a milestone, which one was just reached — so it still
// shows under reduced motion, just without any of the animated flourishes;
// the user dismisses it the same way either way, via Continue.
function StreakCelebrationScreen({ celebration, streak, onDone }) {
  const { t } = useTranslation()
  const continueButtonRef = useRef(null)
  const previouslyFocused = useRef(null)
  const reduceMotion =
    typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)

  const isMilestone = celebration === 'milestone'

  // Only recomputed when isMilestone actually flips — not on every render —
  // so the splat pattern stays stable for the lifetime of one celebration
  // instead of reshuffling on an unrelated re-render. celebration always
  // cycles back through null (via clearCelebration) between two separate
  // milestones, which already flips isMilestone false then true again, so
  // this doesn't need `streak` itself as a dependency.
  const splatBlobs = useMemo(() => (isMilestone ? buildSplatBlobs() : []), [isMilestone])
  const drips = useMemo(() => (isMilestone ? buildDrips() : []), [isMilestone])

  useEffect(() => {
    if (!celebration) return
    previouslyFocused.current = document.activeElement
    continueButtonRef.current?.focus()
    return () => {
      previouslyFocused.current?.focus?.()
    }
  }, [celebration])

  if (!celebration) return null

  const titleKey = isMilestone ? 'streak.celebrationMilestoneTitle' : 'streak.celebrationIncrementTitle'
  const subtitleKey = isMilestone ? 'streak.celebrationMilestoneSubtitle' : 'streak.celebrationIncrementSubtitle'
  const ariaKey = isMilestone ? 'streak.celebrationMilestoneAria' : 'streak.celebrationIncrementAria'

  function handleKeyDown(e) {
    if (e.key === 'Escape' || e.key === 'Enter') onDone()
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-pine flex items-center justify-center p-6 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={t(ariaKey, { count: streak })}
      onKeyDown={handleKeyDown}
    >
      {isMilestone && !reduceMotion && (
        <span className="animate-tomato-splat-flash fixed inset-0 bg-tomato pointer-events-none" aria-hidden="true" />
      )}

      <div className="relative flex flex-col items-center text-center gap-1 max-w-sm">
        {!isMilestone && !reduceMotion && (
          <>
            <span
              className="animate-streak-glow-pulse absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 sm:w-72 sm:h-72 rounded-full bg-amber blur-2xl pointer-events-none"
              aria-hidden="true"
            />
            {INCREMENT_PARTICLE_ANGLES.map((angle) => (
              <span
                key={angle}
                className="animate-streak-particle absolute top-1/3 left-1/2 w-2 h-2 rounded-full bg-amber pointer-events-none"
                style={{ '--angle': `${angle}deg`, '--distance': '160px' }}
                aria-hidden="true"
              />
            ))}
          </>
        )}

        {isMilestone && !reduceMotion && (
          <>
            {splatBlobs.map((blob) => (
              <span
                key={blob.id}
                className="animate-tomato-splat-blob absolute top-1/2 left-1/2 pointer-events-none"
                style={{
                  width: `${blob.size}px`,
                  height: `${blob.size}px`,
                  borderRadius: blob.borderRadius,
                  backgroundColor: blob.useDarkTone ? 'var(--color-tomato-dark)' : 'var(--color-tomato)',
                  '--angle': `${blob.angle}deg`,
                  '--distance': `${blob.distance}px`,
                  '--blob-scale': blob.blobScale,
                  '--spin': `${blob.spin}deg`,
                  animationDelay: `${blob.delay}s`,
                }}
                aria-hidden="true"
              />
            ))}
            {drips.map((drip) => (
              <span
                key={drip.id}
                className="animate-tomato-drip absolute top-1/2 left-1/2 w-2.5 h-4 pointer-events-none"
                style={{
                  borderRadius: '50% 50% 45% 45% / 65% 65% 35% 35%',
                  backgroundColor: drip.useDarkTone ? 'var(--color-tomato-dark)' : 'var(--color-tomato)',
                  transform: `translateX(${drip.offsetX}px)`,
                  animationDelay: `${drip.delay}s`,
                }}
                aria-hidden="true"
              />
            ))}
          </>
        )}

        {isMilestone && (
          <p className="font-sans text-amber-text text-xs font-bold tracking-widest uppercase mb-2 relative">
            {t('streak.celebrationMilestoneBadge')}
          </p>
        )}

        <TomatoMan
          className={
            (reduceMotion ? '' : isMilestone ? 'animate-tomato-mascot-splat' : 'animate-streak-explode') +
            ' relative w-28 h-28 sm:w-36 sm:h-36'
          }
        />

        <p className="font-warm text-cream font-extrabold text-3xl sm:text-4xl tabular-nums mt-4 relative">
          {t(titleKey, { count: streak })}
        </p>
        <p className="font-sans text-sage text-sm sm:text-base mt-1 mb-6 relative">{t(subtitleKey)}</p>

        <button
          ref={continueButtonRef}
          type="button"
          onClick={onDone}
          className="font-sans text-sm px-8 py-2.5 rounded-xl bg-tomato text-on-tomato font-semibold relative"
        >
          {t('streak.celebrationContinueButton')}
        </button>
      </div>
    </div>
  )
}

export default StreakCelebrationScreen
