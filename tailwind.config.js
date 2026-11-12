/** @type {import('tailwindcss').Config} */
// TutorLink "Rosebank" design language: navy, gold, cream; Cormorant + DM Sans; near-square corners.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'system-ui', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        mono: ['ui-monospace', '"SF Mono"', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        ink: { DEFAULT: '#0A1828', soft: '#6B7B8F', faint: '#94A1B2' },
        line: { DEFAULT: '#E2DDD8', soft: '#EFECE7' },
        canvas: '#FAFAF8',
        navy: { DEFAULT: '#0A2342', mid: '#0E2A4D', panel: '#143D6B' },
        gold: { DEFAULT: '#C8A840', dark: '#A5872F', bg: '#FBF6E7' },
        accent: { DEFAULT: '#0A2342', soft: '#FBF6E7' },
        ok: { DEFAULT: '#166534', bg: '#F0FDF4', bd: '#86EFAC' },
        bad: { DEFAULT: '#991B1B', bg: '#FEF2F2', bd: '#FCA5A5' },
        warn: { DEFAULT: '#92400E', bg: '#FFFBEB', bd: '#FCD34D' },
      },
      borderRadius: {
        DEFAULT: '4px', md: '4px', lg: '4px', xl: '4px', '2xl': '8px', '3xl': '8px',
      },
      boxShadow: {
        card: '0 1px 0 rgba(10,24,40,.02)',
        lift: '0 14px 30px -12px rgba(10,35,66,.45)',
      },
      transitionTimingFunction: {
        ios: 'cubic-bezier(.32,.72,0,1)',
        spring: 'cubic-bezier(.34,1.4,.42,1)',
      },
    },
  },
  plugins: [],
}
