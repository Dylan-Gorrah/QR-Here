import { motion, type TargetAndTransition, type Transition, type Variants } from 'framer-motion'
import type { Checkin } from '../lib/supabase'
import { styleFor, type Entrance } from '../lib/style'

type Anim = { from: TargetAndTransition; to: TargetAndTransition; t: Transition }

const spring = (stiffness: number, damping: number, mass = 1): Transition => ({ type: 'spring', stiffness, damping, mass })

// Whole-card entrances. Only transform + opacity (one blur) so it stays smooth on a cheap laptop.
const CARD: Record<Exclude<Entrance, 'typing' | 'wave' | 'confetti'>, Anim> = {
  bounce:    { from: { scale: 0, opacity: 0 }, to: { scale: 1, opacity: 1 }, t: spring(420, 11) },
  drop:      { from: { y: -700, opacity: 0 }, to: { y: 0, opacity: 1 }, t: spring(260, 13) },
  slideSpin: { from: { x: -900, rotate: -200, opacity: 0 }, to: { x: 0, rotate: 0, opacity: 1 }, t: spring(120, 15) },
  flip:      { from: { rotateX: 95, opacity: 0 }, to: { rotateX: 0, opacity: 1 }, t: spring(160, 12) },
  blurZoom:  { from: { scale: 2.6, opacity: 0, filter: 'blur(14px)' }, to: { scale: 1, opacity: 1, filter: 'blur(0px)' }, t: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
  // paper label floating down like it was torn off a phone
  flutter:   { from: { y: -650, x: -120, rotate: -24, opacity: 0 }, to: { y: [-650, -260, -60, 0], x: [-120, 90, -40, 0], rotate: [-24, 14, -6, 0], opacity: 1 }, t: { duration: 1.25, ease: 'easeOut' } },
  // slapped down like a sticker
  stamp:     { from: { scale: 3.2, rotate: -10, opacity: 0 }, to: { scale: [3.2, 0.92, 1], rotate: [-10, 2, 0], opacity: 1 }, t: { duration: 0.5, ease: [0.2, 0.9, 0.3, 1] } },
  // hangs from a pin at the top and swings in
  swing:     { from: { rotateX: -100, opacity: 0 }, to: { rotateX: 0, opacity: 1 }, t: spring(120, 7) },
  // unfolds like a paper strip
  unfold:    { from: { scaleY: 0.02, scaleX: 0.4, opacity: 0 }, to: { scaleY: [0.02, 0.02, 1], scaleX: [0.4, 1, 1], opacity: 1 }, t: { duration: 0.7, ease: [0.32, 0.72, 0, 1] } },
  rise:      { from: { y: 600, opacity: 0 }, to: { y: 0, opacity: 1 }, t: spring(200, 18) },
  elastic:   { from: { scaleX: 0, scaleY: 1.6, opacity: 0 }, to: { scaleX: 1, scaleY: 1, opacity: 1 }, t: spring(500, 9) },
  spiral:    { from: { rotate: 540, scale: 0, opacity: 0 }, to: { rotate: 0, scale: 1, opacity: 1 }, t: spring(140, 16) },
  rollRight: { from: { x: 1000, rotate: 360, opacity: 0 }, to: { x: 0, rotate: 0, opacity: 1 }, t: spring(110, 16) },
  jelly:     { from: { scale: 0.3, opacity: 0 }, to: { scale: [0.3, 1.25, 0.85, 1.08, 0.97, 1], opacity: 1 }, t: { duration: 0.9 } },
}

function Letters({ text, mode, color, delay }: { text: string; mode: 'typing' | 'wave'; color?: string; delay: number }) {
  return (
    <>
      {[...text].map((ch, i) => (
        <motion.span
          key={i}
          className="inline-block whitespace-pre"
          style={{ color }}
          initial={mode === 'typing' ? { opacity: 0 } : { y: 60, opacity: 0 }}
          animate={mode === 'typing' ? { opacity: 1 } : { y: [60, -16, 0], opacity: 1 }}
          transition={mode === 'typing'
            ? { delay: delay + i * 0.06, duration: 0.01 }
            : { delay: delay + i * 0.035, duration: 0.5, ease: 'easeOut' }}
        >
          {ch}
        </motion.span>
      ))}
    </>
  )
}

function Confetti({ color }: { color: string }) {
  const n = 22
  return (
    <div className="absolute inset-0 pointer-events-none grid place-items-center">
      {Array.from({ length: n }).map((_, i) => {
        const a = (i / n) * Math.PI * 2
        const d = 200 + (i % 3) * 70
        return (
          <motion.span
            key={i}
            className="absolute w-3 h-2"
            style={{ background: i % 3 === 0 ? '#C8A840' : i % 3 === 1 ? color : '#0A2342' }}
            initial={{ x: 0, y: 0, scale: 0, rotate: 0, opacity: 1 }}
            animate={{ x: Math.cos(a) * d * 1.6, y: Math.sin(a) * d, scale: [0, 1.2, 1], rotate: 540, opacity: [1, 1, 0] }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
          />
        )
      })}
    </div>
  )
}

/** The name label, with a torn bottom edge, shown big on the wall before it settles. */
export default function Spotlight({ c }: { c: Checkin }) {
  const s = styleFor(c.first_name, c.last_name, c.device_id)
  const letters = s.entrance === 'typing' || s.entrance === 'wave'
  const anim = letters ? CARD.bounce : s.entrance === 'confetti' ? CARD.stamp : CARD[s.entrance as keyof typeof CARD]

  return (
    <motion.div
      className="absolute inset-0 z-20 grid place-items-center overflow-hidden rounded"
      initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.25 } }}
    >
      <motion.div className="absolute inset-0 bg-canvas/85" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
      {s.entrance === 'confetti' && <Confetti color={s.color} />}
      <motion.div layoutId={c.id} transition={spring(220, 28)} className="relative" style={{ perspective: 1200 }}>
        <motion.div initial="hidden" animate="show" variants={{ hidden: anim.from, show: { ...anim.to, transition: anim.t } } as Variants}
          style={{ transformOrigin: s.entrance === 'swing' ? 'top center' : 'center' }}
          className="drop-shadow-[0_18px_30px_rgba(10,35,66,.18)]">
          <div className="paper-label bg-white border border-line border-l-[5px] px-14 pt-8 pb-11 text-center" style={{ borderLeftColor: s.color }}>
            <div className="eyebrow text-[13px] mb-3">Hello, my name is</div>
            <div className="font-serif text-[6rem] leading-none font-semibold tracking-[-.01em] whitespace-nowrap text-navy">
              {letters ? (
                <>
                  <Letters text={c.first_name + ' '} mode={s.entrance as 'typing' | 'wave'} delay={0.25} />
                  <Letters text={c.last_name} mode={s.entrance as 'typing' | 'wave'} color={s.color}
                    delay={0.25 + (c.first_name.length + 1) * (s.entrance === 'typing' ? 0.06 : 0.035)} />
                </>
              ) : (
                <>{c.first_name} <span style={{ color: s.color }}>{c.last_name}</span></>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
