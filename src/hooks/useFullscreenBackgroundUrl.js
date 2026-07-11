import { useEffect, useState } from 'react'
import { getFullscreenBackgroundUrl } from '../lib/backgroundStorage'

// Resolves a signed Storage URL only while `active` (Timer.jsx's
// isFullscreen) is true and a path is set — the bucket is private (see
// backgroundStorage.js), so there's no permanent URL to just read off
// settings; a fresh signed URL is requested each time fullscreen is
// entered, rather than cached indefinitely, in case the previous one is at
// or near its 1-hour TTL. Returns null while there's nothing to show
// (guest, no image set, not fullscreen, or the sign request failed).
export function useFullscreenBackgroundUrl(path, active) {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    if (!active || !path) {
      setUrl(null)
      return
    }
    let cancelled = false
    getFullscreenBackgroundUrl(path).then(({ url: signedUrl }) => {
      if (!cancelled) setUrl(signedUrl)
    })
    return () => {
      cancelled = true
    }
  }, [path, active])

  return url
}
