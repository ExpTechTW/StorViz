'use client'

import { useEffect, useRef } from 'react'

export function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = glowRef.current
    if (!el) return

    let frame = 0
    let x = 0
    let y = 0

    const onMove = (event: MouseEvent) => {
      x = event.clientX
      y = event.clientY
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        el.style.transform = `translate3d(${x - 150}px, ${y - 150}px, 0)`
      })
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', onMove)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div
      ref={glowRef}
      className="fixed pointer-events-none z-10"
      style={{
        left: 0,
        top: 0,
        width: '300px',
        height: '300px',
        transform: 'translate3d(-150px, -150px, 0)',
        willChange: 'transform',
      }}
    >
      <div className="w-full h-full bg-primary/8 rounded-full blur-3xl"></div>
    </div>
  )
}
