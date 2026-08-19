import { useEffect, useRef } from 'react'
import TomatoMan from './TomatoMan'

const ANIMATION_MS = 2600

// A brief, full-screen "the tomato man drives across" transition, played
// once on a real mode switch via the header/Settings toggle — left to
// right for Simple -> Full, right to left for Full -> Simple (never during
// onboarding's own experienceMode step, where nothing is visibly
// "changing" yet — see App.jsx's handleToggleExperienceMode for the one
// call site that triggers this, vs. selectExperienceMode which doesn't).
// The mode switch itself applies instantly underneath, fully hidden behind
// this opaque overlay — by the time it unmounts, the new UI is just
// already there, no separate "apply after" step needed.
//
// `direction` is 'toFull' (default) or 'toSimple'. Reversing is two
// separate CSS keyframes (see index.css), not one mirrored via
// scaleX(-1) — flipping the whole assembly would flip TomatoMan's own
// artwork too, which is exactly the "riding backwards/upside-down" look
// this is meant to avoid. Only the travel keyframe and the trailing motion
// lines' side swap; TomatoMan and the car are drawn identically either way.
//
// App.jsx skips mounting this entirely under prefers-reduced-motion (same
// call-site-level check StreakCelebrationScreen uses for its own flourishes)
// — index.css's fallback rules on both drive-by classes are belt-and-
// suspenders for that same case, matching this file's existing convention.
function ExperienceModeTransition({ direction = 'toFull', onDone }) {
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  const reverse = direction === 'toSimple'

  useEffect(() => {
    const timeoutId = setTimeout(() => doneRef.current(), ANIMATION_MS)
    return () => clearTimeout(timeoutId)
  }, [])

  return (
    <div className="fixed inset-0 z-[100] bg-pine flex items-center overflow-hidden" aria-hidden="true">
      <div className="absolute left-0 right-0 bottom-[38%] h-px bg-cream/10" />

      {/* Outer element owns the horizontal glide only (one smooth eased
          keyframe, see index.css). Inner element owns the small vertical
          "bumpy road" bounce, looping independently — keeping the two
          separate is what keeps the glide itself perfectly smooth instead
          of lurching at each bounce waypoint. */}
      <div
        className={
          (reverse ? 'animate-tomato-car-drive-by-reverse' : 'animate-tomato-car-drive-by') +
          ' absolute bottom-[38%] left-0 w-32 h-24'
        }
      >
        <div className="animate-tomato-car-bounce relative w-full h-full">
          {/* Trailing motion lines sit behind the direction of travel —
              to the left when driving right, to the right when driving
              left — so they still read as a trail, not a lead-in. */}
          {reverse ? (
            <>
              <span className="absolute bottom-10 -right-9 w-8 h-0.5 rounded-full bg-cream/20" />
              <span className="absolute bottom-7 -right-14 w-6 h-0.5 rounded-full bg-cream/10" />
              <span className="absolute bottom-13 -right-12 w-7 h-0.5 rounded-full bg-cream/15" />
            </>
          ) : (
            <>
              <span className="absolute bottom-10 -left-9 w-8 h-0.5 rounded-full bg-cream/20" />
              <span className="absolute bottom-7 -left-14 w-6 h-0.5 rounded-full bg-cream/10" />
              <span className="absolute bottom-13 -left-12 w-7 h-0.5 rounded-full bg-cream/15" />
            </>
          )}

          <svg viewBox="0 0 100 70" className="absolute bottom-0 left-0 w-32 h-20 overflow-visible">
            <rect
              x="16"
              y="34"
              width="68"
              height="18"
              rx="9"
              fill="none"
              stroke="var(--color-cream)"
              strokeOpacity="0.55"
              strokeWidth="3"
            />
            <g className="animate-tomato-car-wheel-spin" style={{ transformOrigin: '30px 56px' }}>
              <circle cx="30" cy="56" r="9" fill="var(--color-pine)" stroke="var(--color-cream)" strokeOpacity="0.6" strokeWidth="3" />
              <line x1="30" y1="56" x2="30" y2="49" stroke="var(--color-cream)" strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" />
            </g>
            <g className="animate-tomato-car-wheel-spin" style={{ transformOrigin: '70px 56px' }}>
              <circle cx="70" cy="56" r="9" fill="var(--color-pine)" stroke="var(--color-cream)" strokeOpacity="0.6" strokeWidth="3" />
              <line x1="70" y1="56" x2="70" y2="49" stroke="var(--color-cream)" strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" />
            </g>
          </svg>

          {/* rotate-180 here only — TomatoMan.jsx itself and
              StreakCelebrationScreen's use of it stay untouched. At this
              small size, riding in the cart, the shared asset's own
              "right side up" orientation (leaves top, eyes above mouth)
              read as upside-down; flipping just this instance is what
              reads as upright here. */}
          <TomatoMan className="absolute bottom-8 left-1/2 -translate-x-1/2 rotate-180 w-16 h-16" />
        </div>
      </div>
    </div>
  )
}

export default ExperienceModeTransition
