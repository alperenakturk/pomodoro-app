import { useMemo } from 'react'

// Shared color-swatch dot for the two dropdown-style category pickers
// (CategoryTagPicker's multi-select, CategorySelect's single-pick) — larger
// and bordered, distinct by design from CategoryTag's own smaller, borderless
// dot below (an inline badge next to a task/record's name has less room and
// a different visual weight than a dropdown row). Previously defined
// identically in both CategoryTagPicker.jsx and CategorySelect.jsx.
export function Dot({ color }) {
  return (
    <span
      className="w-2 h-2 rounded-full flex-shrink-0 border border-cream/20"
      style={color ? { backgroundColor: color } : undefined}
    />
  )
}

// A single category badge (colored dot + name) — TodoToday/Inventory/
// RecordsLog each defined this identically except for the wrapping <span>'s
// className, which genuinely differs per call site's own layout (padding,
// margin, flex vs inline-flex) — see CategoryTags' own tagClassName prop.
// `className` is required (not defaulted) so every call site stays
// pixel-identical to what it rendered before this file existed, rather than
// silently picking up some new shared default. Exported directly (not just
// via CategoryTags) for RecordsLog's VoidLogRow, which already has a single
// resolved category object on hand (not a categoryIds array to resolve).
export function CategoryTag({ category, className }) {
  return (
    <span className={className}>
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: category.color }}
        aria-hidden="true"
      />
      {category.name}
    </span>
  )
}

// Resolves categoryIds -> category objects and renders one CategoryTag per
// match, dropping any id that no longer resolves (deleted/legacy category —
// the record simply shows fewer tags, no crash, same as before this file
// existed). The id -> category Map is built once per `categories` reference
// (useMemo, not on every call) rather than each tag doing its own
// `categories.find(...)` scan — with n tags on a record and m categories
// overall, that's an O(n) Map-lookup pass instead of an O(n*m) linear-scan
// pass. `categories` is normally a stable array reference across unrelated
// re-renders (React state that only changes when categories themselves
// change), so in practice this Map is rebuilt only when it actually needs to
// be. See OPTIMIZATIONS.md finding #5 for the full duplication/complexity
// write-up this consolidates.
export function CategoryTags({ categoryIds, categories, tagClassName }) {
  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const resolved = categoryIds.map((id) => byId.get(id)).filter(Boolean)
  if (resolved.length === 0) return null
  return (
    <>
      {resolved.map((category) => (
        <CategoryTag key={category.id} category={category} className={tagClassName} />
      ))}
    </>
  )
}
