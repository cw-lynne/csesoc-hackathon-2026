// Reveal — a small, reusable entrance animation for tiles, cards and panels.
//
// Fades + rises its children into view. Pass `index` to stagger a group (a grid
// of tiles loads in sequence). Uses IntersectionObserver so below-the-fold tiles
// animate as they scroll into view, while above-the-fold ones animate right after
// mount. It only animates opacity/transform (GPU-friendly, no layout thrash) and
// no-ops under prefers-reduced-motion — the content is always rendered, so it
// never blocks interaction or hurts accessibility.
import React, { useEffect, useRef, useState } from 'react'

const REDUCED = typeof window !== 'undefined' && window.matchMedia
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function Reveal({
  children,
  index = 0,        // position in a staggered group
  step = 60,        // ms between staggered items
  delay = 0,        // extra ms before this item starts
  y = 10,           // px it rises from
  duration = 440,   // ms of the transition
  once = true,      // stop observing after the first reveal
  style,
  className,
  ...rest
}) {
  const ref = useRef(null)
  const [shown, setShown] = useState(REDUCED)

  useEffect(() => {
    if (REDUCED || shown) return
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') { setShown(true); return }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          setShown(true)
          if (once) io.disconnect()
          break
        }
      }
    }, { threshold: 0.06, rootMargin: '0px 0px -32px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [once, shown])

  const motion = REDUCED ? null : {
    opacity: shown ? 1 : 0,
    transform: shown ? 'none' : `translateY(${y}px)`,
    transition: `opacity ${duration}ms ease, transform ${duration}ms cubic-bezier(0.22, 0.61, 0.36, 1)`,
    transitionDelay: `${delay + index * step}ms`,
    willChange: shown ? 'auto' : 'opacity, transform',
  }

  return (
    <div ref={ref} className={className} style={{ ...style, ...motion }} {...rest}>
      {children}
    </div>
  )
}
