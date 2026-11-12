import { Link, Navigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import PersonShell from '../components/PersonShell'
import type { CheckInResult } from '../lib/supabase'
import type { Identity } from '../lib/identity'

export default function Done() {
  const { state } = useLocation() as { state: { res: CheckInResult; name: Identity } | null }
  if (!state) return <Navigate to="/" replace />
  const { res, name } = state

  const ok = res.ok
  const already = !res.ok && res.error === 'already_in'
  const good = ok || already

  return (
    <PersonShell>
      <div className="flex-1 flex flex-col justify-center gap-6">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className={`self-center grid place-items-center w-24 h-24 rounded-full border-2 ${good ? 'bg-ok-bg border-ok-bd text-ok' : 'bg-bad-bg border-bad-bd text-bad'}`}
        >
          {good ? (
            <svg viewBox="0 0 24 24" className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: .15, duration: .4 }} />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-11 h-11" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M12 7v6M12 17h.01" /></svg>
          )}
        </motion.div>

        <motion.div className="text-center" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .1, duration: .5, ease: [.32, .72, 0, 1] }}>
          {ok && (
            <>
              <span className="inline-flex items-center px-[9px] py-[3px] rounded border border-ok-bd bg-ok-bg text-ok text-[10px] font-semibold tracking-[.07em] uppercase">Success</span>
              <h1 className="display mt-4">You're on the board</h1>
              <p className="font-serif text-[30px] font-semibold leading-tight text-gold-dark mt-1">{name.first} {name.last}</p>
            </>
          )}
          {already && (
            <>
              <span className="inline-flex items-center px-[9px] py-[3px] rounded border border-ok-bd bg-ok-bg text-ok text-[10px] font-semibold tracking-[.07em] uppercase">Success</span>
              <h1 className="display mt-4">You're already signed in</h1>
              <p className="font-serif text-[26px] font-semibold leading-tight text-gold-dark mt-1">{name.first} {name.last}</p>
            </>
          )}
          {!good && (
            <>
              <span className="inline-flex items-center px-[9px] py-[3px] rounded border border-bad-bd bg-bad-bg text-bad text-[10px] font-semibold tracking-[.07em] uppercase">Not signed in</span>
              <h1 className="display text-[32px] mt-4">
                {res.error === 'invalid_code' ? "That code isn't active" : "Couldn't reach the server"}
              </h1>
              <p className="mt-2.5 text-sm text-ink-soft">{res.error === 'invalid_code' ? 'Scan the board again.' : 'Check your connection and try again.'}</p>
            </>
          )}
        </motion.div>

        {good && res.title && (
          <div className="card px-4 py-3.5 flex items-center justify-between">
            <span className="eyebrow">Session</span>
            <span className="text-[14.5px] font-semibold">{res.title}</span>
          </div>
        )}
      </div>
      {!good && <Link to="/scan" replace className="btn-primary w-full">Scan again</Link>}
    </PersonShell>
  )
}
