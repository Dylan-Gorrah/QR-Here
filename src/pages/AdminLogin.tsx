import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, type Session } from '../lib/supabase'
import Spinner from '../components/Spinner'

/** No login: open (or resume) the live session and jump straight to the board. */
export default function AdminLogin() {
  const nav = useNavigate()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    supabase.rpc('att_open_board').then(({ data, error }) => {
      const s = data as Session | null
      if (error || !s?.id) { setFailed(true); return }
      nav(`/board/${s.id}`, { replace: true })
    })
  }, [nav])

  return (
    <div className="min-h-[100dvh] bg-canvas grid place-items-center px-4">
      {failed ? (
        <div className="text-center">
          <h1 className="display text-[30px]">Couldn't open the board</h1>
          <p className="mt-2 text-sm text-ink-soft">Check your connection and try again.</p>
          <div className="mt-6 flex gap-2 justify-center">
            <button className="btn-primary" onClick={() => location.reload()}>Try again</button>
            <Link to="/" className="btn-outline">Back</Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 text-ink-soft"><Spinner /><span className="text-sm">Opening the board…</span></div>
      )}
    </div>
  )
}
