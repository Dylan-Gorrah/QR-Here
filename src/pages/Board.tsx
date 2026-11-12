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
  const size = wall.length < 18 ? 'lg' : wall.length < 45 ? 'md' : 'sm'
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
      <div className="h-full grid grid-cols-3 gap-8 p-10">
        {/* left: QR */}
        <section className="col-span-1 relative flex flex-col justify-center">
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
          <div className="mt-6 flex items-center justify-center gap-3">
            <span className="text-ink-faint text-lg">Signed in</span>
            <motion.span key={count} initial={{ scale: 1.3, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }}
              className="min-w-[3.5rem] h-12 px-4 grid place-items-center rounded bg-navy text-gold font-serif text-[30px] font-bold tabular-nums">
              {count}
            </motion.span>
          </div>
        </section>

        {/* right: wall */}
        <section className="col-span-2 relative card">
            <div className="h-full p-10">
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
                            className="absolute z-30 left-1/2 -translate-x-1/2 top-full mt-2 whitespace-nowrap rounded bg-navy text-white text-sm font-semibold px-4 py-2 border-l-[3px] border-l-gold shadow-lift"
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
      </div>
      </LayoutGroup>
    </div>
  )
}
