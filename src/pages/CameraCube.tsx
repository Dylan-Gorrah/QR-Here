import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import QrScanner from 'qr-scanner'
import { extractCode, getDeviceId, getName } from '../lib/identity'
import { checkIn } from '../lib/supabase'
import Spinner from '../components/Spinner'

type Mode = 'starting' | 'scanning' | 'busy' | 'manual'

export default function CameraCube() {
  const nav = useNavigate()
  const { state } = useLocation() as { state: { notice?: string } | null }
  const name = getName()
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<QrScanner | null>(null)
  const handled = useRef(false)
  const [mode, setMode] = useState<Mode>('starting')
  const [camFailed, setCamFailed] = useState(false)
  const [notice, setNotice] = useState(state?.notice ?? '')
  const [code, setCode] = useState('')
  const [success, setSuccess] = useState(false)
  const [torn, setTorn] = useState(false)

  async function submit(c: string) {
    if (!name) return
    setMode('busy')
    const res = await checkIn(c, name.first, name.last, getDeviceId())
    if (res.ok || res.error === 'already_in') {
      // tear the name label off and send it up to the board
      setTorn(true)
      navigator.vibrate?.([30, 40, 30])
      await new Promise(r => setTimeout(r, 650))
      setSuccess(true)
      await new Promise(r => setTimeout(r, 1200))
    }
    nav('/done', { replace: true, state: { res, name } })
  }

  useEffect(() => {
    if (!name || !videoRef.current) return
    const scanner = new QrScanner(
      videoRef.current,
      r => {
        if (handled.current) return
        const c = extractCode(r.data)
        if (!c) { setNotice("That's not the board code."); return }
        handled.current = true
        navigator.vibrate?.(60)
        scanner.stop()
        submit(c)
      },
      { preferredCamera: 'environment', returnDetailedScanResult: true, maxScansPerSecond: 8 },
    )
    scannerRef.current = scanner
    scanner.start()
      .then(() => setMode(m => (m === 'starting' ? 'scanning' : m)))
      .catch(() => { setCamFailed(true); setMode('manual') })
    return () => { scanner.stop(); scanner.destroy(); scannerRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!name) return <Navigate to="/" replace />

  const showManual = mode === 'manual' || (mode === 'busy' && !success && code.length === 4)

  return (
    <div className="fixed inset-0 bg-canvas flex flex-col">
      {/* Name on a paper label pinned to the top of the screen; torn off and sent to the board on success */}
      <div className="flex-none relative px-4 pt-[calc(env(safe-area-inset-top)+14px)] z-10">
        <motion.div
          className="relative drop-shadow-[0_6px_14px_rgba(10,35,66,.10)]"
          initial={{ y: -40, opacity: 0 }}
          animate={torn
            ? { y: [0, 6, -900], x: [0, -2, 30], rotate: [0, -2.5, -14] }
            : { y: 0, opacity: 1, rotate: 0 }}
          transition={torn ? { duration: 0.85, times: [0, 0.22, 1], ease: [0.5, 0, 0.75, 0] } : { duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
        >
          <div className="paper-label-sm bg-white border border-line border-l-[4px] border-l-gold pl-4 pr-2 pt-3 pb-5 flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="eyebrow text-[9.5px] mb-1">Hello, my name is</div>
              <div className="font-serif text-[30px] font-semibold leading-[1.05] text-navy truncate">
                {name.first} <span className="text-gold-dark">{name.last}</span>
              </div>
            </div>
            <Link to="/" aria-label="Change name"
              className="grid place-items-center w-11 h-11 rounded text-ink-faint transition duration-200 ease-spring active:scale-90 active:bg-gold-bg">
              <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></svg>
            </Link>
          </div>
        </motion.div>
        {/* perforation stub left behind */}
        <div className="absolute left-4 right-4 bottom-[2px] border-b-2 border-dashed border-line pointer-events-none" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-6">
        <h1 className="display text-[30px] text-center">
          {success ? "You're signed in!" : showManual ? 'Enter the code' : 'Scan the QR code'}
        </h1>

        {/* The cube */}
        <div className={`relative w-[min(80vw,340px,48dvh)] aspect-square ${showManual ? 'hidden' : ''}`}>
          <div className="absolute inset-0 rounded-2xl overflow-hidden bg-navy border border-line">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
            {mode === 'starting' && (
              <div className="absolute inset-0 grid place-items-center"><Spinner /></div>
            )}
            {mode === 'busy' && !success && (
              <div className="absolute inset-0 grid place-items-center bg-canvas/80 backdrop-blur-sm"><Spinner /></div>
            )}
            <AnimatePresence>
              {success && (
                <motion.div
                  className="absolute inset-0 grid place-items-center bg-ok-bg"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                >
                  <motion.div className="flex flex-col items-center gap-3 text-ok"
                    initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 16 }}>
                    <span className="grid place-items-center w-20 h-20 rounded-full bg-white border-2 border-ok-bd">
                      <svg viewBox="0 0 24 24" className="w-11 h-11" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                        <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35, delay: 0.1 }} />
                      </svg>
                    </span>
                    <span className="font-serif text-[30px] font-semibold leading-none">Success</span>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {/* corner brackets */}
          {(['tl', 'tr', 'bl', 'br'] as const).map(c => (
            <span
              key={c}
              className={`absolute w-9 h-9 ${success ? 'border-ok' : 'border-gold'} transition-colors duration-300
                ${c[0] === 't' ? '-top-2 border-t-[3px]' : '-bottom-2 border-b-[3px]'}
                ${c[1] === 'l' ? '-left-2 border-l-[3px]' : '-right-2 border-r-[3px]'}
                ${c === 'tl' ? 'rounded-tl-[12px]' : c === 'tr' ? 'rounded-tr-[12px]' : c === 'bl' ? 'rounded-bl-[12px]' : 'rounded-br-[12px]'}`}
            />
          ))}
        </div>

        {showManual && (
          <form className="w-full max-w-xs flex flex-col gap-3"
            onSubmit={e => { e.preventDefault(); if (code.length === 4) submit(code) }}>
            <input
              className="field h-16 text-center font-mono text-[30px] font-semibold tracking-[.5em] pl-[.5em]"
              type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="one-time-code" enterKeyHint="go"
              autoFocus maxLength={4} placeholder="0000"
              value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
            />
            <button className="btn-primary w-full" disabled={code.length !== 4 || mode === 'busy'}>
              {mode === 'busy' ? <Spinner className="w-5 h-5 border-navy/20 border-t-navy" /> : 'Sign in'}
            </button>
          </form>
        )}

        {notice && <p className="text-[12.5px] px-3 py-2 rounded border border-warn-bd bg-warn-bg text-warn">{notice}</p>}
      </div>

      <footer className="flex-none px-4 pb-[calc(env(safe-area-inset-bottom)+20px)] flex justify-center">
        {success ? <span className="h-[50px]" /> : !showManual ? (
          <button className="btn-navy w-full max-w-[330px]"
            onClick={() => { scannerRef.current?.stop(); setMode('manual') }}>
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10" /></svg>
            Online? Enter the code
          </button>
        ) : !camFailed ? (
          <button className="btn-outline w-full max-w-xs" onClick={() => { setMode('starting'); scannerRef.current?.start().then(() => setMode('scanning')).catch(() => { setCamFailed(true); setMode('manual') }) }}>
            Use the camera instead
          </button>
        ) : <span />}
      </footer>
    </div>
  )
}
