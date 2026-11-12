import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PersonShell from '../components/PersonShell'
import NameForm from '../components/NameForm'
import Spinner from '../components/Spinner'
import { getName, getDeviceId, type Identity } from '../lib/identity'
import { checkIn } from '../lib/supabase'

export default function CheckIn() {
  const [params] = useSearchParams()
  const code = (params.get('c') ?? '').trim()
  const nav = useNavigate()
  const [needName] = useState(() => !getName())
  const started = useRef(false)

  async function run(id: Identity) {
    if (started.current) return
    started.current = true
    const res = await checkIn(code, id.first, id.last, getDeviceId())
    if (!res.ok && res.error === 'invalid_code' && needName) {
      // code likely rotated while they typed
      nav('/scan', { replace: true, state: { notice: 'The code refreshed. Scan again.' } })
      return
    }
    nav('/done', { replace: true, state: { res, name: id } })
  }

  useEffect(() => {
    if (!/^\d{4}$/.test(code)) { nav('/scan', { replace: true }); return }
    const id = getName()
    if (id && !needName) run(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (needName) {
    return (
      <PersonShell>
        <div className="pt-4 pb-7">
          <div className="eyebrow mb-2.5">One more thing</div>
          <h1 className="display">Almost there</h1>
          <p className="mt-2.5 text-sm leading-[1.65] text-ink-soft">Enter your name to sign in.</p>
        </div>
        <div className="card px-4 py-[18px] border-l-[3px] border-l-gold"><NameForm cta="Sign in" onDone={run} /></div>
      </PersonShell>
    )
  }

  return (
    <PersonShell>
      <div className="flex-1 grid place-items-center">
        <div className="flex flex-col items-center gap-4 text-ink-soft">
          <Spinner />
          <span>Signing you in…</span>
        </div>
      </div>
    </PersonShell>
  )
}
