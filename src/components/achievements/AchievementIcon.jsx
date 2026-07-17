// Flat single-color stroke-only SVGs, same viewBox/stroke convention as
// SettingsModal.jsx's sidebar icons (viewBox 0 0 24 24, fill none, stroke
// currentColor, strokeWidth 1.75) — deliberately NOT the pixel-sprite style
// MotivationOverlay.jsx uses for its card-game categories, which is reserved
// for that one playful corner of an otherwise calm UI. Color comes entirely
// from the caller's text-* className (currentColor), so locked/unlocked and
// every theme variant fall out of existing theme tokens with no icon-level
// branching.
const ICONS = {
  flame: (
    <path
      d="M12 3c1 3-2 4.5-2 7a2 2 0 0 0 4 0c0-1-.5-1.8-.5-1.8 1.8 1 3.5 3 3.5 5.3A5 5 0 0 1 7 13.5C7 9 12 7 12 3Z"
      strokeLinejoin="round"
    />
  ),
  hourglass: (
    <path
      d="M7 3h10M7 21h10M7 3c0 4 3.2 5.5 5 6.5C13.8 10.5 17 9 17 3M7 21c0-4 3.2-5.5 5-6.5C13.8 15.5 17 17 17 21"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  mug: (
    <path
      d="M5 8h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8Zm11 1.5h1.5a2.5 2.5 0 0 1 0 5H16M8 4.5c0 1-1 1-1 2M11.5 4.5c0 1-1 1-1 2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  checkFlag: (
    <path
      d="M6 3v18M6 4h11l-2.5 3L17 10H6M9.5 13.5 11 15l3.5-3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  calendarCheck: (
    <path
      d="M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm0 5h14M8 3v4M16 3v4M9 14.5l2 2 4-4.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  card: (
    <path
      d="M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-11ZM4 9.5h16M8 14h4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  sparkle: (
    <path
      d="M12 3c.6 3.4 2.6 5.4 6 6-3.4.6-5.4 2.6-6 6-.6-3.4-2.6-5.4-6-6 3.4-.6 5.4-2.6 6-6Z"
      strokeLinejoin="round"
    />
  ),
  cards: (
    <path
      d="M7 4.5h11A1.5 1.5 0 0 1 19.5 6v11a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 17V6A1.5 1.5 0 0 1 7 4.5Zm0 0-2.4.9A1.5 1.5 0 0 0 3.6 7.3l3 10.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  star: (
    <path
      d="M12 4.5 14 9l5 .6-3.7 3.4.9 5-4.2-2.4-4.2 2.4.9-5L5 9.6 10 9Z"
      strokeLinejoin="round"
    />
  ),
  compass: (
    <path
      d="M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm3.2 4.8-2 4.7-4.7 2 2-4.7 4.7-2Z"
      strokeLinejoin="round"
    />
  ),
  layers: (
    <path
      d="m12 3.5 8 4.2-8 4.2-8-4.2 8-4.2Zm-8 8 8 4.2 8-4.2M4 15.7l8 4.2 8-4.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  sunrise: (
    <path
      d="M12 5v3M5.5 9.5 7.6 11.6M18.5 9.5 16.4 11.6M3 17h18M6 17a6 6 0 0 1 12 0M2.5 20.5h19"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  moon: (
    <path
      d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z"
      strokeLinejoin="round"
    />
  ),
  feather: (
    <path
      d="M20 4c-7 0-14 4-14 12l-2 3M6 16 17 5M9.5 12.5 14 8M12.5 16 16 12.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
}

function AchievementIcon({ icon, className = 'w-5 h-5' }) {
  const path = ICONS[icon]
  if (!path) return null
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      {path}
    </svg>
  )
}

export default AchievementIcon
