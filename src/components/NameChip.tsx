import { motion } from 'framer-motion'
import type { Checkin } from '../lib/supabase'
import { styleFor } from '../lib/style'

export default function NameChip({ c, size, onClick, selected }: {
  c: Checkin
  size: 'lg' | 'md' | 'sm'
  onClick?: () => void
  selected?: boolean
}) {
  const s = styleFor(c.first_name, c.last_name, c.device_id)
  const text = size === 'lg' ? 'text-[1.9rem] px-6 py-3' : size === 'md' ? 'text-2xl px-5 py-2.5' : 'text-lg px-4 py-2'
  return (
    <motion.button
      layoutId={c.id}
      layout="position"
      onClick={onClick}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      className="relative"
    >
      <span
        className={`block rounded bg-white border border-l-[3px] font-semibold tracking-[-.01em] whitespace-nowrap transition-colors
          ${selected ? "border-navy" : "border-line"} ${text}`}
        style={{ transform: `rotate(${s.tilt}deg)`, borderLeftColor: s.color }}
      >
        <span>{c.first_name}</span> <span style={{ color: s.color }}>{c.last_name}</span>
      </span>
    </motion.button>
  )
}
