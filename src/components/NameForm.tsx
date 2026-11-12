import { useState } from 'react'
import { getName, saveName, getDeviceId, NAME_RE, type Identity } from '../lib/identity'

const clean = (s: string) => s.replace(/\s+/g, ' ').trim()

export default function NameForm({ onDone, cta = 'Done' }: { onDone: (id: Identity) => void; cta?: string }) {
  const saved = getName()
  const [first, setFirst] = useState(saved?.first ?? '')
  const [last, setLast] = useState(saved?.last ?? '')

  const f = clean(first), l = clean(last)
  const fOk = NAME_RE.test(f), lOk = NAME_RE.test(l)
  const valid = fOk && lOk

  const filter = (v: string) => v.replace(/[^\p{L} '\-’]/gu, '').slice(0, 40)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    const id = { first: f, last: l }
    saveName(id)
    getDeviceId()
    onDone(id)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3.5">
      <div>
        <label className="label" htmlFor="first">First name</label>
        <input id="first" className="field" autoComplete="given-name" autoCapitalize="words" autoCorrect="off" spellCheck={false} enterKeyHint="next"
          value={first} onChange={e => setFirst(filter(e.target.value))} placeholder="Jane" />
      </div>
      <div>
        <label className="label" htmlFor="last">Surname</label>
        <input id="last" className="field" autoComplete="family-name" autoCapitalize="words" autoCorrect="off" spellCheck={false} enterKeyHint="next"
          value={last} onChange={e => setLast(filter(e.target.value))} placeholder="Smith" />
      </div>
      <button type="submit" className="btn-primary w-full mt-2" disabled={!valid}>{cta}</button>
    </form>
  )
}
