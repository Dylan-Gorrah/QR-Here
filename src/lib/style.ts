export const ENTRANCES = [
  'bounce', 'drop', 'slideSpin', 'flip', 'typing', 'wave', 'blurZoom', 'confetti',
] as const
export type Entrance = (typeof ENTRANCES)[number]

// TutorLink-friendly inks: navy, gold, panel blue + muted status tones
export const PALETTE = [
  '#0A2342', '#A5872F', '#143D6B', '#166534', '#991B1B',
  '#92400E', '#1D4ED8', '#6B21A8', '#0F766E', '#B45309',
]

export type PersonStyle = { entrance: Entrance; color: string; tilt: number }

function hash(s: string) {
  // FNV-1a 32-bit
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

function mix(n: number) {
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b)
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b)
  return (n ^ (n >>> 16)) >>> 0
}

export function styleFor(first: string, last: string, device: string): PersonStyle {
  const seed = hash(`${first.toLowerCase()}|${last.toLowerCase()}|${device}`)
  const a = mix(seed), b = mix(seed + 1), c = mix(seed + 2)
  return {
    entrance: ENTRANCES[a % ENTRANCES.length],
    color: PALETTE[b % PALETTE.length],
    tilt: ((c % 601) / 100) - 3, // -3..3
  }
}
