import { useEffect } from 'react'
import { useTranslation } from '../hooks/useTranslation'

// A tiny, deliberately simple two-color mascot — tomato-red body, ink for
// every feature (leaf tuft, eyes, and — per the brief — a mustache). Both
// colors are fixed across every theme variant (unlike pine/sage/cream, which
// invert between dark and light themes — see MotivationOverlay.jsx's own
// comment on that exact trap), so this reads correctly in Dark and all four
// light themes without any theme-conditional styling.
function TomatoMan({ className, onAnimationEnd }) {
  return (
    <svg viewBox="0 0 40 40" className={className} onAnimationEnd={onAnimationEnd} aria-hidden="true">
      <circle cx="20" cy="22" r="15" fill="var(--color-tomato)" />
      {/* Leaf tuft */}
      <path
        d="M20 7 L15 2 L18 8 L11 5 L17 10 L9 9 L17 12 L20 12 L23 12 L31 9 L23 10 L29 5 L22 8 L25 2 Z"
        fill="var(--color-ink)"
      />
      {/* Eyes */}
      <circle cx="14.5" cy="20" r="1.8" fill="var(--color-ink)" />
      <circle cx="25.5" cy="20" r="1.8" fill="var(--color-ink)" />
      {/* Mustache — two symmetric curved lobes */}
      <path
        d="M10 27 Q14 23.5 18 27 Q14 29.5 10 27 Z M30 27 Q26 23.5 22 27 Q26 29.5 30 27 Z"
        fill="var(--color-ink)"
      />
    </svg>
  )
}

const PARTICLE_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315]

// Triggered by useStreak()'s transient `celebration` signal ('increment' |
// 'milestone' | null) — meant to be rendered inside a `relative` wrapper
// right next to the header's streak pill (see App.jsx). Purely decorative
// (pointer-events-none): the streak number itself, already visible in the
// pill, is the actual information, same reasoning index.css's reduced-motion
// fallback for this component follows.
function StreakCelebration({ celebration, streak, onDone }) {
  const { t } = useTranslation()

  useEffect(() => {
    if (!celebration) return
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) onDone()
  }, [celebration, onDone])

  if (!celebration) return null
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return null

  const isMilestone = celebration === 'milestone'

  return (
    <div
      // Drops down from the pill (top-full), never floats above it — the
      // header sits right at the top of the viewport with little margin, so
      // anything positioned upward (a milestone title especially) clips off
      // screen there. Below always has room.
      className="absolute top-full mt-1 left-1/2 -translate-x-1/2 pointer-events-none z-10"
      role="status"
      aria-label={
        isMilestone
          ? t('streak.celebrationMilestoneAria', { count: streak })
          : t('streak.celebrationIncrementAria', { count: streak })
      }
    >
      {isMilestone && (
        <>
          <p className="absolute top-11 left-1/2 -translate-x-1/2 whitespace-nowrap font-display text-xs text-tomato tracking-wide">
            {t('streak.celebrationMilestoneTitle', { count: streak })}
          </p>
          {PARTICLE_ANGLES.map((angle) => (
            <span
              key={angle}
              className="animate-streak-particle absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full bg-amber"
              style={{ '--angle': `${angle}deg`, '--distance': '28px' }}
            />
          ))}
        </>
      )}
      {/* onAnimationEnd fires on whichever tier's animation actually ran
          (streak-explode for a milestone, streak-pop otherwise) — the
          mascot always outlasts the particles (1.8s vs 1.6s), so it's the
          right element to signal "celebration finished, clear it." */}
      <TomatoMan
        className={isMilestone ? 'animate-streak-explode w-10 h-10' : 'animate-streak-pop w-7 h-7'}
        onAnimationEnd={onDone}
      />
    </div>
  )
}

export default StreakCelebration
