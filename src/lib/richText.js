// A tiny markup convention for coach-mark/guide body text — not full
// markdown, just enough structure to avoid dash-joined run-on sentences and
// let a topic with several distinct points read as an actual list instead
// of one dense paragraph. Blocks are separated by a blank line (\n\n):
//   - a block whose only line starts with "## " is a heading
//   - a block whose every line starts with "- " is a bullet list
//   - anything else is a plain paragraph
// A pure function (not JSX), so it lives in lib/ rather than a component
// file — same reasoning as pomodoroMath.js/timetable.js being split out.
export function parseRichText(text) {
  if (!text) return []
  return text
    .split('\n\n')
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      if (block.startsWith('## ')) {
        return { type: 'heading', text: block.slice(3).trim() }
      }
      const lines = block
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
      if (lines.length > 0 && lines.every((line) => line.startsWith('- '))) {
        return { type: 'list', items: lines.map((line) => line.slice(2).trim()) }
      }
      return { type: 'paragraph', text: block }
    })
}
