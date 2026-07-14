import { parseRichText } from '../lib/richText'

// Renders CoachMark/MethodologyGuideModal body text (see lib/richText.js's
// tiny heading/list/paragraph convention). Font size, color, and line-height
// are deliberately left to the caller's `className` on the wrapping div and
// inherited by the paragraph/list children via normal CSS inheritance — only
// headings override color/weight explicitly, since they need to stand out
// regardless of what the surrounding body text looks like.
function RichText({ text, className = '' }) {
  return (
    <div className={className}>
      {parseRichText(text).map((block, i) => {
        if (block.type === 'heading') {
          return (
            <p key={i} className="text-cream font-semibold mt-3 mb-1 first:mt-0">
              {block.text}
            </p>
          )
        }
        if (block.type === 'list') {
          return (
            <ul key={i} className="list-disc pl-5 space-y-1 mb-3 last:mb-0">
              {block.items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          )
        }
        return (
          <p key={i} className="mb-3 last:mb-0">
            {block.text}
          </p>
        )
      })}
    </div>
  )
}

export default RichText
