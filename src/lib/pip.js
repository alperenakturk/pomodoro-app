// Document Picture-in-Picture API feature detection. Safari and older
// browsers simply don't have `window.documentPictureInPicture` — callers use
// this to hide the PiP toggle entirely rather than show a button that errors
// out, with document.title's countdown remaining the universal fallback.
export function isPipSupported() {
  return typeof window !== 'undefined' && 'documentPictureInPicture' in window
}

// A freshly opened PiP window's <html>/<body> have no explicit height, so a
// child using `h-full` has nothing to size against and collapses to its
// content's height — leaving the rest of the (transparent, browser-white)
// window exposed below it. Force both to fill the window before anything
// renders into it.
export function fillPipDocument(pipWindow) {
  pipWindow.document.documentElement.style.height = '100%'
  pipWindow.document.body.style.height = '100%'
  pipWindow.document.body.style.margin = '0'
}

// A freshly opened Picture-in-Picture window starts with a blank document —
// this copies every stylesheet from the main document into it (the pattern
// documented for the Document Picture-in-Picture API) so content rendered
// into it picks up the app's existing Tailwind utility classes and color
// tokens without redefining any of them.
export function copyStylesToWindow(pipWindow) {
  for (const styleSheet of document.styleSheets) {
    try {
      const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('')
      const style = document.createElement('style')
      style.textContent = cssRules
      pipWindow.document.head.appendChild(style)
    } catch {
      // Cross-origin stylesheets throw reading cssRules — fall back to a
      // <link> pointing at the same href instead of inlining it.
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.type = styleSheet.type
      link.media = styleSheet.media
      link.href = styleSheet.href
      pipWindow.document.head.appendChild(link)
    }
  }
}
