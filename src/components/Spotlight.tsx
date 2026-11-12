import { motion, type Variants } from 'framer-motion'
import type { Checkin } from '../lib/supabase'
import { styleFor, type Entrance } from '../lib/style'

const whole: Record<Exclude<Entrance, 'typing' | 'wave'>, Variants> = {
  bounce: {
    hidden: { scale: 0, opacity: 0 },
    show: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 420, damping: 11 } },
  },
  drop: {
    hidden: { y: -500, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 260, damping: 13 } },
  },
  slideSpin: {
    hidden: { x: -700, rotate: -200, opacity: 0 },
    show: { x: 0, rotate: 0, opacity: 1, transition: { type: 'spring', stiffness: 120, damping: 15 } },
  },
  flip: {
    hidden: { rotateX: 95, opacity: 0 },
    show: { rotateX: 0, opacity: 1, transition: { type: 'spring', stiffness: 160, damping: 12 } },
  },
  blurZoom: {
    hidden: { scale: 2.6, opacity: 0, filter: 'blur(14px)' },
    show: { scale: 1, opacity: 1, filter: 'blur(0px)', transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
  },
  confetti: {
    hidden: { scale: 0.3, opacity: 0 },
    show: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 500, damping: 14 } },
  },
}

function Letters({ text, mode, color }: { text: string; mode: 'typing' | 'wave'; color?: string }) {
  return (
    <>
      {[...text].map((ch, i) => (
        <motion.span
          key={i}
          className="inline-block whitespace-pre"
          style={{ color }}
          variants={mode === 'typing'
            ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.01 } } }
            : { hidden: { y: 50, opacity: 0 }, show: { y: [50, -14, 0], opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } } }}
        >
          {ch}
        </motion.span>
      ))}
    </>
  )
}

function Confetti({ color }: { color: string }) {
  const n = 18
  return (
    <div className="absolute inset-0 pointer-events-none grid place-items-center">
      {Array.from({ length: n }).map((_, i) => {
        const a = (i / n) * Math.PI * 2
        const d = 180 + (i % 3) * 60
        return (
          <motion.span
            key={i}
            className="absolute w-3 h-3 rounded-[3px]"
            style={{ background: i % 2 ? color : '#fbbf24' }}
            initial={{ x: 0, y: 0, scale: 0, rotate: 0, opacity: 1 }}
            animate={{ x: Math.cos(a) * d * 1.6, y: Math.sin(a) * d, scale: [0, 1.2, 1], rotate: 360, opacity: [1, 1, 0] }}
            transition={{ duration: 1.3, ease: 'easeOut' }}
          />
        )
      })}
    </div>
  )
}

/** Side mode: the name slides in from the screen edge over the QR panel, as if it came from the phone. */
function SideCard({ c, color }: { c: Checkin; color: string }) {
  return (
    <motion.div
      className="absolute inset-0 z-20 grid place-items-center"
      initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }}
    >
      <motion.div className="absolute inset-0 bg-canvas/80 backdrop-blur-[2px]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} />
      <motion.div layoutId={c.id} transition={{ type: 'spring', stiffness: 200, damping: 26 }} className="relative w-[88%]">
        <motion.div
          initial={{ x: '-120vw', rotate: -4 }}
          animate={{ x: 0, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 170, damping: 19, mass: 0.9 }}
          className="rounded bg-white border border-line border-l-[5px] shadow-lift px-9 py-8"
          style={{ borderLeftColor: color }}
        >
          <div className="flex items-center gap-2 eyebrow text-[12px] mb-3">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><rect x="7" y="2.5" width="10" height="19" rx="2" /><path d="M11 18.5h2" /></svg>
            Just signed in
          </div>
          <div className="font-serif font-semibold leading-[.95] tracking-[-.01em] text-navy break-words">
            <div className="text-[4.2rem]">{c.first_name}</div>
            <div className="text-[4.2rem]" style={{ color }}>{c.last_name}</div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

export default function Spotlight({ c, side = false }: { c: Checkin; side?: boolean }) {
  const s = styleFor(c.first_name, c.last_name, c.device_id)
  if (side) return <SideCard c={c} color={s.color} />
  const isLetters = s.entrance === 'typing' || s.entrance === 'wave'
  const stagger = s.entrance === 'typing' ? 0.06 : 0.035

  return (
    <motion.div
      className="absolute inset-0 z-20 grid place-items-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.25 } }}
    >
      <div className="absolute inset-0 bg-canvas/85" />
      {s.entrance === 'confetti' && <Confetti color={s.color} />}
      <motion.div layoutId={c.id} transition={{ type: 'spring', stiffness: 220, damping: 28 }} className="relative" style={{ perspective: 1000 }}>
        <motion.div
          initial="hidden" animate="show"
          variants={isLetters ? { hidden: {}, show: { transition: { staggerChildren: stagger } } } : whole[s.entrance as keyof typeof whole]}
          className="rounded bg-white border border-line border-l-[4px] border-l-gold shadow-lift px-14 py-9 text-center"
        >
          <div className="eyebrow text-[13px] mb-3">Welcome</div>
          <div className="font-serif text-[6rem] leading-none font-semibold tracking-[-.01em] whitespace-nowrap text-navy">
            {isLetters ? (
              <>
                <Letters text={c.first_name + ' '} mode={s.entrance as 'typing' | 'wave'} />
                <Letters text={c.last_name} mode={s.entrance as 'typing' | 'wave'} color={s.color} />
              </>
            ) : (
              <>{c.first_name} <span style={{ color: s.color }}>{c.last_name}</span></>
            )}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
