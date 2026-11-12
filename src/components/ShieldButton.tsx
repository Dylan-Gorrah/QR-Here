import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'

/** Hidden admin entry: tap the shield 3 times quickly. */
export default function ShieldButton() {
  const nav = useNavigate()
  const taps = useRef<number[]>([])

  function tap() {
    const now = Date.now()
    taps.current = [...taps.current.filter(t => now - t < 1200), now]
    if (taps.current.length >= 3) {
      taps.current = []
      nav('/admin')
    }
  }

  return (
    <button
      type="button"
      onClick={tap}
      aria-label="Admin"
      className="grid place-items-center w-11 h-11 -mr-2.5 rounded text-ink-faint/70 transition duration-200 ease-spring active:scale-90 active:bg-gold-bg"
    >
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z" />
      </svg>
    </button>
  )
}
