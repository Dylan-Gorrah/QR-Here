import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import QRCode from 'qrcode'
import { supabase, type Checkin, type Session } from '../lib/supabase'
import { boardUrl } from '../lib/identity'
import NameChip from '../components/NameChip'
import Spotlight from '../components/Spotlight'
import Spinner from '../components/Spinner'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export default function Board() {
  const { id = '' } = useParams()
  const nav = useNavigate()

  const [session, setSession] = useState<Session | null>(null)
  const [wall, setWall] = useState<Checkin[]>([])
  const [spot, setSpot] = useState<Checkin | null>(null)
  const [qr, setQr] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [barVisible, setBarVisible] = useState(true)
  const [rotate, setRotate] = useState(false)
  const [live, setLive] = useState(false)

  const known = useRef(new Set<string>())
  const hiddenIds = useRef(new Set<string>())
  const queue = useRef<Checkin[]>([])
  const running = useRef(false)
  const alive = useRef(true)
  const loaded = useRef(false)

  // ---- queue / spotlight ----
  const runQueue = useCallback(async () => {
    if (running.current) return
    running.current = true
    while (alive.current && queue.current.length) {
      const item = queue.current.shift()!
      if (hiddenIds.current.has(item.id)) continue
      setSpot(item)
      const backlog = queue.current.length
      await sleep(backlog > 8 ? 900 : backlog > 3 ? 1400 : 2100)
      if (!alive.current) break
      setSpot(null)
      if (!hiddenIds.current.has(item.id)) setWall(w => (w.some(x => x.id === item.id) ? w : [...w, item]))
      await sleep(backlog > 8 ? 350 : backlog > 3 ? 600 : 900)
    }
    running.current = false
  }, [])

  const ingest = useCallback((rows: Checkin[], animate: boolean) => {
    const fresh: Checkin[] = []
    const unhidden: Checkin[] = []
    for (const r of rows) {
      if (r.hidden) {
        hiddenIds.current.add(r.id)
        known.current.add(r.id)
        continue
      }
      if (hiddenIds.current.delete(r.id) && known.current.has(r.id)) unhidden.push(r)
      if (!known.current.has(r.id)) {
        known.current.add(r.id)
        fresh.push(r)
      }
    }
    // reflect hidden / unhidden state on the wall
    setWall(w => {
      const kept = w.filter(x => !hiddenIds.current.has(x.id))
      const add = [...(animate ? [] : fresh), ...unhidden].filter(r => !kept.some(k => k.id === r.id))
      if (!add.length && kept.length === w.length) return w
      return [...kept, ...add].sort((a, b) => a.created_at.localeCompare(b.created_at))
    })
    if (animate && fresh.length) {
      queue.current.push(...fresh)
      runQueue()
    }
  }, [runQueue])

  const refetch = useCallback(async () => {
    const { data, error } = await supabase.rpc('att_board_feed', { p_session: id })
    if (alive.current) setLive(!error)
    if (!data || !alive.current) return
    const first = !loaded.current
    loaded.current = true
    ingest(data as Checkin[], !first)
  }, [id, ingest])

  // ---- boot ----
  useEffect(() => {
    alive.current = true
    let poll: number | undefined

    ;(async () => {
      const { data } = await supabase.rpc('att_board_session', { p_session: id })
      const sess = data as Session | null
      if (!sess?.id || !sess.is_active) { nav('/admin', { replace: true }); return }
      setSession(sess)
      await refetch()
      poll = window.setInterval(refetch, 1000)   // names show within ~1s
    })()

    const onVis = () => { if (document.visibilityState === 'visible') refetch() }
    window.addEventListener('online', refetch)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      alive.current = false
      window.clearInterval(poll)
      window.removeEventListener('online', refetch)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [id, nav, refetch, ingest])

  // ---- QR ----
  useEffect(() => {
    if (!session) return
    QRCode.toDataURL(boardUrl(session.code), {
      width: 900, margin: 1, errorCorrectionLevel: 'M',
      color: { dark: '#0A2342', light: '#ffffff' },
    }).then(setQr)
  }, [session?.code])

  // ---- optional code rotation ----
  useEffect(() => {
    if (!rotate || !session) return
    const t = window.setInterval(async () => {
      const { data } = await supabase.rpc('att_rotate_code', { p_session: session.id })
      if (typeof data === 'string') setSession(s => (s ? { ...s, code: data } : s))
    }, 30000)
    return () => window.clearInterval(t)
  }, [rotate, session?.id])

  // ---- auto-hiding top bar ----
  useEffect(() => {
    let t: number
    const wake = () => {
      setBarVisible(true)
      window.clearTimeout(t)
      t = window.setTimeout(() => setBarVisible(false), 3000)
    }
    wake()
    window.addEventListener('mousemove', wake)
    window.addEventListener('touchstart', wake)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('mousemove', wake)
      window.removeEventListener('touchstart', wake)
    }
  }, [])

  async function hide(c: Checkin) {
    hiddenIds.current.add(c.id)
    setWall(w => w.filter(x => x.id !== c.id))
    setSelected(null)
    await supabase.rpc('att_hide_checkin', { p_session: id, p_id: c.id })
  }

  async function endSession() {
    if (!session || !confirm('End this session? The QR will stop working.')) return
    await supabase.rpc('att_end_session', { p_session: session.id })
    nav('/', { replace: true })
  }

  async function newSession() {
    if (!confirm('Start a new session? The current board will be cleared.')) return
    const { data } = await supabase.rpc('att_open_board', { p_new: true })
    const s = data as Session | null
    if (s?.id) window.location.hash = `#/board/${s.id}`, window.location.reload()
  }

  function fullscreen() {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen?.()
  }

  if (!session) return <div className="h-full grid place-items-center"><Spinner /></div>

  const count = wall.length + (spot ? 1 : 0)
  const size = wall.length < 12 ? "lg" : wall.length < 30 ? "md" : "sm"
  const selectedChip = wall.find(w => w.id === selected)

  return (
    <div className="h-full w-full bg-canvas overflow-hidden select-none font-sans" onClick={() => setSelected(null)}>
      {/* top bar */}
      <motion.div
        className="fixed top-0 inset-x-0 z-40 flex items-center justify-between px-6 h-14 bg-canvas/85 backdrop-blur-xl backdrop-saturate-150 border-b border-line"
        animate={{ opacity: barVisible ? 1 : 0, y: barVisible ? 0 : -12 }}
        style={{ pointerEvents: barVisible ? 'auto' : 'none' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 text-sm">
          <button onClick={() => nav('/')} className="font-medium text-ink-soft hover:text-ink">← Exit</button>
          <span className="text-line">|</span>
          <span className={`flex items-center gap-1.5 font-medium ${live ? 'text-ok' : 'text-warn'}`}>
            <span className={`w-2 h-2 rounded-full ${live ? 'bg-ok' : 'bg-gold'}`} />
            {live ? 'Live' : 'Reconnecting…'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <label className="flex items-center gap-2 px-3 h-9 rounded-lg active:bg-gold-bg cursor-pointer text-ink-soft font-medium">
            <input type="checkbox" className="accent-[#C8A840]" checked={rotate} onChange={e => setRotate(e.target.checked)} />
            Rotate code
          </label>
          <button onClick={fullscreen} className="px-3 h-9 rounded-lg active:bg-gold-bg font-medium text-ink-soft">Fullscreen</button>
          <button onClick={endSession} className="px-3 h-9 rounded-lg active:bg-bad-bg font-medium text-bad">End session</button>
          <button onClick={newSession} className="px-3 h-9 rounded active:bg-gold-bg font-medium text-navy">New session</button>
        </div>
      </motion.div>

      <LayoutGroup>
      <div className="h-full grid grid-cols-12 grid-rows-[minmax(0,1fr)] gap-7 p-9 pt-10">
        {/* left: QR */}
        <section className="col-span-3 relative flex flex-col justify-center">
          <div className="card p-8 flex flex-col items-center">
            <div className="eyebrow text-center text-[12px]">{session.title}</div>
            <div className="w-full aspect-square mt-5">
              {qr && (
                <motion.img key={qr} src={qr} alt="Scan to sign in" className="w-full h-full rounded-xl"
                  initial={{ opacity: 0.4, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} />
              )}
            </div>
            <div className="mt-6 font-mono text-[4rem] leading-none font-semibold tracking-[.22em] tabular-nums pl-[.22em] text-navy">{session.code}</div>
            <div className="mt-3 font-serif text-[28px] font-semibold text-gold-dark">Scan to sign in</div>
          </div>
        </section>

        {/* right: wall */}
        <section className="col-span-6 relative card">
            <div className="h-full p-8 overflow-y-auto [scrollbar-width:none]">
              {wall.length === 0 && !spot ? (
                <div className="h-full grid place-items-center text-center">
                  <div>
                    <div className="font-serif text-[40px] font-semibold text-ink-faint">Waiting for the first name…</div>
                    <div className="mt-2 text-ink-faint">Scan the code to appear here</div>
                  </div>
                </div>
              ) : (
                <div className={`flex flex-wrap content-start ${size === 'lg' ? 'gap-5' : size === 'md' ? 'gap-4' : 'gap-3'}`}>
                  {wall.map(c => (
                    <div key={c.id} className="relative" onClick={e => e.stopPropagation()}>
                      <NameChip c={c} size={size} selected={selected === c.id}
                        onClick={() => setSelected(s => (s === c.id ? null : c.id))} />
                      <AnimatePresence>
                        {selectedChip?.id === c.id && (
                          <motion.button
                            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            onClick={() => hide(c)}
                            className="absolute z-30 left-1/2 -translate-x-1/2 top-full mt-2 whitespace-nowrap rounded bg-navy text-white text-sm font-semibold px-4 py-2 shadow-lift"
                          >
                            Hide from board
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <AnimatePresence>{spot && <Spotlight key={spot.id} c={spot} />}</AnimatePresence>
        </section>

        {/* right: attendance register */}
        <section className="col-span-3 card flex flex-col min-h-0">
          <div className="px-6 pt-6 pb-5 border-b border-line">
            <div className="eyebrow text-[11px]">Attendance</div>
            <div className="mt-2 flex items-end justify-between">
              <motion.span key={count} initial={{ scale: 1.25, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                className="font-serif text-[5.5rem] leading-[.85] font-semibold text-navy tabular-nums origin-left">
                {count}
              </motion.span>
              <span className="text-sm text-ink-soft pb-1">{count === 1 ? 'person' : 'people'} signed in</span>
            </div>
          </div>
          <ol className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <AnimatePresence initial={false}>
              {[...wall].reverse().map((c, i) => (
                <motion.li
                  key={c.id}
                  layout="position"
                  initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                  className="flex items-center gap-3 px-6 py-3 border-b border-line-soft"
                >
                  <span className="w-8 font-mono text-xs text-ink-faint tabular-nums">{String(wall.length - i).padStart(2, '0')}</span>
                  <span className="flex-1 min-w-0 truncate text-[17px] font-semibold tracking-[-.01em]">
                    {c.first_name} <span className="text-ink-soft font-medium">{c.last_name}</span>
                  </span>
                  <span className="font-mono text-xs text-ink-faint tabular-nums">
                    {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
            {wall.length === 0 && <li className="px-6 py-8 text-sm text-ink-faint">No one yet.</li>}
          </ol>
        </section>
      </div>
      </LayoutGroup>
    </div>
  )
}
