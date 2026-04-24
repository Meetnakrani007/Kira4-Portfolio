import { useState, useRef, useEffect, useCallback } from 'react'

/**
 * BeforeAfterSlider component for comparing two images.
 * Props:
 *   beforeImage (string) — URL
 *   afterImage (string) — URL
 *   beforeLabel (string) — default "Before"
 *   afterLabel (string) — default "After"
 */
export default function BeforeAfterSlider({
  beforeImage = '',
  afterImage = '',
  beforeLabel = 'Before',
  afterLabel = 'After'
}) {
  const [pos, setPos] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef(null)
  const requestRef = useRef()

  const updatePos = useCallback((clientX) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
    
    if (requestRef.current) cancelAnimationFrame(requestRef.current)
    requestRef.current = requestAnimationFrame(() => {
      setPos(percentage)
    })
  }, [])

  const handlePointerDown = (e) => {
    setIsDragging(true)
    updatePos(e.clientX)
  }

  const handlePointerMove = useCallback((e) => {
    if (!isDragging) return
    updatePos(e.clientX)
  }, [isDragging, updatePos])

  const handlePointerUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (!isDragging) return
    updatePos(e.touches[0].clientX)
  }, [isDragging, updatePos])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
      window.addEventListener('touchmove', handleTouchMove)
    } else {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('touchmove', handleTouchMove)
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('touchmove', handleTouchMove)
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
    }
  }, [isDragging, handlePointerMove, handlePointerUp, handleTouchMove])

  return (
    <div 
      ref={containerRef}
      className="cursor-ew-resize select-none bg-neutral-900"
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16/9',
        overflow: 'hidden',
        borderRadius: '16px',
      }}
      onPointerDown={handlePointerDown}
    >
      {/* After Image Panel */}
      <div 
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <img 
          src={afterImage} 
          alt={afterLabel}
          className="pointer-events-none"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            display: 'block',
          }}
        />
      </div>

      {/* Before Image Panel (Revealed/Clipped) */}
      <div 
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: pos + '%',
          height: '100%',
          overflow: 'hidden',
          zIndex: 2,
          borderRight: '2px solid white'
        }}
      >
        <div 
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: containerRef.current?.offsetWidth || '100%',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          <img 
            src={beforeImage} 
            alt={beforeLabel}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              display: 'block',
            }}
          />
        </div>
      </div>

      {/* Center Handle */}
      <div 
        className="absolute inset-y-0 pointer-events-none flex items-center justify-center z-20"
        style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
      >
        <div className="w-[44px] h-[44px] bg-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-4 left-4 z-30 pointer-events-none px-3 py-1 bg-black/60 text-white text-[12px] font-bold uppercase rounded-full tracking-wider">
        {beforeLabel}
      </div>
      <div className="absolute top-4 right-4 z-30 pointer-events-none px-3 py-1 bg-black/60 text-white text-[12px] font-bold uppercase rounded-full tracking-wider">
        {afterLabel}
      </div>

      {/* Percentage indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none text-white text-[10px] font-medium drop-shadow-md bg-black/40 px-2 py-0.5 rounded-full">
        {Math.round(pos)}%
      </div>
    </div>
  )
}
