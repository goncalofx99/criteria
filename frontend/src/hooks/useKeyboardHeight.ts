import { useEffect, useState } from 'react'

/**
 * Returns the current keyboard height (in px) on iOS/Android WebViews.
 * Uses the VisualViewport API: when the keyboard opens, visualViewport.height
 * shrinks relative to window.innerHeight. The difference is the keyboard height.
 *
 * Returns 0 on desktop or when keyboard is closed.
 */
export function useKeyboardHeight(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    function onResize() {
      const vv = window.visualViewport!
      // The keyboard height is the difference between the layout viewport and the visual viewport
      const kbHeight = Math.max(0, window.innerHeight - vv.height)
      // Only report if significant (> 100px) to avoid false positives from address bar changes
      setKeyboardHeight(kbHeight > 100 ? kbHeight : 0)
    }

    vv.addEventListener('resize', onResize)
    return () => vv.removeEventListener('resize', onResize)
  }, [])

  return keyboardHeight
}
