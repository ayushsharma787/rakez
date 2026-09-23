import React, { useEffect, useRef, useState } from 'react'
import { BRAND, QUESTIONS } from './data.js'
import { btn, Panel } from './ui.jsx'
import { SceneChip } from './scenes.jsx'

// ---------------------------------------------------------------------------
// Welcome / mode select — sits directly on the building photograph.
// ---------------------------------------------------------------------------

export function Welcome({ onStart, onFresh, scene }) {
  return (
    <div className="anim-screen flex min-h-screen flex-col justify-between gap-6 px-5 pb-10 pt-8">
      <div className="flex justify-center">
        <SceneChip scene={scene} />
      </div>
      <div className="text-center text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
        <div className="inline-block -rotate-2 rounded-3xl bg-navy px-6 py-4 text-2xl font-bold text-white shadow-xl shadow-stone-950/40">{BRAND.accent}</div>
        <h1 className="mt-5 break-words text-5xl font-extrabold tracking-tight">Scorecard.</h1>
        <p className="mx-auto mt-2 max-w-[26ch] text-lg font-semibold leading-snug text-teal-200">{BRAND.tagline}</p>
        <p className="mx-auto mt-3 max-w-[40ch] text-[15px] text-stone-200">{BRAND.pitch}</p>
      </div>

      <div>
        <div className="flex flex-col gap-3">
          <button className={btn.primary} onClick={onStart}>
            {BRAND.primaryCta}
          </button>
          <button className={btn.light} onClick={onFresh}>
            {BRAND.secondaryCta}
          </button>
        </div>
        <p className="mt-4 text-center text-xs text-stone-300">{BRAND.footnote}</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Questionnaire: tap-based, one question at a time, auto-advances.
// ---------------------------------------------------------------------------

export function Quiz({ initial, onDone, onBackOut }) {
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState(initial ? { ...initial } : {})
  const q = QUESTIONS[idx]

  const pick = (value) => {
    const next = { ...answers, [q.id]: value }
    setAnswers(next)
    if (idx < QUESTIONS.length - 1) setIdx(idx + 1)
    else onDone(next)
  }

  return (
    <Panel className="mx-3 mb-10 mt-3 px-5 pb-8 pt-4">
      <div className="flex items-center gap-3">
        <button
          className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 transition hover:text-teal-700"
          onClick={() => (idx === 0 ? onBackOut() : setIdx(idx - 1))}
          aria-label="Back"
        >
          ←
        </button>
        <div className="flex flex-1 justify-center gap-1.5" aria-label={`Question ${idx + 1} of ${QUESTIONS.length}`}>
          {QUESTIONS.map((_, i) => (
            <span key={i} className={`h-2 w-2 rounded-full transition-colors ${i <= idx ? 'bg-teal-600' : 'bg-stone-300'}`} />
          ))}
        </div>
        <span className="text-xs font-semibold tabular-nums text-stone-400">
          {idx + 1}/{QUESTIONS.length}
        </span>
      </div>

      {/* key={q.id} re-triggers the slide animation on each question */}
      <div key={q.id} className="anim-slide mt-7">
        <h2 className="text-2xl font-extrabold tracking-tight text-stone-900">{q.title}</h2>
        {q.subtitle && <p className="mt-1 text-sm text-stone-500">{q.subtitle}</p>}
        <div className="mt-5 flex flex-col gap-2.5">
          {q.options.map((o) => (
            <button
              key={o.value}
              className={`flex items-center gap-3.5 rounded-2xl border-[1.5px] p-4 text-left text-[15px] font-semibold transition active:scale-[0.985] ${
                answers[q.id] === o.value ? 'border-teal-600 bg-teal-50 text-teal-900' : 'border-stone-200 bg-white hover:border-teal-500'
              }`}
              onClick={() => pick(o.value)}
            >
              <span className="text-2xl" aria-hidden="true">
                {o.emoji}
              </span>
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </Panel>
  )
}

// ---------------------------------------------------------------------------
// Interstitial — purely visual; answers are already applied when it shows.
// ---------------------------------------------------------------------------

export function Generating({ onReady }) {
  const ready = useRef(onReady)
  ready.current = onReady
  useEffect(() => {
    const t = setTimeout(() => ready.current(), 1600)
    return () => clearTimeout(t)
  }, [])
  return (
    <Panel className="anim-screen mx-3 mt-3 flex flex-col items-center gap-6 px-5 pb-16 pt-20 text-center">
      <div className="h-14 w-14 animate-spin rounded-full border-4 border-teal-100 border-t-teal-600" aria-hidden="true" />
      <div>
        <p className="text-lg font-bold text-stone-900">{BRAND.generatingTitle}</p>
        <p className="mt-1.5 text-sm text-stone-500">{BRAND.generatingDetail}</p>
      </div>
    </Panel>
  )
}
