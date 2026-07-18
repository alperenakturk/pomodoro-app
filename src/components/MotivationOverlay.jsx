import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from '../hooks/useTranslation'
import { pickCoachMark } from '../lib/constants'
import RichText from './RichText'
import { drawCard, pickRandom } from '../lib/motivationCategories'
import { addCardDraw, loadTicks, loadActivityLog } from '../lib/storage'
import { unlockAudio, playCardShuffle, playCardPick, playCardMystery, playCategoryReveal } from '../lib/alert'

const CARD_FLIP_MS = 700
// How long the flipped card shows just its "?" before the actual category
// icon swaps in (see Card's front face) — a beat of suspense before the
// reveal. Rare gets a longer one, for extra anticipation.
const MYSTERY_HOLD_MS = 550
const MYSTERY_HOLD_MS_RARE = 950
// How long the category icon shows alone before the content panel fades in
// below it. Rare gets a longer beat too, per the design brief ("maybe a
// slightly longer reveal beat"), both named/tunable.
const ICON_HOLD_MS = 600
const ICON_HOLD_MS_RARE = 1200
const POKE_DURATION_MS = 2200
// Purely cosmetic pre-pick shuffle (see index.css's card-shuffle-a/b/c
// keyframes) — matches those animations' own duration so the `shuffling`
// state and disabled-cards window end exactly when the motion does.
const SHUFFLE_MS = 1100
// Background music — see MUSIC_SRC's own comment just below.
const MUSIC_VOLUME = 0.32
const MUSIC_FADE_MS = 900

function todayString() {
  return new Date().toISOString().slice(0, 10)
}

// Background music — unlike every other sound in this app (all synthesized
// via Web Audio, see alert.js), an actual ambient music bed can't
// reasonably be synthesized from scratch, so this expects a real audio
// file. It is NOT bundled: this repo can't ship third-party music without
// its own license terms being independently confirmed, so nothing is
// fetched or embedded here automatically. Drop a track at this exact path
// (`public/audio/motivation-theme.mp3`, so Vite serves it at `/audio/
// motivation-theme.mp3`) and it starts working immediately, no code
// changes needed — until then this is silently a no-op (see the play()
// catch below), not a broken feature.
const MUSIC_SRC = '/audio/motivation-theme.mp3'

// Ramps an <audio> element's volume smoothly instead of snapping it, for
// both fade-in-on-open and fade-out-on-close. `onDone` (optional) fires
// once the ramp finishes, e.g. to pause() only after fading to silence.
function fadeAudioVolume(audio, to, ms, onDone) {
  const from = audio.volume
  const start = performance.now()
  function step(now) {
    const t = Math.min(1, (now - start) / ms)
    audio.volume = from + (to - from) * t
    if (t < 1) requestAnimationFrame(step)
    else onDone?.()
  }
  requestAnimationFrame(step)
}

// --- Fixed "mystical fortune-telling" palette -----------------------------
// This overlay is a deliberately different, special moment — not another
// screen of the app — so unlike the rest of the app it does NOT use the
// theme-aware --color-* CSS variables (bg-cream/text-ink/etc). That's a
// second, more robust fix for the illegible-speech-bubble bug those tokens
// caused: cream/pine are an *inverted* pair between dark and light themes
// (see index.css), so "bg-cream text-ink" — intended as a light bubble with
// dark text — silently became a dark-brown bubble with dark text in every
// light theme (cream inverts to a dark color there). Plain fixed hex values
// can't be affected by whatever theme the rest of the app is in.
const MYSTIC = {
  bgFrom: '#170f30',
  bgVia: '#211744',
  bgTo: '#0a0718',
  gold: '#e8c468',
  goldSoft: '#f2d98a',
  cream: '#f6ecd9', // warm parchment — body text on the dark overlay
  ink: '#2a1f38', // dark ink — text ON the parchment-colored bubble
  violet: '#6a4a8c',
  violetDeep: '#2f2148',
  violetDeeper: '#1c1430',
  rose: '#c8546b',
}

// --- Pixel art -----------------------------------------------------------
// Every sprite is authored as a half-width grid of palette keys and mirrored
// left/right (mirrorRow) so a symmetric design only needs writing once.
// Rendered as a plain grid of SVG <rect> "pixels" with crispEdges — no
// images, no dependency. Every palette value below is a fixed hex from
// MYSTIC (or a fixed brand color like tomato-red) — nothing here reads a
// theme token, per this overlay's own fixed palette (see MYSTIC above).
function mirrorRow(half) {
  return [...half, ...[...half].reverse()]
}

function PixelSprite({ halfRows, palette, unit = 6, className = '' }) {
  const rows = useMemo(() => halfRows.map(mirrorRow), [halfRows])
  const width = rows[0].length
  const height = rows.length
  return (
    <svg
      viewBox={`0 0 ${width * unit} ${height * unit}`}
      className={className}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {rows.map((row, y) =>
        row.map((cell, x) =>
          cell === '.' ? null : (
            <rect key={`${x}-${y}`} x={x * unit} y={y * unit} width={unit} height={unit} fill={palette[cell]} />
          )
        )
      )}
    </svg>
  )
}

// Just a tomato head with a mustache, sitting on a small stand — not a
// full robed "Tomato Man" figure (explicitly asked for something simpler
// and more directly tomato-shaped). Head silhouette is computed from the
// actual circle equation (same technique as the table below), the same
// fix that took the head from "strawberry" to "round" earlier — it's
// carried over here rather than hand-picked again, so proportions can't
// drift back. HEAD is its own sprite (not fused with the stand) so the
// poke easter egg's click target stays exactly the head, no hit-testing.
const CHARACTER_PALETTE = {
  g: '#4f8f57', // calyx leaves + stem
  r: '#c84b31', // tomato skin
  l: '#e0674a', // top-of-head highlight — a 3rd skin tone alongside r/d
  d: '#8f3220', // rim shading
  k: '#1c1310', // outline / eye pupils / small mouth peek
  w: '#fdf3e0', // eye highlight — fixed off-white, cute-character convention
  m: '#2b241f', // eyebrows + mustache — fixed near-black, a full "Turkish mustache"
}

const HEAD_CANVAS_HALF = 11
// Taller relative to its width than the first attempt (12 body rows on a
// width-22 canvas, aspect ~1.8:1) — that one read as too wide/horizontal
// to pass as a tomato. 16 rows on the same width (~1.4:1) is a genuinely
// round silhouette with still enough vertical room to space out eyebrows/
// eyes/mustache/chin without cramming them together.
const HEAD_BODY_ROWS = 16
const HEAD_WIDTH_PROFILE = Array.from({ length: HEAD_BODY_ROWS }, (_, i) => {
  const y = (i - (HEAD_BODY_ROWS - 1) / 2) / ((HEAD_BODY_ROWS - 1) / 2)
  return Math.round(HEAD_CANVAS_HALF * Math.sqrt(Math.max(0, 1 - y * y)))
})
// Modeled directly on a reference photo: a vertical stem, a fuller star-
// shaped calyx, arched eyebrows, and — the specific ask — a thick, full
// "Turkish mustache" (spanning multiple rows, not just a thin curled-tip
// line) with a small mouth peeking out just beneath it.
function buildHeadHalfRows() {
  const calyx = [
    ['.', '.', '.', '.', '.', '.', '.', '.', '.', '.', 'g'], // stem tip
    ['.', '.', '.', '.', '.', '.', 'g', '.', 'g', '.', 'g'], // leaf tips
    ['.', '.', '.', '.', 'g', 'g', 'g', 'g', 'g', 'g', 'g'], // leaf base, full star
  ]
  const body = HEAD_WIDTH_PROFILE.map((halfWidth, rowIndex) => {
    const row = new Array(HEAD_CANVAS_HALF).fill('.')
    const start = HEAD_CANVAS_HALF - halfWidth
    for (let col = start; col < HEAD_CANVAS_HALF; col++) {
      if (rowIndex === 1 || rowIndex === 2) row[col] = 'l' // top-of-head highlight band
      else if (rowIndex === 3 && (col === 6 || col === 7)) row[col] = 'm' // eyebrow (2px, more visible than 1)
      else if (rowIndex === 5 && col === 6) row[col] = 'k' // eye (upper half)
      else if (rowIndex === 6 && col === 5) row[col] = 'w' // eye highlight
      else if (rowIndex === 6 && col === 6) row[col] = 'k' // eye (lower half)
      // A varying width per row (narrow-wide-narrow, not one flat
      // rectangle) is what actually reads as a curled/wavy "Turkish
      // mustache" at this resolution — a uniform-width block just reads as
      // a straight dark bar no matter how the gap/tips are placed.
      else if (rowIndex === 8 && col === 10) row[col] = 'm' // curled tip, peeking up
      else if (rowIndex === 9 && col >= 2) row[col] = 'm' // widest — main band, gap at col 0-1 (philtrum)
      else if (rowIndex === 10 && col >= 4 && col <= 9) row[col] = 'm' // tapers back in
      else if (rowIndex === 11 && col === 4) row[col] = 'k' // small mouth peeking below the mustache
      else if (rowIndex >= 12 && rowIndex <= 14 && col === start) row[col] = 'd' // rim shading
      else row[col] = 'r'
    }
    return row
  })
  return [...calyx, ...body]
}
const HEAD_HALF_ROWS = buildHeadHalfRows()

// A small stand, not a body — explicitly not "Tomato Man." Gold collar
// where it meets the head's neck, tapering violet stand below.
const PEDESTAL_PALETTE = { a: MYSTIC.gold, p: MYSTIC.violetDeep }
const PEDESTAL_HALF_ROWS = [
  ['.', 'a', 'a', 'a', 'a'],
  ['.', 'p', 'p', 'p', 'p'],
  ['.', '.', 'p', 'p', 'p'],
  ['.', '.', '.', 'p', 'p'],
]

// --- Round mystical table --------------------------------------------------
// A round table (an ellipse, as seen from the natural seated viewing angle
// this whole scene is drawn from), velvet-topped with a gold rim, built
// programmatically from a per-row half-width profile rather than hand-typed
// — much less error-prone than authoring an ellipse silhouette by hand, and
// easy to reshape by editing one array of numbers.
// A proper ellipse (computed from the actual ellipse equation, not
// hand-picked numbers) at a taller aspect ratio than the first attempt —
// that version rendered only ~110px tall next to ~128px-tall cards, so the
// 3 overlapping cards nearly covered it entirely and what little peeked out
// around their edges read as a lumpy/heart-like blob rather than a table.
// This one is tall enough to stay clearly visible as a round surface under
// the triangle of cards.
const TABLE_CANVAS_HALF = 18
const TABLE_ROWS = 16
// y spans exactly -1..1 across the rows (not a padded range) so the very
// first/last row round down to a true zero-width point — an earlier version
// stayed a few pixels shy of ±1, leaving the top/bottom rows a few cells
// wide instead of a point, which read as a flat "shoulder" rather than a
// smooth curve once a card's straight bottom edge sat right on top of it.
const TABLE_HALF_WIDTH_PROFILE = Array.from({ length: TABLE_ROWS }, (_, i) => {
  const y = (i - (TABLE_ROWS - 1) / 2) / ((TABLE_ROWS - 1) / 2)
  return Math.round(TABLE_CANVAS_HALF * Math.sqrt(Math.max(0, 1 - y * y)))
})
const TABLE_PALETTE = {
  rim: MYSTIC.gold,
  v1: MYSTIC.violet,
  v2: MYSTIC.violetDeep,
  rune: MYSTIC.goldSoft,
}
function buildTableHalfRows() {
  return TABLE_HALF_WIDTH_PROFILE.map((halfWidth, rowIndex) => {
    const row = new Array(TABLE_CANVAS_HALF).fill('.')
    const start = TABLE_CANVAS_HALF - halfWidth
    for (let col = start; col < TABLE_CANVAS_HALF; col++) {
      if (col === start) {
        row[col] = 'rim'
      } else if (rowIndex >= 7 && rowIndex <= 8 && col >= TABLE_CANVAS_HALF - 5) {
        // A faint gold rune glimmer at the table's center, peeking out
        // between the triangle of cards resting on it.
        row[col] = 'rune'
      } else {
        // Row-based (not diagonal) banding — a `col + rowIndex` diagonal
        // check looked reasonable on paper but, once mirrored left/right,
        // produced two *opposite*-direction diagonals meeting in a visible
        // chevron/crease down the table's vertical center (confirmed by
        // rendering the table alone, without any cards on top of it). A
        // band that only depends on rowIndex is symmetric by construction
        // — identical on both mirrored halves — so it can't do that.
        row[col] = rowIndex % 3 === 0 ? 'v2' : 'v1'
      }
    }
    return row
  })
}
const TABLE_HALF_ROWS = buildTableHalfRows()

// Card back — ONE shared design for all 3 cards (not category-hinting —
// the category is only rolled at the moment of the flip, and this design
// doesn't vary card-to-card at all, so there's nothing to spoil): a
// hopeful sunflower centerpiece over a faint mystical lattice, framed by
// small corner flourishes and scattered sparkles. Drawn as smooth SVG
// (paths/ellipses/gradients), not the pixel-grid technique the rest of
// this file uses — a real sunflower needs layered, gently-curved petals
// and a textured seed head that a small rect grid just can't resolve; a
// single well-drawn vector piece reads far better here than another
// blocky pixel-art attempt did.
function SunflowerIcon({ className }) {
  // Seed texture follows the golden-angle spiral real sunflower heads
  // grow in (137.5°) — a small authentic touch, not just scattered dots.
  const seeds = Array.from({ length: 22 }, (_, i) => {
    const angle = i * 137.5 * (Math.PI / 180)
    const radius = 1.7 * Math.sqrt(i)
    return { x: 50 + radius * Math.cos(angle), y: 50 + radius * Math.sin(angle) }
  })
  const petalAngles = Array.from({ length: 13 }, (_, i) => (360 / 13) * i)

  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="petal-fill" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffe08a" />
          <stop offset="100%" stopColor="#f0a828" />
        </linearGradient>
        <radialGradient id="seed-fill" cx="35%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#8a5a2f" />
          <stop offset="100%" stopColor="#3d2712" />
        </radialGradient>
      </defs>

      <path d="M50 64 C 47 74, 45 84, 46 96" stroke="#4f8f57" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M46 82 C 36 80, 29 85, 27 93 C 38 94, 45 90, 46 82 Z" fill="#4f8f57" />
      <path d="M48 88 C 40 90, 35 97, 36 104 C 45 102, 49 96, 48 88 Z" fill="#3f7645" />

      <g>
        {petalAngles.map((angle) => (
          <ellipse
            key={angle}
            cx="50"
            cy="24"
            rx="7.5"
            ry="17"
            fill="url(#petal-fill)"
            stroke="#c9861f"
            strokeWidth="0.6"
            transform={`rotate(${angle} 50 50)`}
          />
        ))}
      </g>

      <circle cx="50" cy="50" r="18" fill="url(#seed-fill)" stroke="#2e1c0c" strokeWidth="1" />
      <g fill="#c9986a" opacity="0.7">
        {seeds.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r="1.3" />
        ))}
      </g>
    </svg>
  )
}

// Small 4-point sparkle scattered around the card back.
function SparkleIcon({ className, color = MYSTIC.goldSoft, style }) {
  return (
    <svg viewBox="0 0 10 10" className={className} style={style} aria-hidden="true">
      <path d="M5 0 L6.2 3.8 L10 5 L6.2 6.2 L5 10 L3.8 6.2 L0 5 L3.8 3.8 Z" fill={color} />
    </svg>
  )
}

// Wraps the category icon for its reveal beat — a quick pop-in always, and
// (isRare) a soft gold glow + a couple of twinkling sparkles layered on top
// for the bigger payoff moment. Purely cosmetic, mirrors playCategoryReveal
// (alert.js) firing at the same instant.
function RevealPop({ children, isRare = false }) {
  return (
    <div className="relative flex items-center justify-center">
      {isRare && (
        <div
          className="absolute -inset-3 rounded-full"
          style={{ background: `radial-gradient(circle, ${MYSTIC.gold}55, transparent 70%)` }}
          aria-hidden="true"
        />
      )}
      <div className={isRare ? 'animate-reveal-pop-rare' : 'animate-reveal-pop'}>{children}</div>
      {isRare && (
        <>
          <SparkleIcon
            className="absolute -top-2 -right-3 w-3.5 h-3.5 animate-twinkle"
            color={MYSTIC.gold}
            style={{ animationDuration: '1.1s' }}
          />
          <SparkleIcon
            className="absolute -bottom-1 -left-3 w-3 h-3 animate-twinkle"
            color={MYSTIC.goldSoft}
            style={{ animationDuration: '1.4s', animationDelay: '0.2s' }}
          />
        </>
      )}
    </div>
  )
}

// A small corner flourish (a curling vine-like stroke) — this is the
// "işlemeli" (embroidered) detail asked for, filling the corners with
// something more deliberate than a bare sparkle.
function CornerFlourish({ className }) {
  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden="true">
      <path
        d="M2 26 C2 14, 14 2, 26 2"
        fill="none"
        stroke={MYSTIC.gold}
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.8"
      />
      <path d="M2 26 C2 18, 6 12, 12 9" fill="none" stroke={MYSTIC.gold} strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <circle cx="26" cy="2" r="1.6" fill={MYSTIC.goldSoft} />
      <circle cx="14" cy="4.5" r="1" fill={MYSTIC.goldSoft} opacity="0.7" />
    </svg>
  )
}

// The shared card-back composition: a faint diamond lattice wash behind
// everything (just enough texture that the back doesn't read as flat),
// the sunflower centered, a curling flourish in each corner (rotated to
// point inward from whichever corner it sits in), and a few loose
// sparkles scattered across the remaining space.
function CardBackDesign() {
  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, ${MYSTIC.gold} 0, ${MYSTIC.gold} 1px, transparent 1px, transparent 10px), repeating-linear-gradient(-45deg, ${MYSTIC.gold} 0, ${MYSTIC.gold} 1px, transparent 1px, transparent 10px)`,
        }}
        aria-hidden="true"
      />
      <CornerFlourish className="absolute top-1.5 left-1.5 w-6 h-6 sm:w-7 sm:h-7" />
      <CornerFlourish className="absolute top-1.5 right-1.5 w-6 h-6 sm:w-7 sm:h-7 -scale-x-100" />
      <CornerFlourish className="absolute bottom-1.5 left-1.5 w-6 h-6 sm:w-7 sm:h-7 -scale-y-100" />
      <CornerFlourish className="absolute bottom-1.5 right-1.5 w-6 h-6 sm:w-7 sm:h-7 -scale-x-100 -scale-y-100" />

      <SunflowerIcon className="relative w-14 h-14 sm:w-16 sm:h-16" />

      <SparkleIcon className="absolute top-3 right-6 w-2.5 h-2.5 sm:w-3 sm:h-3" />
      <SparkleIcon className="absolute bottom-4 left-6 w-2 h-2 sm:w-2.5 sm:h-2.5 opacity-70" />
      <SparkleIcon className="absolute top-1/2 left-3 w-2 h-2 sm:w-2.5 sm:h-2.5 opacity-60" />
    </div>
  )
}

// --- Category icons --------------------------------------------------------
// Small, simple, iconic (not detailed scene art) — each is what appears on
// a card's face right after the flip, before the content panel fades in.

const HOURGLASS_PALETTE = { f: '#8a6a4a', s: MYSTIC.gold }
const HOURGLASS_HALF_ROWS = [
  ['f', 'f', 'f', 'f', 'f'],
  ['.', 's', 's', 's', '.'],
  ['.', '.', 's', '.', '.'],
  ['.', '.', 's', '.', '.'],
  ['.', '.', 's', '.', '.'],
  ['.', 's', 's', 's', '.'],
  ['f', 'f', 'f', 'f', 'f'],
]

const HEART_PALETTE = { h: MYSTIC.rose }
const HEART_HALF_ROWS = [
  ['.', 'h', '.', 'h', '.'],
  ['h', 'h', 'h', 'h', 'h'],
  ['h', 'h', 'h', 'h', 'h'],
  ['.', 'h', 'h', 'h', '.'],
  ['.', '.', 'h', '.', '.'],
]

const TOMATO_ICON_PALETTE = { g: '#4f8f57', r: '#c84b31', k: '#241a16' }
const TOMATO_ICON_HALF_ROWS = [
  ['.', '.', '.', 'g', '.'],
  ['.', '.', 'g', 'g', 'g'],
  ['.', 'r', 'r', 'r', 'r'],
  ['r', 'r', 'r', 'r', 'r'],
  ['r', 'r', 'k', 'r', 'r'],
  ['.', 'r', 'r', 'r', 'r'],
  ['.', '.', 'r', 'r', '.'],
]

const LIGHTBULB_PALETTE = { b: MYSTIC.gold, y: '#f2e08a', m: '#8a8a8a', k: '#4a4a4a' }
const LIGHTBULB_HALF_ROWS = [
  ['.', '.', 'b', '.', '.'],
  ['.', 'b', 'y', 'b', '.'],
  ['b', 'y', 'y', 'y', 'b'],
  ['b', 'y', 'y', 'y', 'b'],
  ['.', 'b', 'y', 'b', '.'],
  ['.', '.', 'm', '.', '.'],
  ['.', '.', 'm', '.', '.'],
  ['.', '.', 'k', '.', '.'],
]

const RARE_STAR_PALETTE = { y: MYSTIC.gold, w: '#fff7d6' }
const RARE_STAR_HALF_ROWS = [
  ['.', '.', 'y', '.', '.'],
  ['.', '.', 'y', '.', '.'],
  ['.', 'y', 'y', 'y', '.'],
  ['y', 'y', 'w', 'y', 'y'],
  ['.', 'y', 'y', 'y', '.'],
  ['.', '.', 'y', '.', '.'],
  ['.', '.', 'y', '.', '.'],
]

// Simple 3-bar ascending chart — inherently asymmetric (each bar a
// different height), so it's hand-drawn directly rather than through the
// mirrorRow helper, which would force it symmetric.
function BarChartIcon({ className }) {
  return (
    <svg viewBox="0 0 20 20" className={className} shapeRendering="crispEdges" aria-hidden="true">
      <rect x="1" y="12" width="5" height="7" fill={MYSTIC.violet} />
      <rect x="7.5" y="7" width="5" height="12" fill={MYSTIC.cream} />
      <rect x="14" y="2" width="5" height="17" fill="#c84b31" />
    </svg>
  )
}

const CATEGORY_ICONS = {
  focusDiscipline: (className) => (
    <PixelSprite halfRows={HOURGLASS_HALF_ROWS} palette={HOURGLASS_PALETTE} unit={6} className={className} />
  ),
  selfCompassion: (className) => (
    <PixelSprite halfRows={HEART_HALF_ROWS} palette={HEART_PALETTE} unit={6} className={className} />
  ),
  tomatoManJokes: (className) => (
    <PixelSprite halfRows={TOMATO_ICON_HALF_ROWS} palette={TOMATO_ICON_PALETTE} unit={6} className={className} />
  ),
  funFact: (className) => (
    <PixelSprite halfRows={LIGHTBULB_HALF_ROWS} palette={LIGHTBULB_PALETTE} unit={6} className={className} />
  ),
  personalStatCard: (className) => <BarChartIcon className={className} />,
  rare: (className) => (
    <PixelSprite halfRows={RARE_STAR_HALF_ROWS} palette={RARE_STAR_PALETTE} unit={6} className={className} />
  ),
}

// Exported so CardCollectionStats.jsx (Settings > Achievements) can render
// the same icon per category without duplicating any of the art above.
export function CategoryIcon({ category, className = 'w-6 h-6' }) {
  const render = CATEGORY_ICONS[category]
  return render ? render(className) : null
}

// --- Scene -----------------------------------------------------------------

// Small "enter" transition shared by several pieces below — starts hidden,
// flips true one frame after mount so the browser has a from-state to
// transition away from.
function useEntered() {
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return entered
}

// A proper speech-bubble container (bubble + downward tail) — parchment
// background with dark ink text, both fixed hex from MYSTIC, so contrast
// can never degrade regardless of which app theme is active underneath
// this overlay (see MYSTIC's own comment for the bug this replaces).
// The outer wrapper deliberately carries NO hardcoded position class of its
// own — `className` (supplied by the caller, e.g. "absolute -top-16 ...")
// controls positioning entirely. An earlier version hardcoded `relative`
// here alongside the caller's `absolute`: Tailwind's utilities define
// `.relative` after `.absolute` in its generated stylesheet, so when both
// classes land on the same element, `relative` silently won the cascade —
// the bubble rendered in normal document flow (pushing whatever came after
// it down the page) instead of truly detached/absolutely positioned above
// the head, and the visible symptom was the bubble appearing *below* the
// head with its tail pointing the wrong way. The inner div still needs its
// own `relative` as the tail's positioning context, which is unrelated to
// this element's own placement and doesn't conflict with anything.
function SpeechBubble({ text, className = '' }) {
  const entered = useEntered()
  return (
    <div className={`transition-all duration-300 ${entered ? 'opacity-100 scale-100' : 'opacity-0 scale-75'} ${className}`}>
      <div
        className="relative text-xs sm:text-sm leading-snug font-sans font-semibold px-4 py-2.5 rounded-2xl shadow-lg text-center"
        style={{ backgroundColor: MYSTIC.cream, color: MYSTIC.ink }}
      >
        {text}
        <span
          className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-8 border-x-transparent"
          style={{ borderTopWidth: 8, borderTopColor: MYSTIC.cream, borderTopStyle: 'solid' }}
        />
      </div>
    </div>
  )
}

// `bubbleText`/`bubbleKey` render as a single slot (poke reaction takes
// priority over the resting flavor-line hint — see MotivationOverlay's own
// computation of these two props) absolutely positioned against the head's
// own fixed-size wrapper, so a bubble appearing/disappearing/changing here
// can NEVER shift the Table or cards below — the whole point being fixed
// layout regardless of what's showing above it.
function TomatoCharacter({ onPokeHead, bubbleText, bubbleKey }) {
  return (
    <div className="relative flex flex-col items-center w-36 sm:w-44">
      {/* Soft ambient glow for the "mystical" read — motion-safe so it
          respects prefers-reduced-motion automatically without any extra
          plumbing. */}
      <div
        className="absolute top-0 w-28 h-28 sm:w-32 sm:h-32 rounded-full blur-xl motion-safe:animate-pulse"
        style={{ backgroundColor: `${MYSTIC.gold}33` }}
        aria-hidden="true"
      />
      <div className="relative w-full">
        {/* The head is its own element specifically so the poke easter egg
            can target just it — no hit-testing math needed against the
            combined figure. Purely decorative interaction: aria-hidden
            since it has zero effect on the actual card-pick flow. */}
        <div
          onClick={onPokeHead}
          aria-hidden="true"
          className="relative cursor-pointer active:scale-95 transition-transform"
        >
          <PixelSprite halfRows={HEAD_HALF_ROWS} palette={CHARACTER_PALETTE} unit={7} className="w-full h-auto" />
        </div>
        {bubbleText && (
          <SpeechBubble
            key={bubbleKey}
            text={bubbleText}
            // `bottom-full` (not a fixed -top offset) so the bubble always
            // sits flush above the head with a small gap, regardless of
            // the bubble's own height (which varies with text length) —
            // the head is below the bubble, so the tail (pointing down,
            // see SpeechBubble) correctly reads as coming from the
            // character speaking, not the other way around.
            className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-max max-w-[13rem] z-10"
          />
        )}
      </div>
      <PixelSprite
        halfRows={PEDESTAL_HALF_ROWS}
        palette={PEDESTAL_PALETTE}
        unit={7}
        className="relative w-14 sm:w-16 h-auto -mt-px drop-shadow-lg"
      />
    </div>
  )
}

// A soft glow beneath/around the table so it reads as a hovering mystical
// platform rather than a solid object sitting on a surface — the overlay
// itself has no "ground," so a glow is what sells "floating."
function Table() {
  return (
    <div className="relative flex items-center justify-center">
      {/* Fixed-size (not %-based) — a percentage height against this
          flex/auto-height wrapper would resolve to 0 (percentage heights
          need an explicitly-sized ancestor, which this deliberately isn't,
          since it just wraps the PixelSprite at its own intrinsic size).
          Roughly matches the table's own rendered footprint; it's a blurred
          glow, so it doesn't need to be pixel-exact. */}
      <div
        className="absolute w-80 h-32 sm:w-96 sm:h-40 rounded-full blur-2xl motion-safe:animate-pulse"
        style={{ backgroundColor: `${MYSTIC.gold}26` }}
        aria-hidden="true"
      />
      <PixelSprite halfRows={TABLE_HALF_ROWS} palette={TABLE_PALETTE} unit={7} className="relative w-full h-auto" />
    </div>
  )
}

// Tarot/playing-card framing: a double gold border with corner ticks around
// whichever face (back/front) is showing, plus a contact shadow beneath the
// whole card so it visually sits ON the table surface. Rare gets an extra
// bright-gold ring + soft shine instead of the standard gold border.
function CardFace({ children, className = '', style, rare = false }) {
  return (
    <div className={`absolute inset-0 rounded-xl [backface-visibility:hidden] ${className}`} style={style}>
      {rare && (
        <div
          className="absolute -inset-1 rounded-2xl opacity-80 blur-[3px] motion-safe:animate-pulse"
          style={{ background: `linear-gradient(135deg, ${MYSTIC.gold}, ${MYSTIC.cream}, ${MYSTIC.gold})` }}
          aria-hidden="true"
        />
      )}
      <div
        className="absolute inset-0 rounded-xl border-2 shadow-[0_8px_16px_rgba(0,0,0,0.45)]"
        style={{ borderColor: rare ? MYSTIC.goldSoft : `${MYSTIC.gold}99` }}
      />
      <div className="absolute inset-[5px] rounded-lg border" style={{ borderColor: `${MYSTIC.gold}40` }} />
      {[
        ['top-1 left-1', 'border-t border-l rounded-tl-sm'],
        ['top-1 right-1', 'border-t border-r rounded-tr-sm'],
        ['bottom-1 left-1', 'border-b border-l rounded-bl-sm'],
        ['bottom-1 right-1', 'border-b border-r rounded-br-sm'],
      ].map(([pos, edge]) => (
        <span
          key={pos}
          className={`absolute w-2 h-2 ${pos} ${edge}`}
          style={{ borderColor: rare ? MYSTIC.goldSoft : `${MYSTIC.gold}99` }}
        />
      ))}
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}

// `slot` positions the card in its resting triangle spot on the table
// (back/frontLeft/frontRight — see SLOT_STYLE below) via absolute
// bottom/left percentages, anchored from the card's own bottom edge so it
// naturally "stands" on the table surface at that point regardless of the
// card's fixed height. `shuffleClass` is only applied for the brief
// pre-pick shuffle beat (see index.css's card-shuffle-a/b/c).
function Card({
  category,
  isRare,
  categoryShown,
  flipped,
  hidden,
  disabled,
  onClick,
  label,
  hovered,
  onHoverChange,
  slotStyle,
  shuffleClass,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      disabled={disabled}
      aria-label={label}
      style={slotStyle}
      className={
        'absolute w-20 h-28 sm:w-24 sm:h-32 [perspective:900px] transition-opacity duration-300 ' +
        (hidden ? 'opacity-0 pointer-events-none' : 'opacity-100')
      }
    >
      {/* shuffleClass lives here, one level in from the button — the
          button's own `style={slotStyle}` sets an inline `transform:
          translateX(-50%)` for slot centering, and a CSS animation's
          transform always wins over an inline transform on the same
          element while it's running. Putting both on the same node meant
          the card lost its centering offset for the whole shuffle (only
          the animation's own translate/rotate applied), then visibly
          snapped back to center — "shifts left" — the instant the
          animation class was removed. Two separate elements means the
          slot position and the shuffle motion never fight over the same
          `transform`. */}
      <div
        className={
          'w-full h-full transition-transform duration-300 ' +
          shuffleClass +
          ' ' +
          (!flipped && hovered ? '-translate-y-2' : 'translate-y-0')
        }
      >
        {/* Contact shadow on the table surface, not a floaty drop-shadow on
            the card itself — this is what sells "resting on the table." A
            hovered, not-yet-picked card gets a slightly bigger/softer
            shadow to match it visually lifting. */}
        <div
          className={
            'absolute left-1/2 -translate-x-1/2 bg-black/45 rounded-full blur-[4px] transition-all duration-300 ' +
            (!flipped && hovered ? '-bottom-4 w-16 h-3.5 sm:w-20 sm:h-4' : '-bottom-2.5 w-14 h-3 sm:w-16 sm:h-3.5')
          }
          aria-hidden="true"
        />
        <div
          className={
            'relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] ' +
            (flipped ? '[transform:rotateY(180deg)]' : '') +
            (!flipped && hovered ? ' [box-shadow:0_10px_20px_rgba(0,0,0,0.35)]' : '')
          }
        >
          <CardFace style={{ backgroundColor: MYSTIC.violetDeeper }}>
            <CardBackDesign />
          </CardFace>
          {/* Front face: CSS backface-visibility naturally keeps this
              invisible until the rotateY transition passes 90°, so the
              card visibly "arrives" showing a mystery "?" first —
              `categoryShown` (set a beat later, see MotivationOverlay's
              handlePick) swaps it for the real category icon, with its own
              little pop-in and sound cue. */}
          <CardFace style={{ backgroundColor: MYSTIC.violetDeeper, transform: 'rotateY(180deg)' }} rare={isRare}>
            {categoryShown ? (
              <RevealPop>
                <CategoryIcon category={category} className="w-12 h-12 sm:w-14 sm:h-14" />
              </RevealPop>
            ) : (
              <span className="font-display text-4xl sm:text-5xl font-bold" style={{ color: MYSTIC.goldSoft }}>
                ?
              </span>
            )}
          </CardFace>
        </div>
      </div>
    </button>
  )
}

// Triangle formation: one card further back (higher/smaller-feeling) and
// two nearer the viewer — the classic 3-card spread. Positioned from the
// bottom so each card "stands" on the table regardless of its own height;
// see Card's slotStyle prop.
const SLOT_STYLE = [
  { bottom: '56%', left: '50%', transform: 'translateX(-50%)' }, // back
  { bottom: '22%', left: '21%', transform: 'translateX(-50%)' }, // front-left
  { bottom: '22%', left: '79%', transform: 'translateX(-50%)' }, // front-right
]
const SHUFFLE_CLASSES = ['animate-card-shuffle-a', 'animate-card-shuffle-b', 'animate-card-shuffle-c']

function GuessItReveal({ question, answer }) {
  const { t } = useTranslation()
  const [answerShown, setAnswerShown] = useState(false)
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="font-warm text-lg leading-snug text-center" style={{ color: MYSTIC.cream }}>
        {question}
      </p>
      {answerShown ? (
        <p className="font-sans text-base text-center" style={{ color: MYSTIC.gold }}>
          {answer}
        </p>
      ) : (
        <button
          type="button"
          onClick={() => setAnswerShown(true)}
          className="font-sans text-xs px-4 py-2 rounded-full border transition-colors"
          style={{ borderColor: `${MYSTIC.gold}55`, color: MYSTIC.cream }}
        >
          {t('motivation.guessItShowAnswer')}
        </button>
      )}
    </div>
  )
}

function ContentReveal({ category, isRare, content }) {
  const { t } = useTranslation()
  const entered = useEntered()
  return (
    <div
      className={
        'max-w-sm flex flex-col items-center gap-2 text-center transition-all duration-500 ' +
        (entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3')
      }
    >
      <p
        className="text-[10px] font-display tracking-widest uppercase flex items-center gap-1.5"
        style={{ color: MYSTIC.gold }}
      >
        {isRare && <span className="motion-safe:animate-pulse">✦</span>}
        {t(`motivation.categories.${category}.label`)}
        {isRare && <span className="motion-safe:animate-pulse">✦</span>}
      </p>
      {content.type === 'guessIt' ? (
        <GuessItReveal question={content.question} answer={content.answer} />
      ) : (
        <p className="font-display text-lg leading-snug" style={{ color: MYSTIC.cream }}>
          {content.text}
        </p>
      )}
    </div>
  )
}

// --- Background: a real (if simple) night sky, not a repeating dot tile --
// The first version tiled one radial-gradient at a fixed spacing, which —
// being a perfectly even grid — read as a printed polka-dot pattern rather
// than stars. Actual star positions/sizes/brightness are irregular, so
// this generates them with Math.random() instead (once per overlay-open,
// via useMemo — cheap: a few dozen small absolutely-positioned divs is
// nothing for a modal). A minority twinkle (see index.css's `twinkle`
// keyframe); most stay static, which reads calmer than everything pulsing
// in unison.
function useRandomPoints(count, factory) {
  return useMemo(() => Array.from({ length: count }, factory), [count, factory])
}

function Starfield() {
  const dim = useCallback(() => ({
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: 1 + Math.random() * 1.3,
    opacity: 0.15 + Math.random() * 0.45,
  }), [])
  const bright = useCallback(() => ({
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: 1.5 + Math.random() * 1.5,
    delay: Math.random() * 4,
    duration: 2.5 + Math.random() * 2.5,
  }), [])
  const dimStars = useRandomPoints(80, dim)
  const twinkleStars = useRandomPoints(16, bright)

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {dimStars.map((s, i) => (
        <div
          key={`d-${i}`}
          className="absolute rounded-full"
          style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, opacity: s.opacity, backgroundColor: MYSTIC.cream }}
        />
      ))}
      {twinkleStars.map((s, i) => (
        <div
          key={`t-${i}`}
          className="absolute rounded-full animate-twinkle"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            backgroundColor: MYSTIC.goldSoft,
            boxShadow: `0 0 4px ${MYSTIC.goldSoft}`,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        />
      ))}
    </div>
  )
}

// A few soft, differently-colored, differently-placed blurred blobs read as
// a nebula/cosmic haze — one flat centered circle (the original version)
// just looked like a single glow behind the character, not an atmosphere.
function Nebula() {
  const blobs = [
    { top: '-10%', left: '15%', w: '34rem', h: '30rem', color: MYSTIC.violet, opacity: 0.22 },
    { top: '10%', left: '60%', w: '26rem', h: '24rem', color: '#3a2a6b', opacity: 0.18 },
    { top: '55%', left: '30%', w: '30rem', h: '22rem', color: MYSTIC.gold, opacity: 0.08 },
  ]
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {blobs.map((b, i) => (
        <div
          key={i}
          className="absolute rounded-full blur-3xl"
          style={{ top: b.top, left: b.left, width: b.w, height: b.h, backgroundColor: b.color, opacity: b.opacity }}
        />
      ))}
    </div>
  )
}

// A mystical-themed stand-in for the shared CoachMark component, used only
// here — CoachMark.jsx itself stays exactly as it is (bg-pine-dark/
// text-tomato, following the active app theme) for every other section,
// since this overlay is the one deliberately theme-independent exception.
// Same title/body/dismiss/learn-more shape as CoachMark, just styled from
// MYSTIC instead, with font-display (already a monospace stack — see
// index.css's --font-display) for a "space terminal" read on the title
// instead of a new font import, consistent with this app's no-external-
// assets approach.
function MysticCoachMark({ titleKey, bodyKey, onDismiss, onLearnMore, className = '' }) {
  const { t } = useTranslation()
  return (
    <div
      className={`rounded-2xl px-5 py-4 shadow-2xl w-full border ${className}`}
      style={{ backgroundColor: MYSTIC.violetDeeper, borderColor: `${MYSTIC.gold}55`, color: `${MYSTIC.cream}cc` }}
    >
      <p
        className="font-display font-bold text-xs tracking-widest uppercase mb-1.5"
        style={{ color: MYSTIC.gold }}
      >
        {t(titleKey)}
      </p>
      <RichText text={t(bodyKey)} className="font-display text-sm leading-relaxed" />
      <div className="flex items-center gap-4 mt-3">
        <button
          type="button"
          onClick={onDismiss}
          className="font-display text-xs px-3 py-1.5 rounded-lg font-semibold"
          style={{ backgroundColor: MYSTIC.gold, color: MYSTIC.ink }}
        >
          {t('coachMarks.gotIt')}
        </button>
        <button
          type="button"
          onClick={onLearnMore}
          className="font-display text-xs underline decoration-dotted"
          style={{ color: MYSTIC.goldSoft }}
        >
          {t('coachMarks.learnMore')}
        </button>
      </div>
    </div>
  )
}

// Full-screen overlay (a CSS-fixed layer, not the browser Fullscreen API) —
// deliberately independent of Timer's own isFullscreen/controlsVisible
// auto-hide state, so it stays stable and fully visible for however long
// the user leaves it open, and opening/closing it never touches
// usePomodoro's countdown (which runs entirely inside that hook, driven by
// its own endAtRef/interval, regardless of what Timer renders on top of it).
function MotivationOverlay({
  used,
  onDraw,
  onClose,
  seenCoachMarks,
  onDismissCoachMark,
  onLearnMoreCoachMark,
  guestPreview = false,
  onSignUp,
}) {
  const { t } = useTranslation()
  const closeButtonRef = useRef(null)
  const previouslyFocused = useRef(document.activeElement)
  const [pickedIndex, setPickedIndex] = useState(null)
  const [hoveredIndex, setHoveredIndex] = useState(null)
  // categoryShown: the flipped card shows a "?" until this flips true, then
  // swaps to the real category icon (see Card's front face) — a beat of
  // suspense between "you picked one" and "here's what it is."
  const [categoryShown, setCategoryShown] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [draw, setDraw] = useState(null) // { category, subType, isRare, content }
  const [shuffling, setShuffling] = useState(true)
  // Picked once per overlay-open, not per render, so it stays stable while
  // this draw is in progress but varies the next time the overlay opens.
  const [flavorLine] = useState(() => pickRandom(t('motivation.flavorLines')))
  const categoryTimeoutRef = useRef(null)
  const revealTimeoutRef = useRef(null)
  const contentTimeoutRef = useRef(null)
  const shuffleTimeoutRef = useRef(null)
  const musicRef = useRef(null)

  // Background music — see MUSIC_SRC's own comment for why this is silent
  // until a file actually exists at that path. Not played for the
  // guest-preview teaser (no card game happening there to score). Faded in
  // on mount, faded out (then paused, via fadeAudioVolume's onDone) on
  // unmount rather than cut abruptly.
  useEffect(() => {
    if (guestPreview) return
    const audio = new Audio(MUSIC_SRC)
    audio.loop = true
    audio.volume = 0
    musicRef.current = audio
    audio.play().then(() => fadeAudioVolume(audio, MUSIC_VOLUME, MUSIC_FADE_MS)).catch(() => {
      // No file at MUSIC_SRC yet, or autoplay was blocked — the overlay
      // works exactly the same either way, just without music.
    })
    return () => {
      fadeAudioVolume(audio, 0, MUSIC_FADE_MS, () => audio.pause())
    }
  }, [guestPreview])

  // The guest-preview variant has no coach mark, no draw state, and no
  // Escape-suppressing dialogs of its own — seenCoachMarks isn't even
  // passed in that case (Timer.jsx doesn't gate a guest's coach-mark
  // progress on anything, since guests never reach the real overlay).
  const motivationCoachMark = guestPreview ? null : pickCoachMark('motivation', seenCoachMarks, {})
  // True only when the overlay was opened after the Pomodoro's one draw was
  // already used previously — NOT during the current draw's own flip/icon-
  // hold animation, even though `used` itself flips true the instant a card
  // is clicked (see handlePick's onDraw() call).
  const alreadyDrawn = used && pickedIndex === null

  // Easter egg: clicking the character's head shows a brief reaction
  // bubble. Purely decorative — no effect on pickedIndex/onDraw/`used` at
  // all, can be triggered repeatedly, independent of the card-pick flow.
  const [pokeText, setPokeText] = useState(null)
  const [pokeId, setPokeId] = useState(0)
  const pokeTimeoutRef = useRef(null)

  function handlePokeHead(e) {
    e.stopPropagation()
    setPokeText(pickRandom(t('motivation.headPokeReactions')))
    setPokeId((id) => id + 1)
    if (pokeTimeoutRef.current) clearTimeout(pokeTimeoutRef.current)
    pokeTimeoutRef.current = setTimeout(() => setPokeText(null), POKE_DURATION_MS)
  }

  useEffect(() => {
    // A user gesture already opened this overlay (the motivation button
    // click), so it's safe to unlock audio here rather than waiting for a
    // card click — the shuffle sound needs it immediately.
    unlockAudio()
    if (!guestPreview) playCardShuffle()
    shuffleTimeoutRef.current = setTimeout(() => setShuffling(false), SHUFFLE_MS)
    return () => {
      if (pokeTimeoutRef.current) clearTimeout(pokeTimeoutRef.current)
      if (categoryTimeoutRef.current) clearTimeout(categoryTimeoutRef.current)
      if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current)
      if (contentTimeoutRef.current) clearTimeout(contentTimeoutRef.current)
      if (shuffleTimeoutRef.current) clearTimeout(shuffleTimeoutRef.current)
    }
  }, [guestPreview])

  useEffect(() => {
    closeButtonRef.current?.focus()
    const trigger = previouslyFocused.current
    return () => {
      trigger?.focus?.()
    }
  }, [])

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function handlePick(index) {
    if (used || pickedIndex !== null || shuffling) return
    const result = drawCard({ t, ticks: loadTicks(), activityLog: loadActivityLog() })
    setPickedIndex(index)
    setDraw(result)
    onDraw()
    playCardPick()
    addCardDraw({
      id: crypto.randomUUID(),
      category: result.category,
      subType: result.subType,
      isRare: result.isRare,
      date: todayString(),
      timestamp: new Date().toISOString(),
    })
    // Three beats: flip (CSS, CARD_FLIP_MS) -> "?" shown, a moment of
    // suspense (mysteryHold) -> the real category icon swaps in (with its
    // own sound, bigger for Rare) -> content fades in below (iconHold
    // later still). Rare gets a longer hold at both beats for extra
    // anticipation before the payoff.
    const mysteryHold = result.isRare ? MYSTERY_HOLD_MS_RARE : MYSTERY_HOLD_MS
    const iconHold = result.isRare ? ICON_HOLD_MS_RARE : ICON_HOLD_MS
    categoryTimeoutRef.current = setTimeout(() => {
      playCardMystery()
    }, CARD_FLIP_MS)
    revealTimeoutRef.current = setTimeout(() => {
      setCategoryShown(true)
      playCategoryReveal({ isRare: result.isRare })
      contentTimeoutRef.current = setTimeout(() => setRevealed(true), iconHold)
    }, CARD_FLIP_MS + mysteryHold)
  }

  // Single bubble slot — the poke reaction always wins over the resting
  // hint (they'd otherwise render in the exact same spot). Kept as one
  // `bubbleText`/`bubbleKey` pair so TomatoCharacter only ever needs to
  // know about one absolutely-positioned bubble, not two competing ones.
  const restingBubbleText = guestPreview
    ? t('motivation.guestPreviewBubble')
    : !revealed && !alreadyDrawn
      ? pickedIndex === null
        ? flavorLine
        : t('motivation.revealAgainHint')
      : null
  const bubbleText = pokeText ?? restingBubbleText
  const bubbleKey = pokeText ? `poke-${pokeId}` : 'resting'

  return (
    <div
      className="rgb-safe fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 p-6 overflow-y-auto"
      style={{ background: `linear-gradient(180deg, ${MYSTIC.bgFrom}, ${MYSTIC.bgVia} 55%, ${MYSTIC.bgTo})` }}
      role="dialog"
      aria-modal="true"
      aria-label={t('motivation.buttonAria')}
      onClick={onClose}
    >
      <Nebula />
      <Starfield />

      {/* Fixed corner placement — a coach mark appearing here must never
          shift the character/table/cards, same rule as Timer's own coach
          mark (see Timer.jsx). Positioned within this already-fixed
          overlay rather than participating in the centered column's flex
          flow. */}
      {motivationCoachMark && (
        <div
          className="fixed z-20 top-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:w-80"
          onClick={(e) => e.stopPropagation()}
        >
          <MysticCoachMark
            titleKey={motivationCoachMark.titleKey}
            bodyKey={motivationCoachMark.bodyKey}
            onDismiss={() => onDismissCoachMark(motivationCoachMark.id)}
            onLearnMore={() => onLearnMoreCoachMark(motivationCoachMark.id)}
          />
        </div>
      )}

      <div
        className="relative flex flex-col items-center gap-3 max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="self-end text-2xl leading-none transition-colors"
          style={{ color: `${MYSTIC.cream}99` }}
          onMouseEnter={(e) => (e.currentTarget.style.color = MYSTIC.cream)}
          onMouseLeave={(e) => (e.currentTarget.style.color = `${MYSTIC.cream}99`)}
          aria-label={t('motivation.overlayCloseAria')}
        >
          ×
        </button>

        <TomatoCharacter onPokeHead={handlePokeHead} bubbleText={bubbleText} bubbleKey={bubbleKey} />

        {guestPreview ? (
          <div className="text-center flex flex-col items-center gap-4 max-w-xs mt-8">
            <p className="font-sans text-sm leading-relaxed" style={{ color: `${MYSTIC.cream}cc` }}>
              {t('motivation.guestPreviewMessage')}
            </p>
            <button
              type="button"
              onClick={onSignUp}
              className="font-sans text-sm font-semibold px-6 py-2.5 rounded-full bg-tomato text-on-tomato"
            >
              {t('auth.signUpButton')}
            </button>
          </div>
        ) : alreadyDrawn ? (
          <div className="text-center flex flex-col gap-1.5 max-w-xs mt-8">
            <p className="font-warm text-sm" style={{ color: MYSTIC.cream }}>
              {t('motivation.alreadyDrawnTitle')}
            </p>
            <p className="font-sans text-xs" style={{ color: `${MYSTIC.cream}aa` }}>
              {t('motivation.alreadyDrawnMessage')}
            </p>
          </div>
        ) : (
          <>
            {/* Round table with the 3 cards positioned in a triangle
                directly on top of it (see SLOT_STYLE) — one relative
                container sized to the table so the cards' bottom-anchored
                percentages resolve against its actual rendered box. The
                picked card stays visible (still flipped, still showing its
                icon/Rare glow) even once `revealed` becomes true; the
                content panel below is additive, not a replacement. */}
            <div className="relative w-96 sm:w-[28rem] mt-2">
              <Table />
              {[0, 1, 2].map((i) => (
                <Card
                  key={i}
                  category={draw?.category}
                  isRare={draw?.isRare ?? false}
                  categoryShown={categoryShown}
                  flipped={pickedIndex === i}
                  hidden={pickedIndex !== null && pickedIndex !== i}
                  disabled={shuffling || pickedIndex !== null}
                  hovered={hoveredIndex === i}
                  onHoverChange={(v) => setHoveredIndex(v ? i : null)}
                  onClick={() => handlePick(i)}
                  label={t('motivation.pickPrompt')}
                  slotStyle={SLOT_STYLE[i]}
                  shuffleClass={shuffling ? SHUFFLE_CLASSES[i] : ''}
                />
              ))}
            </div>

            {revealed && draw && (
              <div className="min-h-40 flex items-center justify-center mt-3">
                <ContentReveal category={draw.category} isRare={draw.isRare} content={draw.content} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default MotivationOverlay
