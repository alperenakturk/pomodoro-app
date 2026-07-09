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
