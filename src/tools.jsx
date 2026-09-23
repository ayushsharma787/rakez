import React, { useState } from 'react'
import { BRAND, QUADRANTS, BE_DIMENSIONS, SHOP_PROTOCOL, SAMPLE_PARTNERS, BUILD_OPTIONS, EXCEL_DATA_COLUMNS, GOVERNANCE, SOURCES } from './data.js'
import { STATUS_META, status, beComposite, kpiById } from './engine.js'
import { Modal, StatusChip, Segmented, Panel, Eyebrow, ProgressBar, btn } from './ui.jsx'

// ---------------------------------------------------------------------------
// KPI dictionary (spec §4) + sources & governance (§8–9) + Excel build (§5).
// ---------------------------------------------------------------------------

export function Dictionary({ card, onOpenTile, completed }) {
  const [tab, setTab] = useState('dictionary')
  const [q, setQ] = useState('')
  const [quad, setQuad] = useState('all')
  const needle = q.trim().toLowerCase()
  const rows = card.tiles.filter((t) => {
    if (quad !== 'all' && t.quadrant !== quad) return false
    if (!needle) return true
    return [t.id, t.label, t.owner, t.source, t.definition].join(' ').toLowerCase().includes(needle)
  })

  return (
    <div className="anim-screen flex flex-col gap-3 px-3 pb-12 pt-3">
      <Panel className="p-5">
        <Eyebrow>Reference</Eyebrow>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-gold-light">KPI dictionary</h2>
        <p className="mt-1 text-sm text-stone-400">One row per tile. Baselines are from the GIP III evidence; targets are the 18-month horizon; a dash means RAKEZ must supply the figure.</p>
        <div className="mt-4">
          <Segmented
            size="sm"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'dictionary', label: '📖 Dictionary' },
              { value: 'sources', label: '🔌 Sources' },
              { value: 'excel', label: '📊 Excel build' },
            ]}
          />
        </div>
      </Panel>

      {tab === 'dictionary' && (
        <Panel className="p-4">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search KPI, owner, source…"
            className="w-full rounded-xl border-[1.5px] border-gold/20 px-3.5 py-2.5 text-sm focus:border-gold focus:outline-none"
            aria-label="Search the KPI dictionary"
          />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[{ id: 'all', label: 'All 19' }, { id: 'hero', label: 'Hero' }, ...QUADRANTS].map((o) => (
              <button
                key={o.id}
                className={`rounded-full border px-3 py-1 text-xs font-bold transition active:scale-[0.97] ${
                  quad === o.id ? 'border-gold bg-gold/10 text-gold-light' : 'border-gold/20 bg-panel text-stone-400 hover:border-gold/70'
                }`}
                onClick={() => setQuad(o.id)}
                aria-pressed={quad === o.id}
              >
                {o.label}
              </button>
            ))}
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {rows.length === 0 && <li className="rounded-2xl bg-white/[0.06] px-4 py-6 text-center text-sm text-stone-400">No KPI matches “{q}”. Try an owner, like “Finance”.</li>}
            {rows.map((t) => (
              <li key={t.id}>
                <button className="flex w-full items-start gap-3 rounded-2xl border border-gold/20 bg-panel p-3.5 text-left transition active:scale-[0.99] hover:border-gold/70" onClick={() => onOpenTile(t.id)}>
                  <span className="text-xl" aria-hidden="true">
                    {t.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wide text-stone-400">
                      {t.id} {t.locked && <span title="Source not yet live">🔒</span>}
                    </span>
                    <span className="block text-[15px] font-bold text-stone-100">{t.label}</span>
                    <span className="block text-xs text-stone-400">
                      {t.owner} · {t.freq} · {t.source}
                    </span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-bold tabular-nums text-stone-200">
                        {t.display} → {t.target.display}
                      </span>
                      <StatusChip meta={t.status} />
                    </span>
                  </span>
                  <span className="text-lg text-stone-500" aria-hidden="true">
                    ›
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {tab === 'sources' && (
        <>
          <Panel className="p-4">
            <h3 className="text-base font-extrabold text-stone-100">Data sources and owners</h3>
            <ul className="mt-3 flex flex-col gap-2">
              {SOURCES.filter((s) => s.feeds.length).map((s) => {
                const live = completed.has(s.id)
                return (
                  <li key={s.id} className={`rounded-2xl border p-3.5 ${live ? 'border-emerald-400/40 bg-emerald-400/10' : 'border-gold/20 bg-panel'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[15px] font-bold text-stone-100">
                          <span aria-hidden="true">{s.icon}</span> {s.short}
                        </div>
                        <div className="text-xs text-stone-400">
                          {s.owner} · {s.cadence}
                        </div>
                      </div>
                      <span className={`flex-none rounded-full px-2 py-0.5 text-[11px] font-extrabold ${live ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/[0.06] text-stone-400'}`}>{live ? '✓ live' : '— not yet'}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {s.feeds.map((id) => {
                        const t = card.byId[id]
                        return (
                          <button key={id} className={`rounded-full px-2 py-0.5 text-[11px] font-bold transition active:scale-[0.97] ${t.status.bg} ${t.status.fg}`} onClick={() => onOpenTile(id)}>
                            {t.status.icon} {t.short}
                          </button>
                        )
                      })}
                    </div>
                  </li>
                )
              })}
            </ul>
          </Panel>
          <Panel className="p-4">
            <h3 className="text-base font-extrabold text-stone-100">Refresh cadence and governance</h3>
            <ul className="mt-3 flex flex-col gap-2">
              {GOVERNANCE.cadence.map((c) => (
                <li key={c.label} className="flex gap-3 rounded-2xl bg-white/[0.04] px-3.5 py-2.5 text-sm">
                  <span className="text-xl" aria-hidden="true">
                    {c.icon}
                  </span>
                  <span>
                    <strong className="text-stone-100">{c.label}.</strong> <span className="text-stone-400">{c.text}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 rounded-2xl border border-amber-400/50/40 bg-amber-400/10 px-4 py-3 text-[13px] text-amber-200">
              <strong>Change control.</strong> {GOVERNANCE.changeControl}
            </div>
            <p className="mt-3 text-xs text-stone-400">{GOVERNANCE.mockupNote}</p>
          </Panel>
        </>
      )}

      {tab === 'excel' && (
        <>
          <Panel className="p-4">
            <h3 className="text-base font-extrabold text-stone-100">Sheet 1 — Data (monthly entry)</h3>
            <div className="mt-3 overflow-hidden rounded-2xl border border-gold/20 text-[13px]">
              <div className="grid grid-cols-[1fr_1.2fr_1fr] bg-white/[0.06] px-3 py-2 text-[10px] font-extrabold uppercase tracking-wide text-stone-400">
                <span>Column</span>
                <span>Type</span>
                <span>Example</span>
              </div>
              {EXCEL_DATA_COLUMNS.map(([c, t, e]) => (
                <div key={c} className="grid grid-cols-[1fr_1.2fr_1fr] border-t border-gold/10 px-3 py-2">
                  <span className="font-bold text-stone-200">{c}</span>
                  <span className="text-stone-400">{t}</span>
                  <span className="tabular-nums text-stone-500">{e}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel className="p-4">
            <h3 className="text-base font-extrabold text-stone-100">Sheets 2–4 — Dictionary, Dashboard, BE_Rescoring</h3>
            <ul className="mt-3 flex flex-col gap-2 text-[13px] text-stone-500">
              <li className="rounded-2xl bg-white/[0.04] px-3.5 py-2.5">
                <strong>KPI_Dictionary:</strong> KPI_ID, Quadrant, KPI, Definition, Source, Owner, Frequency, Baseline, Target, Red_below, Amber_below. The Dashboard looks up thresholds here.
              </li>
              <li className="rounded-2xl bg-white/[0.04] px-3.5 py-2.5">
                <strong>Dashboard tile:</strong> <code className="rounded bg-panel px-1 text-xs">=XLOOKUP(KPI_ID &amp; latest period, Data)</code> for Value; <code className="rounded bg-panel px-1 text-xs">=XLOOKUP(KPI_ID, KPI_Dictionary)</code> for Target.
              </li>
              <li className="rounded-2xl bg-white/[0.04] px-3.5 py-2.5">
                <strong>Status:</strong> <code className="rounded bg-panel px-1 text-xs">=IF(Value="","AMBER",IF(Value&lt;Red_below,"RED",IF(Value&lt;Amber_below,"AMBER","GREEN")))</code>
              </li>
              <li className="rounded-2xl bg-white/[0.04] px-3.5 py-2.5">
                <strong>Conditional formatting:</strong>{' '}
                {['red', 'amber', 'green'].map((k) => (
                  <span key={k} className={`mr-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold ${STATUS_META[k].bg} ${STATUS_META[k].fg}`}>
                    {STATUS_META[k].icon} {STATUS_META[k].fill} / {STATUS_META[k].hex}
                  </span>
                ))}
              </li>
              <li className="rounded-2xl bg-white/[0.04] px-3.5 py-2.5">
                <strong>Hero bars:</strong> stacked bar of Value and (Target − Value), or <code className="rounded bg-panel px-1 text-xs">=REPT("█", Value/Target*20)</code>.
              </li>
              <li className="rounded-2xl bg-white/[0.04] px-3.5 py-2.5">
                <strong>Benchmark chart:</strong> clustered column from a small static table (zone, BE score, Google rating); RAKEZ series red.
              </li>
            </ul>
          </Panel>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Brand Equity re-scoring worksheet (spec §6) — the live calculator.
// ---------------------------------------------------------------------------

export function Rescoring({ scores, onScore, onApply, onReset, currentBE }) {
  const composite = beComposite(scores)
  const be = kpiById('HERO_01')
  const st = status(be, composite)
  const changed = composite !== currentBE
  const total = BE_DIMENSIONS.reduce((a, d) => a + (scores[d.id] ?? 0) * d.weight, 0)

  return (
    <div className="anim-screen flex flex-col gap-3 px-3 pb-12 pt-3">
      <Panel className="p-5">
        <Eyebrow>Live tool · spec §6</Eyebrow>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-gold-light">Brand Equity re-scoring</h2>
        <p className="mt-1 text-sm text-stone-400">Score each dimension 1–5 using its rule; the composite recalculates as you tap. Re-run quarterly in the pilot, then annually.</p>

        <div className={`mt-4 rounded-3xl p-5 ${st.bg}`}>
          <div className="flex items-end justify-between gap-3">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wide text-stone-400">Composite score</span>
              <div className={`text-5xl font-light tabular-nums leading-none tracking-tight ${st.fg}`}>{composite}</div>
              <div className="mt-1 text-xs font-semibold text-stone-400">Σ weighted {total.toFixed(2)} of 5.00 → ÷ 5 × 100</div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-extrabold uppercase tracking-wide text-stone-400">On the scorecard</span>
              <div className="text-2xl font-light tabular-nums text-stone-200">{currentBE}</div>
              <div className="text-xs font-semibold text-stone-400">target 70</div>
            </div>
          </div>
          <div className="mt-3">
            <ProgressBar pct={composite} tone={st.tone === 'green' ? 'good' : st.tone === 'amber' ? 'warn' : 'bad'} marker={70} />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <StatusChip meta={st} detail={be.thresholds} />
          </div>
        </div>

        <button className={`${btn.primary} mt-4`} disabled={!changed} onClick={() => onApply(composite)}>
          {changed ? `✓ Apply ${composite} to the scorecard` : 'Scorecard already shows this composite'}
        </button>
        <button className={`${btn.ghost} mt-1 w-full`} onClick={onReset}>
          ↺ Reset to the {BRAND.period} baseline scoring
        </button>
      </Panel>

      <Panel className="p-4">
        <ul className="flex flex-col gap-3">
          {BE_DIMENSIONS.map((d) => {
            const s = scores[d.id]
            return (
              <li key={d.id} className="rounded-2xl border border-gold/20 bg-panel p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[15px] font-extrabold text-stone-100">{d.label}</h3>
                    <p className="text-xs text-stone-400">Weight {d.weight.toFixed(2)} · Evidence: {d.evidence}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-extrabold tabular-nums text-gold">{(s * d.weight).toFixed(2)}</div>
                    <div className="text-[10px] font-extrabold uppercase tracking-wide text-stone-400">weighted</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-5 gap-2" role="radiogroup" aria-label={`${d.label} score`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      role="radio"
                      aria-checked={s === n}
                      className={`rounded-xl border-[1.5px] py-2 text-sm font-bold transition active:scale-[0.97] ${
                        s === n ? 'border-gold bg-gold/10 text-gold-light' : 'border-gold/20 bg-panel text-stone-500 hover:border-gold/70'
                      }`}
                      onClick={() => onScore(d.id, n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="mt-2 rounded-xl bg-white/[0.04] px-3 py-2 text-[13px] text-stone-500">
                  <strong>Rule for {s}:</strong> {d.rules[s] || 'Below the rule for 2'}
                </p>
                <p className="mt-1 text-[11px] text-stone-400">Baseline {d.baseline} · {d.baselineNote}</p>
              </li>
            )
          })}
        </ul>
        <div className="mt-4 rounded-2xl border border-amber-400/50/40 bg-amber-400/10 px-4 py-3 text-[13px] text-amber-200">
          <strong>Two-coder rule.</strong> Two people score blind; record agreement % on the sheet; reconcile differences by evidence, not by averaging.
        </div>
        <p className="mt-3 text-xs text-stone-400">Baseline scores are a sample reconstruction consistent with the 48 composite — replace them with the Appendix B scores.</p>
      </Panel>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Partner mystery-shop log (spec §7) — feeds three tiles.
// ---------------------------------------------------------------------------

export function Shop({ shops, outputs, card, onAdd, onClear, onOpenTile }) {
  const [open, setOpen] = useState(false)
  const fed = ['CUST_01', 'CUST_02', 'LG_02'].map((id) => card.byId[id])
  return (
    <div className="anim-screen flex flex-col gap-3 px-3 pb-12 pt-3">
      <Panel className="p-5">
        <Eyebrow>Quarterly protocol · spec §7</Eyebrow>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-gold-light">Partner mystery shop</h2>
        <p className="mt-1 text-sm text-stone-400">{SHOP_PROTOCOL.sample} Persona: {SHOP_PROTOCOL.persona}</p>
        <button className={`${btn.primary} mt-4`} onClick={() => setOpen(true)}>
          + Log a shop call
        </button>
      </Panel>

      <Panel className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-stone-100">Outputs → tiles</h3>
          <span className="text-xs font-semibold text-stone-400">{outputs.n ? `${outputs.n} call${outputs.n === 1 ? '' : 's'} logged` : 'Baseline · 0 of 2'}</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {fed.map((t) => (
            <button key={t.id} className={`flex flex-col rounded-2xl border border-gold/15 p-3 text-left transition active:scale-[0.985] hover:border-gold/70 ${t.status.bg}`} onClick={() => onOpenTile(t.id)}>
              <span className="text-[10px] font-extrabold uppercase leading-tight tracking-wide text-stone-400">{t.short}</span>
              <span className={`mt-1 text-2xl font-light tabular-nums leading-none ${t.status.fg}`}>{t.display}</span>
              <span className="mt-2 text-[10px] font-semibold text-stone-400">→ {t.target.display}</span>
            </button>
          ))}
        </div>
        <ul className="mt-3 flex flex-col gap-1.5 text-[13px] text-stone-500">
          {SHOP_PROTOCOL.record.map((r, i) => (
            <li key={i} className="flex gap-2 rounded-xl bg-white/[0.04] px-3.5 py-2">
              <span className="font-extrabold tabular-nums text-gold">{i + 1}</span> {r}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-stone-100">Logged calls</h3>
          {shops.length > 0 && (
            <button className={btn.ghost} onClick={onClear}>
              Clear log
            </button>
          )}
        </div>
        {shops.length === 0 ? (
          <p className="mt-3 rounded-2xl bg-white/[0.06] px-4 py-6 text-center text-sm text-stone-400">No calls logged yet. Logging the first one marks the mystery shop live and recomputes three tiles.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {shops.map((s) => (
              <li key={s.id} className="rounded-2xl border border-gold/20 bg-panel p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-bold text-stone-100">{s.partner}</span>
                  <span className="text-[11px] font-semibold text-stone-400">{s.when}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] font-bold">
                  <span className={`rounded-full px-2 py-0.5 ${s.namedFirst ? 'bg-rag-green-bg text-rag-green-fg' : 'bg-rag-red-bg text-rag-red-fg'}`}>{s.namedFirst ? '✓ named RAKEZ first' : '⚑ prompted'}</span>
                  <span className={`rounded-full px-2 py-0.5 ${s.priceMatched ? 'bg-rag-green-bg text-rag-green-fg' : 'bg-rag-red-bg text-rag-red-fg'}`}>{s.priceMatched ? '✓ price matched' : '⚑ price off record'}</span>
                  <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-stone-500">{s.extras}/5 extras</span>
                  <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-stone-500">{Object.values(s.script).filter(Boolean).length}/3 script</span>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[11px] text-stone-400">Sample partner names are invented. Publish a partner leaderboard from this log; tier movement follows.</p>
      </Panel>

      {open && (
        <ShopModal
          onClose={() => setOpen(false)}
          onSubmit={(entry) => {
            setOpen(false)
            onAdd(entry)
          }}
        />
      )}
    </div>
  )
}

export function ShopModal({ onSubmit, onClose }) {
  const [partner, setPartner] = useState(SAMPLE_PARTNERS[0])
  const [custom, setCustom] = useState('')
  const [namedFirst, setNamedFirst] = useState(false)
  const [priceMatched, setPriceMatched] = useState(false)
  const [extras, setExtras] = useState(0)
  const [script, setScript] = useState({ anchor: false, allin: false, owner: false })
  const submit = () => {
    onSubmit({
      id: Date.now(),
      partner: (partner === '__custom' ? custom.trim() : partner) || 'Unnamed partner',
      namedFirst,
      priceMatched,
      extras,
      script,
      when: 'this quarter',
    })
  }
  const Toggle = ({ label, hint, value, onChange }) => (
    <button
      className={`flex w-full items-center justify-between rounded-2xl border-[1.5px] p-3.5 text-left transition active:scale-[0.985] ${
        value ? 'border-emerald-500 bg-emerald-400/10' : 'border-gold/20 bg-panel hover:border-gold/70'
      }`}
      onClick={() => onChange(!value)}
      aria-pressed={value}
    >
      <span>
        <span className="block text-sm font-bold text-stone-100">{label}</span>
        <span className="block text-xs text-stone-400">{hint}</span>
      </span>
      <span className={`text-lg ${value ? 'text-emerald-300' : 'text-stone-500'}`} aria-hidden="true">
        {value ? '✓' : '○'}
      </span>
    </button>
  )
  return (
    <Modal title="Log a shop call" onClose={onClose}>
      <label className="block">
        <span className="text-xs font-extrabold uppercase tracking-wide text-stone-400">Partner</span>
        <select value={partner} onChange={(e) => setPartner(e.target.value)} className="mt-1.5 w-full rounded-xl border-[1.5px] border-gold/20 bg-panel px-3.5 py-2.5 text-sm focus:border-gold focus:outline-none">
          {SAMPLE_PARTNERS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
          <option value="__custom">Other…</option>
        </select>
      </label>
      {partner === '__custom' && (
        <input
          autoFocus
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Partner name"
          className="mt-2 w-full rounded-xl border-[1.5px] border-gold/20 px-3.5 py-2.5 text-sm focus:border-gold focus:outline-none"
          aria-label="Partner name"
        />
      )}
      <div className="mt-3 flex flex-col gap-2">
        <Toggle label="Named RAKEZ before the prospect did" hint="Prompting it yourself counts as no" value={namedFirst} onChange={setNamedFirst} />
        <Toggle label="Headline price matched the price of record" hint="Same package, published price" value={priceMatched} onChange={setPriceMatched} />
      </div>
      <div className="mt-3">
        <span className="text-xs font-extrabold uppercase tracking-wide text-stone-400">Standard extras disclosed unprompted</span>
        <div className="mt-1.5 grid grid-cols-6 gap-2">
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              className={`rounded-xl border-[1.5px] py-2 text-sm font-bold transition active:scale-[0.97] ${extras === n ? 'border-gold bg-gold/10 text-gold-light' : 'border-gold/20 bg-panel text-stone-500 hover:border-gold/70'}`}
              onClick={() => setExtras(n)}
              aria-pressed={extras === n}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3">
        <span className="text-xs font-extrabold uppercase tracking-wide text-stone-400">Script elements used</span>
        <div className="mt-1.5 flex flex-col gap-1.5">
          {SHOP_PROTOCOL.scriptElements.map((el) => (
            <label key={el.id} className="flex cursor-pointer items-center gap-2.5 rounded-xl bg-white/[0.04] px-3.5 py-2.5 text-sm">
              <input type="checkbox" className="h-4.5 w-4.5 accent-[#7fd39a]" checked={!!script[el.id]} onChange={() => setScript((s) => ({ ...s, [el.id]: !s[el.id] }))} />
              {el.label}
            </label>
          ))}
        </div>
      </div>
      <button className={`${btn.primary} mt-5`} onClick={submit}>
        ✓ Log call and recompute tiles
      </button>
      <p className="mt-2 text-center text-xs text-stone-400">Demo — kept in memory for this session only.</p>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Three build options (spec §2) — tier cards.
// ---------------------------------------------------------------------------

export function Build({ chosen, onChoose }) {
  const [confirm, setConfirm] = useState(null)
  return (
    <div className="anim-screen flex flex-col gap-3 px-3 pb-12 pt-3">
      <Panel className="p-5">
        <Eyebrow>Delivery · spec §2</Eyebrow>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-gold-light">Three build options</h2>
        <p className="mt-1 text-sm text-stone-400">Deliver A for the review; hand over B as the pilot artefact; scope C as the 6-month step.</p>
      </Panel>
      <div className="flex flex-col gap-4 px-1 pt-2">
        {BUILD_OPTIONS.map((o) => {
          const isChosen = chosen === o.id
          return (
            <div key={o.id} className={`relative rounded-3xl border bg-panel p-5 shadow-sm ${o.recommended ? 'border-[1.5px] border-gold shadow-xl shadow-gold/10' : 'border-gold/20'}`}>
              {o.recommended && <span className="absolute -top-3 left-5 rounded-full bg-gold text-ink px-2.5 py-0.5 text-[11px] font-extrabold">Pilot artefact</span>}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-extrabold text-stone-100">
                    <span aria-hidden="true">{o.icon}</span> {o.name}
                  </h3>
                  <p className="mt-0.5 text-sm text-stone-400">{o.tool}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-light tabular-nums tracking-tight text-stone-100">{o.effort}</div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wide text-stone-400">effort</div>
                </div>
              </div>
              <p className="mt-3 text-sm font-semibold text-gold-light">“{o.when}”</p>
              <ul className="mt-3 flex flex-col gap-1.5 text-sm text-stone-500">
                {o.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-emerald-300" aria-hidden="true">
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              {isChosen ? (
                <div className="mt-4 rounded-2xl border border-dashed border-emerald-400 px-4 py-3 text-center text-sm font-bold text-emerald-300">✓ Selected — {o.role}</div>
              ) : (
                <button className={`${btn.outline} mt-4`} onClick={() => setConfirm(o)}>
                  Select: {o.role} →
                </button>
              )}
            </div>
          )
        })}
      </div>
      {confirm && (
        <Modal title="Confirm build option (demo)" onClose={() => setConfirm(null)}>
          <p className="text-sm text-stone-500">
            Select <strong>{confirm.name}</strong> — {confirm.when.toLowerCase()}. Effort {confirm.effort}.
          </p>
          <p className="mt-2 rounded-2xl bg-gold/10 px-4 py-3 text-[13px] text-gold-light">This is the demo — nothing is ordered, stored or sent.</p>
          <button
            className={`${btn.primary} mt-4`}
            onClick={() => {
              onChoose(confirm)
              setConfirm(null)
            }}
          >
            ✓ Confirm (demo)
          </button>
          <button className={`${btn.ghost} mt-1 w-full`} onClick={() => setConfirm(null)}>
            Cancel
          </button>
        </Modal>
      )}
    </div>
  )
}
