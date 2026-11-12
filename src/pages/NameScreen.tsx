import { useNavigate } from 'react-router-dom'
import PersonShell from '../components/PersonShell'
import NameForm from '../components/NameForm'

export default function NameScreen() {
  const nav = useNavigate()
  return (
    <PersonShell shield>
      <div className="pt-4 pb-7">
        <div className="eyebrow mb-2.5">Step 1 of 2</div>
        <h1 className="display">Sign in</h1>
        <p className="mt-2.5 text-sm leading-[1.65] text-ink-soft">Enter your name once, then scan the code on the board.</p>
      </div>
      <div className="card px-4 py-[18px]">
        <NameForm onDone={() => nav('/scan')} />
      </div>
    </PersonShell>
  )
}
