// Rule 4: tasks estimated above this should be broken down into sub-tasks.
export const MAX_RECOMMENDED_ESTIMATE = 7

// Shared Tailwind classes for the text/number inputs in inline edit forms
// (Inventory, Today's Tasks).
export const inputClass =
  'bg-cream/5 border border-cream/15 rounded-xl text-cream placeholder:text-sage/50 outline-none focus:border-tomato focus:ring-2 focus:ring-tomato/40 px-3 py-2 text-sm font-sans'

// Records Log's inline row editor is more compact (smaller padding/text, no
// placeholder color, less rounding) to fit inside a table row.
export const compactInputClass =
  'bg-cream/5 border border-cream/15 rounded-lg text-cream outline-none focus:border-tomato focus:ring-2 focus:ring-tomato/40 px-2 py-1 text-xs font-sans'

// A small curated palette for user-created categories — deliberately not
// reusing tomato/amber, which already mean specific things elsewhere (work/
// danger and break/"took less", respectively); a category swatch in one of
// those colors would visually collide with the diff charts. Muted, warm
// tones chosen to fit the app's existing earthy palette without clashing.
// `name` is the English dev-facing label (used as a fallback and in
// non-UI contexts); `key` looks up the translated label via
// t(`categoryColors.${key}`) wherever the color name is shown to the user.
export const CATEGORY_COLORS = [
  { name: 'Teal', key: 'teal', value: '#4a8c82' },
  { name: 'Plum', key: 'plum', value: '#8a5a7d' },
  { name: 'Slate', key: 'slate', value: '#5b7290' },
  { name: 'Moss', key: 'moss', value: '#6b8a4f' },
  { name: 'Mustard', key: 'mustard', value: '#c9a227' },
  { name: 'Rose', key: 'rose', value: '#b56576' },
  { name: 'Ochre', key: 'ochre', value: '#b8803f' },
  { name: 'Indigo', key: 'indigo', value: '#5a5a9c' },
]

// Seeded once (see useCategories.js) for a brand new account/guest with no
// categories at all yet — a reasonable, editable/deletable starting point
// rather than an empty list. `labelKey` looks up the localized name via
// t(`defaultCategories.${labelKey}`); `colorIndex` picks from CATEGORY_COLORS
// above, spread out rather than adjacent so the starter set reads as visually
// distinct at a glance.
export const DEFAULT_CATEGORY_SEEDS = [
  { labelKey: 'work', colorIndex: 2 }, // Slate
  { labelKey: 'study', colorIndex: 0 }, // Teal
  { labelKey: 'personal', colorIndex: 5 }, // Rose
  { labelKey: 'admin', colorIndex: 4 }, // Mustard
  { labelKey: 'health', colorIndex: 3 }, // Moss
]
