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
  const text = size === 'lg' ? 'text-[1.6rem] px-5 pt-3 pb-[17px]' : size === 'md' ? 'text-xl px-4 pt-2.5 pb-4' : 'text-lg px-4 pt-2 pb-3.5'
  return (
    <motion.button
      layoutId={c.id}
      layout="position"
      onClick={onClick}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      className="relative"
    >
      <span className="block [filter:drop-shadow(0_10px_18px_rgba(10,35,66,.20))_drop-shadow(0_2px_3px_rgba(10,35,66,.12))]" style={{ transform: `rotate(${s.tilt}deg)` }}>
      <span
        className={`paper-label-sm block bg-white border font-semibold tracking-[-.01em] whitespace-nowrap transition-colors
          ${selected ? "border-navy" : "border-line"} ${text}`}
      >
        <span>{c.first_name}</span> <span style={{ color: s.color }}>{c.last_name}</span>
      </span>
      </span>
    </motion.button>
  )
}
