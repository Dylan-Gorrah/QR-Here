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

  async function submit(c: string) {
    if (!name) return
    setMode('busy')
    const res = await checkIn(c, name.first, name.last, getDeviceId())
    if (res.ok || res.error === 'already_in') {
      setSuccess(true)
      navigator.vibrate?.([40, 60, 40])
      await new Promise(r => setTimeout(r, 1100))
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
      <header className="flex-none flex items-center gap-2 px-4 pt-[calc(env(safe-area-inset-top)+10px)] pb-[11px] border-b border-line bg-canvas/85 backdrop-blur-xl backdrop-saturate-150 z-10">
        <span className="flex-1 text-[15px] font-semibold tracking-[.01em]">Hi, {name.first}</span>
        <Link to="/" className="min-h-[44px] flex items-center text-xs font-semibold tracking-[.04em] text-gold-dark active:opacity-60">Not you? Change name</Link>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-7">
        <div className="text-center px-2">
          <div className="eyebrow mb-2.5">{success ? 'Done' : 'Step 2 of 2'}</div>
          <h1 className="display text-[32px]">
            {success ? "You're signed in!" : showManual ? 'Enter the code' : 'Scan the code'}
          </h1>
          <p className="mt-2 text-sm leading-[1.6] text-ink-soft">
            {success ? 'Look up, your name is on the board.' : showManual
              ? camFailed ? 'Camera unavailable. Enter the 4 digits under the QR.' : 'Enter the 4 digits under the QR on the board.'
              : 'Point your camera at the QR on the board.'}
          </p>
        </div>

        {/* The cube */}
        <div className={`relative w-[min(76vw,330px)] aspect-square ${showManual ? 'hidden' : ''}`}>
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
