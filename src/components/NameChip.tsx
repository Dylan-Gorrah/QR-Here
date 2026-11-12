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
  const text = size === 'lg' ? 'text-[1.9rem] px-6 pt-3 pb-[18px]' : size === 'md' ? 'text-2xl px-5 pt-2.5 pb-4' : 'text-lg px-4 pt-2 pb-3.5'
  return (
    <motion.button
      layoutId={c.id}
      layout="position"
      onClick={onClick}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      className="relative"
    >
      <span className="block drop-shadow-[0_4px_8px_rgba(10,35,66,.08)]" style={{ transform: `rotate(${s.tilt}deg)` }}>
      <span
        className={`paper-label-sm block bg-white border border-l-[4px] font-semibold tracking-[-.01em] whitespace-nowrap transition-colors
          ${selected ? "border-navy" : "border-line"} ${text}`}
        style={{ borderLeftColor: s.color }}
      >
        <span>{c.first_name}</span> <span style={{ color: s.color }}>{c.last_name}</span>
      </span>
      </span>
    </motion.button>
  )
}
