const NAME_KEY = 'att.name'
const DEVICE_KEY = 'att.device'

export type Identity = { first: string; last: string }

export const NAME_RE = /^[\p{L}][\p{L} '\-’]{0,39}$/u

export function getName(): Identity | null {
  try {
    const raw = localStorage.getItem(NAME_KEY)
    if (!raw) return null
    const v = JSON.parse(raw)
    if (typeof v?.first === 'string' && typeof v?.last === 'string' && v.first && v.last) return v
  } catch {}
  return null
}

/** Saving a different name gives this phone a fresh device id, so it counts as a new person. */
export function saveName(id: Identity) {
  const prev = getName()
  const changed = prev && (prev.first.toLowerCase() !== id.first.toLowerCase() || prev.last.toLowerCase() !== id.last.toLowerCase())
  try {
    if (changed) localStorage.removeItem(DEVICE_KEY)
    localStorage.setItem(NAME_KEY, JSON.stringify(id))
  } catch {}
}

export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(DEVICE_KEY, id)
    }
    return id
  } catch {
    return crypto.randomUUID()
  }
}

/** Pulls the 4-digit code out of a scanned QR (our URL with c=) or a bare code. */
export function extractCode(text: string): string | null {
  const t = text.trim()
  if (/^\d{4}$/.test(t)) return t
  const m = t.match(/[?&]c=(\d{4})\b/)
  return m ? m[1] : null
}

export function boardUrl(code: string) {
  const base = `${location.origin}${import.meta.env.BASE_URL}`
  return `${base}#/in?c=${code}`
}
