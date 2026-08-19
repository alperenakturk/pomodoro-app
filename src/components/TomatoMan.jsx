// Shared tomato-red/ink two-color mascot — tomato-red body, ink for every
// feature, both fixed across every theme variant (see MotivationOverlay.jsx's
// own note on that exact trap), so it reads correctly in Dark and all light
// themes with no theme-conditional styling. Used by StreakCelebrationScreen's
// full-screen celebration and ExperienceModeTransition's mode-switch
// animation. Plain viewBox'd SVG, no baked-in pixel sizing.
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

export default TomatoMan
