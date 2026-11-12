import type { ReactNode } from 'react'
import ShieldButton from './ShieldButton'

export function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid place-items-center w-8 h-8 rounded bg-navy text-gold">
        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
      </span>
      <span className="font-serif text-[22px] font-semibold leading-none tracking-[-.01em] text-navy">Attendance</span>
    </div>
  )
}

export default function PersonShell({ children, shield = false }: { children: ReactNode; shield?: boolean }) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-canvas">
      <header className="flex-none flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+16px)] pb-3.5 bg-white border-b border-line">
        <BrandMark />
        {shield && <ShieldButton />}
      </header>
      <main className="flex-1 flex flex-col w-full max-w-md mx-auto px-4 pt-[22px] pb-[calc(env(safe-area-inset-bottom)+26px)]">
        {children}
      </main>
    </div>
  )
}
