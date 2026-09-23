import React, { useEffect, useRef } from 'react'

/** Slim rounded progress bar. Label lives outside, in text tokens.
 * `marker` (0–100) draws the spec's red target marker on hero bars. */
export function ProgressBar({ pct, tone = 'brand', size = 'md', marker = null }) {
  const fill = { brand: 'bg-teal-600', warn: 'bg-amber-500', bad: 'bg-red-500', good: 'bg-emerald-500', navy: 'bg-navy' }[tone] || 'bg-teal-600'
  return (
    <div
      className={`relative w-full overflow-visible rounded-full bg-stone-200/70 ${size === 'sm' ? 'h-1.5' : 'h-2.5'}`}
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
    good: 'bg-emerald-50 text-emerald-700',
    warn: 'bg-amber-100 text-amber-800',
    bad: 'bg-red-50 text-red-700',
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
      className={`anim-fade fixed inset-0 z-50 flex justify-center bg-stone-900/45 ${sheet ? 'items-end' : 'items-center p-4'}`}
      onClick={onClose}
    >
      <div
        className={`w-full ${wide ? 'max-w-[640px]' : 'max-w-[420px]'} overflow-y-auto bg-white shadow-2xl ${
          sheet ? 'anim-rise max-h-[90vh] rounded-t-3xl' : 'anim-pop max-h-[86vh] rounded-3xl'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Dialog'}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white px-5 pt-4">
          {title ? <h3 className="text-lg font-bold">{title}</h3> : <span />}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200"
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
      className="anim-toast fixed bottom-6 left-1/2 z-[60] max-w-[92vw] -translate-x-1/2 rounded-full bg-stone-900 px-5 py-2.5 text-center text-sm font-semibold text-white shadow-xl"
      role="status"
    >
      {toast.msg}
    </div>
  )
}

/** Segmented control for small pickers. */
export function Segmented({ options, value, onChange, size = 'md' }) {
  return (
    <div className="inline-flex rounded-full border border-stone-200 bg-stone-100 p-1" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          className={`rounded-full ${size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm'} font-semibold transition-all ${
            value === o.value ? 'bg-white text-stone-900 shadow' : 'text-stone-500 hover:text-stone-700'
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
  const c = { brand: 'text-teal-700', navy: 'text-navy', muted: 'text-stone-400', light: 'text-teal-200' }[tone]
  return <span className={`block text-[11px] font-extrabold uppercase tracking-widest ${c}`}>{children}</span>
}

/** Opaque content panel — the frame itself is transparent so the building
 * photographs behind it show through the scene bands between panels. */
export function Panel({ children, className = '', as: Tag = 'section', ...rest }) {
  return (
    <Tag className={`rounded-3xl bg-stone-50 p-4 shadow-xl shadow-stone-950/20 ${className}`} {...rest}>
      {children}
    </Tag>
  )
}

/** Primary/secondary/outline/ghost button shorthands. */
export const btn = {
  primary:
    'inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-700 px-5 py-3.5 text-[15px] font-bold text-white shadow-lg shadow-teal-700/25 transition active:scale-[0.98] hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-500 disabled:shadow-none',
  secondary:
    'inline-flex items-center justify-center gap-2 rounded-xl bg-teal-50 px-4 py-2 text-sm font-bold text-teal-800 transition active:scale-[0.98] hover:bg-teal-100',
  outline:
    'inline-flex w-full items-center justify-center gap-2 rounded-2xl border-[1.5px] border-stone-200 bg-white px-5 py-3 text-[15px] font-bold text-stone-700 transition active:scale-[0.98] hover:border-teal-600 hover:text-teal-800',
  ghost:
    'inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-teal-800 transition hover:bg-teal-50',
  light:
    'inline-flex w-full items-center justify-center gap-2 rounded-2xl border-[1.5px] border-white/40 bg-white/10 px-5 py-3 text-[15px] font-bold text-white backdrop-blur transition active:scale-[0.98] hover:bg-white/20',
}
