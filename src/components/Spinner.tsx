export default function Spinner({ className = 'w-8 h-8' }: { className?: string }) {
  return <span className={`${className} inline-block rounded-full border-[3px] border-line border-t-gold animate-spin`} />
}
