import React from 'react'
import { BRAND } from './data.js'
import { stepState, currentStep, blockers, depNames } from './engine.js'
import { Modal, ProgressBar, Panel, Eyebrow, btn } from './ui.jsx'

// ---------------------------------------------------------------------------
// Pilot plan: the dependency-locked journey that makes every tile sourceable.
// Same three node states as the template (done / current / locked).
// ---------------------------------------------------------------------------

export function Plan({ profile, steps, completed, prog, card, onOpenStep, onGoto }) {
  const current = currentStep(steps, completed)
  const allDone = prog.total > 0 && prog.done === prog.total
  const dashes = card.counts.total - card.counts.measured

  return (
    <div className="anim-screen flex flex-col gap-3 px-3 pb-12 pt-3">
      <Panel className="p-5">
        <Eyebrow>Pilot plan · spec §8–9</Eyebrow>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-gold-light">Make every tile sourceable</h2>
        <p className="mt-1 text-sm text-stone-400">
          {profile.name ? `${profile.name}, ` : ''}each step wires one data source. A tile accepts entries only once its source is live — until then it shows its baseline or a dash.
        </p>

        <div className="mt-4 rounded-3xl border border-gold/20 bg-panel p-4 shadow-sm">
          <div className="flex items-baseline justify-between">
            <strong className="text-[15px]">
              {prog.done} of {prog.total} sources live
            </strong>
            <span className="text-sm font-bold tabular-nums text-gold">{prog.pct}%</span>
          </div>
          <div className="mt-2">
            <ProgressBar pct={prog.pct} />
          </div>
          <p className="mt-2.5 text-sm text-stone-400">
            {allDone ? (
              <>🎉 Every KPI has a live source.</>
            ) : (
              <>
                <strong className="text-stone-200">{dashes}</strong> tiles still show a dash. {current ? <>Up next: <strong className="text-stone-200">{current.title}</strong></> : null}
              </>
            )}
          </p>
        </div>

        {current && (
          <button
            className="mt-3 flex w-full flex-col gap-1 rounded-3xl border-[1.5px] border-gold bg-gradient-to-br from-gold/15 to-transparent p-5 text-left shadow-lg shadow-gold/10 transition active:scale-[0.99]"
            onClick={() => onOpenStep(current.id)}
          >
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-gold">Your next step</span>
            <span className="text-xl font-extrabold text-stone-100">
              <span aria-hidden="true">{current.icon}</span> {current.title}
            </span>
            <span className="text-[13px] text-stone-400">
              {current.time} · {current.owner} · feeds {current.feeds.length} tile{current.feeds.length === 1 ? '' : 's'}
            </span>
            <span className="mt-1 text-sm font-bold text-gold-light">Open step →</span>
          </button>
        )}
      </Panel>

      <Panel className="p-4">
        <ol className="mt-1">
          {steps.map((s, i) => {
            const state = stepState(s, completed)
            const locked = state === 'locked'
            const isCurrent = current?.id === s.id
            const blockedBy = locked ? blockers(s, steps, completed) : []
            return (
              <li key={s.id} className="relative grid grid-cols-[34px_1fr] gap-2.5 pb-2.5">
                {i < steps.length - 1 && <span className="absolute bottom-0 left-4 top-9 w-0.5 bg-white/10" aria-hidden="true" />}
                <span
                  className={`z-[1] mt-1.5 flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-extrabold ${
                    state === 'done'
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : isCurrent
                        ? 'border-gold bg-panel ring-4 ring-gold/20'
                        : locked
                          ? 'border-gold/20 bg-white/[0.06] text-xs'
                          : 'border-gold/50 bg-panel'
                  }`}
                  aria-hidden="true"
                >
                  {state === 'done' ? '✓' : locked ? '🔒' : ''}
                </span>
                <button
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition ${
                    locked
                      ? 'border-gold/20 bg-ink/88 opacity-70'
                      : isCurrent
                        ? 'border-[1.5px] border-gold/60 bg-panel shadow-sm hover:border-gold'
                        : state === 'done'
                          ? 'border-gold/20 bg-panel opacity-75'
                          : 'border-gold/20 bg-panel hover:border-gold/70'
                  }`}
                  onClick={() => onOpenStep(s.id)}
                  aria-label={`${s.title}${locked ? ` (locked — complete ${blockedBy.join(' and ')} first)` : state === 'done' ? ' (live)' : ''}`}
                >
                  <span className="text-xl" aria-hidden="true">
                    {s.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[15px] font-bold ${state === 'done' ? 'text-stone-400 line-through decoration-stone-300' : 'text-stone-100'}`}>{s.title}</span>
                    <span className={`block text-xs ${locked ? 'text-stone-400' : state === 'done' ? 'text-emerald-300' : 'text-stone-400'}`}>
                      {state === 'done'
                        ? `Live ✓ · ${s.owner} · ${s.cadence}`
                        : locked
                          ? `Locked — complete ${blockedBy.join(' & ')} first`
                          : isCurrent
                            ? 'Up next — tap to open'
                            : `${s.time} · ${s.owner}`}
                    </span>
                  </span>
                  <span className="text-lg text-stone-500" aria-hidden="true">
                    ›
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
        <button className={`${btn.outline} mt-2`} onClick={() => onGoto('dashboard')}>
          📊 Back to the scorecard
        </button>
      </Panel>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step detail — bottom sheet. Locked steps still open (read ahead, prep).
// ---------------------------------------------------------------------------

export function StepSheet({ step, steps, completed, checked, card, onToggle, onComplete, onUndo, onClose, onOpenTile }) {
  const state = stepState(step, completed)
  const locked = state === 'locked'
  const blockedBy = locked ? blockers(step, steps, completed) : []
  const afterDone = new Set([...completed, step.id])
  const willUnlock = steps.filter((s) => s.deps.includes(step.id) && stepState(s, afterDone) === 'open').map((s) => s.short)
  const deps = depNames(step, steps)
  const feeds = step.feeds.map((id) => card.byId[id]).filter(Boolean)

  return (
    <Modal title={null} onClose={onClose} sheet>
      <div className="flex items-start gap-3.5">
        <span className="text-4xl leading-none" aria-hidden="true">
          {step.icon}
        </span>
        <div>
          <h3 className="text-xl font-extrabold tracking-tight text-stone-100">{step.title}</h3>
          <p className="mt-0.5 text-[13px] text-stone-400">
            ⏱ {step.time} · {step.owner} · {step.cadence}
          </p>
        </div>
      </div>

      {locked ? (
        <div className="mt-4 rounded-2xl bg-white/[0.06] px-4 py-3 text-[13px] text-stone-500">
          🔒 <strong>Locked — complete {blockedBy.join(' & ')} first.</strong> You can still read ahead and get ready.
        </div>
      ) : state === 'done' ? (
        <div className="mt-4 rounded-2xl bg-emerald-400/10 px-4 py-3 text-[13px] font-semibold text-emerald-300">
          ✓ Live — its tiles accept entries.{' '}
          <button className="font-bold underline decoration-emerald-400/50 underline-offset-2" onClick={onUndo}>
            Mark as not live
          </button>
        </div>
      ) : deps.length > 0 ? (
        <div className="mt-4 rounded-2xl bg-gold/10 px-4 py-3 text-[13px] text-gold-light">
          🔓 This step unlocked because <strong>{deps.join(' & ')}</strong> {deps.length > 1 ? 'are' : 'is'} live.
        </div>
      ) : null}

      {feeds.length > 0 && (
        <section className="mt-5">
          <h4 className="text-sm font-extrabold text-stone-100">Feeds {feeds.length} tile{feeds.length === 1 ? '' : 's'}</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            {feeds.map((t) => (
              <button
                key={t.id}
                className={`inline-flex items-center gap-1.5 rounded-full border border-gold/20 px-3 py-1.5 text-xs font-bold transition active:scale-[0.97] hover:border-gold/70 ${t.status.bg} ${t.status.fg}`}
                onClick={() => onOpenTile(t.id)}
              >
                <span aria-hidden="true">{t.icon}</span> {t.short} · {t.display}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="mt-5">
        <h4 className="text-sm font-extrabold text-stone-100">What you'll need</h4>
        <ul className="mt-2 flex flex-col gap-1.5">
          {step.needs.map((d, i) => (
            <li key={i}>
              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-white/[0.04] px-3.5 py-2.5 text-sm">
                <input type="checkbox" className="mt-0.5 h-4.5 w-4.5 flex-none accent-[#7fd39a]" checked={!!checked[i]} onChange={() => onToggle(i)} />
                <span className={checked[i] ? 'text-stone-400 line-through' : ''}>{d}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-4 rounded-2xl border border-amber-400/50/40 bg-amber-400/10 px-4 py-3">
        <span className="text-xs font-extrabold uppercase tracking-wide text-amber-200">⚠️ Common mistake to avoid</span>
        <p className="mt-1 text-[13px] leading-relaxed text-stone-200">{step.tip}</p>
      </div>

      {state !== 'done' && (
        <button className={`${btn.primary} mt-5`} disabled={locked} onClick={onComplete}>
          {locked ? `Locked — complete ${blockedBy[0]} first` : '✓ Mark source as live'}
        </button>
      )}
      {!locked && state !== 'done' && willUnlock.length > 0 && <p className="mt-2.5 text-center text-xs text-stone-400">Going live unlocks: {willUnlock.join(', ')}</p>}
      <p className="mt-2 text-center text-[11px] text-stone-400">Demo — marks the source live for this session only. {BRAND.guardrail}</p>
    </Modal>
  )
}
