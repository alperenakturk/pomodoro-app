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
export const CATEGORY_COLORS = [
  { name: 'Teal', value: '#4a8c82' },
  { name: 'Plum', value: '#8a5a7d' },
  { name: 'Slate', value: '#5b7290' },
  { name: 'Moss', value: '#6b8a4f' },
  { name: 'Mustard', value: '#c9a227' },
  { name: 'Rose', value: '#b56576' },
  { name: 'Ochre', value: '#b8803f' },
  { name: 'Indigo', value: '#5a5a9c' },
]
