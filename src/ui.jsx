import React, { useEffect, useRef, useState } from 'react'

/** Slim rounded progress bar. Label lives outside, in text tokens.
 * `marker` (0–100) draws the spec's red target marker on hero bars. */
export function ProgressBar({ pct, tone = 'brand', size = 'md', marker = null }) {
  const fill = { brand: 'bg-gold', warn: 'bg-amber-500', bad: 'bg-red-500', good: 'bg-emerald-500', navy: 'bg-gold text-ink' }[tone] || 'bg-gold'
  return (
    <div
      className={`relative w-full overflow-visible rounded-full bg-white/10 ${size === 'sm' ? 'h-1.5' : 'h-2.5'}`}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={`h-full rounded-full transition-all duration-500 ${fill}`} style={{ width: `${Math.min(100, Math.max(pct, 2))}%` }} />
      {marker != null && (
        <span
          className="absolute -top-1 bottom-[-4px] w-0.5 rounded bg-red-600 transition-all duration-500"
          style={{ left: `calc(${Math.min(100, Math.max(0, marker))}% - 1px)` }}
          aria-hidden="true"
        />
      )}
    </div>
  )
}

/** Status chip — color is never alone: icon + label always accompany it. */
export function StatusChip({ meta, detail }) {
  const tone = {
    good: 'bg-emerald-400/10 text-emerald-300',
    warn: 'bg-amber-400/15 text-amber-200',
    bad: 'bg-red-400/10 text-red-300',
    red: 'bg-rag-red-bg text-rag-red-fg',
    amber: 'bg-rag-amber-bg text-rag-amber-fg',
    green: 'bg-rag-green-bg text-rag-green-fg',
  }[meta.tone]
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-extrabold ${tone}`}>
      <span aria-hidden="true">{meta.icon}</span> {meta.label}
      {detail ? <span className="font-semibold"> · {detail}</span> : null}
    </span>
  )
}

export function Avatar({ name }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360
  return (
    <span
      className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-full text-xs font-extrabold"
      style={{ background: `hsl(${h} 45% 88%)`, color: `hsl(${h} 45% 28%)` }}
      aria-hidden="true"
    >
      {initials}
    </span>
  )
}

/** Modal dialog; `sheet` docks it to the bottom like a mobile bottom sheet.
 * Modals can stack (sheet → confirm): Escape only closes the topmost one,
 * and body scroll stays locked until the last modal unmounts. */
const modalStack = []

export function Modal({ title, onClose, children, sheet = false, wide = false }) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const token = {}
    modalStack.push(token)
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape' && modalStack[modalStack.length - 1] === token) closeRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      modalStack.splice(modalStack.indexOf(token), 1)
      if (modalStack.length === 0) document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [])
  return (
    <div
      className={`anim-fade fixed inset-0 z-50 flex justify-center bg-gold text-ink/45 ${sheet ? 'items-end' : 'items-center p-4'}`}
      onClick={onClose}
    >
      <div
        className={`w-full ${wide ? 'max-w-[640px]' : 'max-w-[420px]'} overflow-y-auto bg-panel shadow-2xl ${
          sheet ? 'anim-rise max-h-[90vh] rounded-t-3xl' : 'anim-pop max-h-[86vh] rounded-3xl'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Dialog'}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between bg-panel px-5 pt-4">
          {title ? <h3 className="text-lg font-bold">{title}</h3> : <span />}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-stone-400 hover:bg-white/10"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="px-5 pb-6 pt-2">{children}</div>
      </div>
    </div>
  )
}

export function Toast({ toast }) {
  if (!toast) return null
  return (
    <div
      key={toast.key}
      className="anim-toast fixed bottom-6 left-1/2 z-[60] max-w-[92vw] -translate-x-1/2 rounded-full bg-gold text-ink px-5 py-2.5 text-center text-sm font-semibold shadow-xl"
      role="status"
    >
      {toast.msg}
    </div>
  )
}

/** Segmented control for small pickers. */
export function Segmented({ options, value, onChange, size = 'md' }) {
  return (
    <div className="inline-flex gap-1 border-b border-gold/20" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          className={`-mb-px border-b-2 ${size === 'sm' ? 'px-3 py-1.5 text-[11px]' : 'px-4 py-2 text-xs'} font-bold uppercase tracking-widest transition-all ${
            value === o.value ? 'border-gold text-gold-light' : 'border-transparent text-stone-400 hover:text-gold-light'
          }`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Eyebrow label used above sections and inside cards. */
export function Eyebrow({ children, tone = 'brand' }) {
  const c = { brand: 'text-gold', navy: 'text-gold-light', muted: 'text-stone-400', light: 'text-gold-light' }[tone]
  return <span className={`block text-[11px] font-extrabold uppercase tracking-widest ${c}`}>{children}</span>
}

/** Opaque content panel — the frame itself is transparent so the building
 * photographs behind it show through the scene bands between panels. */
export function useReveal() {
  const ref = useRef(null)
  const [on, setOn] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setOn(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setOn(true)
          io.disconnect()
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return [ref, on]
}

export function Panel({ children, className = '', as: Tag = 'section', ...rest }) {
  const [ref, on] = useReveal()
  return (
    <Tag ref={ref} className={`reveal ${on ? 'is-in' : ''} rounded-2xl border border-gold/20 bg-ink/88 p-4 shadow-xl shadow-black/50 backdrop-blur-sm ${className}`} {...rest}>
      {children}
    </Tag>
  )
}

/** Animates a number from 0 to `value` the first time it scrolls into view. */
export function CountUp({ value, format = (v) => String(Math.round(v)), duration = 1100, className = '' }) {
  const [ref, on] = useReveal()
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!on) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setV(value)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / duration)
      const e = 1 - Math.pow(1 - k, 3)
      setV(value * e)
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [on, value, duration])
  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {format(v)}
    </span>
  )
}

/** Chapter header: number, title, one plain sentence saying what the section tells you. */
export function Chapter({ n, title, says, right }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-baseline gap-3">
          <span className="chapter-num text-3xl font-light tabular-nums text-gold/70">{String(n).padStart(2, '0')}</span>
          <h3 className="text-xl font-light tracking-tight text-stone-50 lg:text-2xl">{title}</h3>
        </div>
        {says && <p className="mt-1 text-[13px] text-stone-400">{says}</p>}
        <div className="hairline mt-2" />
      </div>
      {right ? <div className="flex-none">{right}</div> : null}
    </div>
  )
}

/** Fixed right-hand rail of chapter dots + a top scroll-progress bar. */
export function ScrollRail({ chapters, active, onJump }) {
  const [pct, setPct] = useState(0)
  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight
        setPct(max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0)
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])
  return (
    <>
      <div className="fixed left-0 right-0 top-0 z-[45] h-0.5 bg-white/5" aria-hidden="true">
        <div className="h-full bg-gradient-to-r from-gold to-gold-light transition-[width] duration-200" style={{ width: `${pct}%` }} />
      </div>
      <nav className="fixed right-3 top-1/2 z-[45] hidden -translate-y-1/2 flex-col gap-3 lg:flex" aria-label="Chapters">
        {chapters.map((c) => (
          <button
            key={c.id}
            className="group flex items-center justify-end gap-2"
            onClick={() => onJump(c.id)}
            aria-label={`Go to ${c.title}`}
            aria-current={active === c.id ? 'true' : undefined}
          >
            <span className={`rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-gold-light transition ${active === c.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>{c.title}</span>
            <span className={`block rounded-full transition-all duration-300 ${active === c.id ? 'h-6 w-1.5 bg-gold' : 'h-1.5 w-1.5 bg-white/30 group-hover:bg-gold/60'}`} />
          </button>
        ))}
      </nav>
    </>
  )
}

/** Thin tick bar (reference style): filled ticks = progress, a red tick = target. */
export function TickBar({ pct, marker = null, tone = 'brand', ticks = 30 }) {
  const fill = { brand: 'bg-gold', good: 'bg-emerald-300', warn: 'bg-amber-300', bad: 'bg-red-300' }[tone] || 'bg-gold'
  const filled = Math.round((Math.max(0, Math.min(100, pct)) / 100) * ticks)
  const markerIdx = marker == null ? -1 : Math.round((Math.max(0, Math.min(100, marker)) / 100) * (ticks - 1))
  return (
    <div className="flex h-5 items-end gap-[3px]" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      {Array.from({ length: ticks }, (_, i) => (
        <span
          key={i}
          className={`tick flex-1 rounded-[1px] ${i === markerIdx ? 'bg-red-400' : i < filled ? fill : 'bg-white/10'}`}
          style={{ height: i === markerIdx ? '100%' : i < filled ? `${55 + ((i * 7) % 4) * 12}%` : '35%', animationDelay: `${i * 28}ms` }}
        />
      ))}
    </div>
  )
}

/** Primary/secondary/outline/ghost button shorthands. */
export const btn = {
  primary:
    'inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold to-gold-light px-5 py-3.5 text-[15px] font-bold text-ink shadow-lg shadow-gold/25 transition active:scale-[0.98] hover:bg-gold-light disabled:cursor-not-allowed disabled:bg-none disabled:bg-white/10 disabled:text-stone-400 disabled:shadow-none',
  secondary:
    'inline-flex items-center justify-center gap-2 rounded-xl bg-gold/10 px-4 py-2 text-sm font-bold text-gold-light transition active:scale-[0.98] hover:bg-gold/20',
  outline:
    'inline-flex w-full items-center justify-center gap-2 rounded-2xl border-[1.5px] border-gold/20 bg-panel px-5 py-3 text-[15px] font-bold text-stone-500 transition active:scale-[0.98] hover:border-gold hover:text-gold-light',
  ghost:
    'inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-gold-light transition hover:bg-gold/10',
  light:
    'inline-flex w-full items-center justify-center gap-2 rounded-2xl border-[1.5px] border-white/40 bg-panel/10 px-5 py-3 text-[15px] font-bold text-white backdrop-blur transition active:scale-[0.98] hover:bg-panel/20',
}
