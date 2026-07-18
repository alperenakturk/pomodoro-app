#!/usr/bin/env node
// Parses every theme class block in src/index.css and checks WCAG contrast
// for the color pairs that actually matter app-wide: sage (secondary text)
// against both pine (page bg) and pine-dark (card bg) must clear 4.5:1
// (WCAG AA normal text — most `text-sage` usage is small captions/labels,
// not large/bold text, so the lighter 3:1 "large text" floor doesn't apply
// here); tomato/short-break/long-break against pine must clear 3:1 (WCAG's
// UI-component/large-text floor — these are accents/pills, not paragraph
// text). See the "Color & Typography System Overhaul" plan for why these
// specific thresholds were chosen.
//
// Run with: node scripts/check-contrast.mjs
// Exits non-zero if any theme fails, so it can also gate CI later if wanted.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cssPath = join(__dirname, '..', 'src', 'index.css')
const css = readFileSync(cssPath, 'utf8')

function hexToRgb(hex) {
  const c = hex.replace('#', '')
  return {
    r: parseInt(c.slice(0, 2), 16),
    g: parseInt(c.slice(2, 4), 16),
    b: parseInt(c.slice(4, 6), 16),
  }
}

function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex)
  const f = (channel) => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

function contrast(hexA, hexB) {
  const lA = relativeLuminance(hexA)
  const lB = relativeLuminance(hexB)
  const [lighter, darker] = lA > lB ? [lA, lB] : [lB, lA]
  return (lighter + 0.05) / (darker + 0.05)
}

const TOKEN_RE = /--color-([\w-]+):\s*(#[0-9a-fA-F]{6})/g

function extractTokens(body) {
  const tokens = {}
  let tokenMatch
  const tokenRe = new RegExp(TOKEN_RE)
  while ((tokenMatch = tokenRe.exec(body))) {
    tokens[tokenMatch[1]] = tokenMatch[2]
  }
  return tokens
}

// The @theme block's own declarations are the base defaults every theme
// class inherits unless it explicitly overrides a token — tomato/amber are
// invariant precisely because no theme block ever redeclares them, so
// without this base merge a per-theme tomato-on-pine check would silently
// skip every theme except .dark (the only block that happens to redeclare
// it today).
const themeBlockMatch = css.match(/@theme\s*\{([^}]*)\}/)
const baseTokens = themeBlockMatch ? extractTokens(themeBlockMatch[1]) : {}

// Matches `.name { ...body... }` or `.name,\n.alias { ...body... }` blocks —
// good enough for this file's actual structure (no nested selectors inside
// a theme block).
const THEME_BLOCK_RE = /((?:\.[\w-]+,?\s*)+)\{([^}]*)\}/g

const themes = []
let match
while ((match = THEME_BLOCK_RE.exec(css))) {
  const selectorText = match[1]
  const body = match[2]
  const names = selectorText
    .split(',')
    .map((s) => s.trim().replace(/^\./, ''))
    .filter(Boolean)
  const ownTokens = extractTokens(body)
  // Only care about blocks that actually define a theme THEMSELVES (must
  // redeclare pine + cream + sage) — checked against the block's own
  // tokens, before merging in @theme's base defaults, or every unrelated
  // rule in the file (keyframes, animation classes) would pass too since
  // they'd all inherit the same base pine/cream/sage.
  if (ownTokens.pine && ownTokens.cream && ownTokens.sage) {
    themes.push({ names, tokens: { ...baseTokens, ...ownTokens } })
  }
}

if (themes.length === 0) {
  console.error('No theme blocks found in src/index.css — regex may need updating.')
  process.exit(1)
}

const SAGE_FLOOR = 4.5
const ACCENT_FLOOR = 3.0

let anyFailure = false

for (const { names, tokens } of themes) {
  const label = names.join(', ')
  const pine = tokens.pine
  const pineDark = tokens['pine-dark'] ?? pine
  const sage = tokens.sage
  const tomato = tokens.tomato // undefined for override blocks that don't redeclare it — fine, it's invariant
  const tomatoText = tokens['tomato-text']
  const amberText = tokens['amber-text']
  const shortBreak = tokens['short-break']
  const longBreak = tokens['long-break']
  const onShortBreak = tokens['on-short-break']
  const onLongBreak = tokens['on-long-break']
  const freeze = tokens.freeze
  const freezeText = tokens['freeze-text']

  const rows = []
  const check = (name, fg, bg, floor) => {
    if (!fg || !bg) return
    const ratio = contrast(fg, bg)
    const pass = ratio >= floor
    if (!pass) anyFailure = true
    rows.push({ name, ratio, floor, pass })
  }

  check('sage-on-pine', sage, pine, SAGE_FLOOR)
  check('sage-on-pine-dark', sage, pineDark, SAGE_FLOOR)
  check('tomato-on-pine', tomato, pine, ACCENT_FLOOR)
  // tomato-text is the small-body-text variant (see index.css's own
  // comment) — held to the stricter 4.5:1 normal-text floor, same as sage,
  // since that's specifically what it exists to satisfy at the ~30 call
  // sites that needed it.
  check('tomato-text-on-pine', tomatoText, pine, SAGE_FLOOR)
  check('tomato-text-on-pine-dark', tomatoText, pineDark, SAGE_FLOOR)
  check('amber-text-on-pine', amberText, pine, SAGE_FLOOR)
  check('amber-text-on-pine-dark', amberText, pineDark, SAGE_FLOOR)
  check('short-break-on-pine', shortBreak, pine, ACCENT_FLOOR)
  check('long-break-on-pine', longBreak, pine, ACCENT_FLOOR)
  // Solid-fill active-pill label colors (Timer's session switcher) — held
  // to the 4.5:1 normal-text floor like on-tomato, since pill labels are
  // ~11px text, not large/bold enough for the 3:1 exemption.
  check('on-short-break-on-short-break', onShortBreak, shortBreak, SAGE_FLOOR)
  check('on-long-break-on-long-break', onLongBreak, longBreak, SAGE_FLOOR)
  check('freeze-on-pine', freeze, pine, ACCENT_FLOOR)
  // freeze-text is the small-body-text variant (streak freeze explainer/
  // badge copy) — same 4.5:1 floor as tomato-text/amber-text.
  check('freeze-text-on-pine', freezeText, pine, SAGE_FLOOR)
  check('freeze-text-on-pine-dark', freezeText, pineDark, SAGE_FLOOR)

  console.log(`\n${label}`)
  for (const row of rows) {
    const status = row.pass ? 'PASS' : 'FAIL'
    console.log(`  [${status}] ${row.name.padEnd(20)} ${row.ratio.toFixed(2)}:1  (needs ${row.floor}:1)`)
  }
}

// on-tomato is invariant (never redeclared per theme, same reasoning as
// tomato itself — see index.css's comment) — checked once against the base
// @theme tokens rather than per-theme. Held to the 4.5:1 normal-text floor:
// the button labels it's used for (e.g. Timer.jsx's "Start" button) are
// ~16px semibold, which doesn't qualify for the WCAG large-text exemption.
{
  const onTomato = baseTokens['on-tomato']
  const tomato = baseTokens.tomato
  if (onTomato && tomato) {
    const ratio = contrast(onTomato, tomato)
    const pass = ratio >= SAGE_FLOOR
    if (!pass) anyFailure = true
    console.log(`\n(invariant)`)
    console.log(`  [${pass ? 'PASS' : 'FAIL'}] on-tomato-on-tomato     ${ratio.toFixed(2)}:1  (needs ${SAGE_FLOOR}:1)`)
  }
}

console.log('')
if (anyFailure) {
  console.error('One or more theme/token pairs fall below their WCAG floor. See FAIL rows above.')
  process.exit(1)
} else {
  console.log('All themes pass their contrast floors.')
}
