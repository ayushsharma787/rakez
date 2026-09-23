import React, { useEffect, useMemo, useRef, useState } from 'react'
import { BRAND, QUADRANTS, ROLE_META, CADENCE_META, BENCHMARK, SOURCES } from './data.js'
import { STATUS_META, status, fmtValue, scalePct, ownedBy, matchesCadence, sourceById } from './engine.js'
import { Modal, ProgressBar, StatusChip, Segmented, Eyebrow, Panel, btn } from './ui.jsx'
import { SceneBand, useSceneObserver, sceneCaption } from './scenes.jsx'
import { Skyline3D, Benchmark3D, ModelCaption } from './three.jsx'

// ---------------------------------------------------------------------------
// The scorecard: header zone → hero row → 3D skyline → quadrant grid →
// benchmark chart → footer, with transparent scene bands between panels so
// the building photograph behind changes as you scroll. `view === 'slide'`
// renders the spec's strict layout (3 hero, 4×4 tiles, 1 chart, nothing else).
// ---------------------------------------------------------------------------

function RagBadge({ tile, small = false }) {
  const m = tile.status
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-white/70 px-2 py-0.5 font-extrabold ${m.fg} ${small ? 'text-[10px]' : 'text-[11px]'}`}>
      <span aria-hidden="true">{m.icon}</span> {m.label}
    </span>
  )
}

function Tile({ tile, dim, mine, onOpen }) {
  const m = tile.status
  return (
    <button
      className={`relative flex min-h-[112px] flex-col justify-between rounded-2xl border p-3 text-left transition active:scale-[0.985] hover:border-teal-500 ${m.bg} ${
        dim ? 'opacity-40' : ''
      } ${mine ? 'border-teal-600/60 ring-2 ring-teal-600/15' : 'border-stone-200/70'}`}
      onClick={() => onOpen(tile.id)}
      aria-label={`${tile.label}: ${tile.display}, target ${tile.target.display}, ${m.label}${tile.locked ? ', source not yet live' : ''}`}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-extrabold uppercase leading-tight tracking-wide text-stone-500">{tile.short}</span>
        <span className="flex flex-none items-center gap-1">
          {tile.locked && (
            <span className="text-[10px]" title="Source not yet live" aria-hidden="true">
              🔒
            </span>
          )}
          {mine && <span className="rounded-full bg-teal-700 px-1.5 text-[9px] font-extrabold text-white">yours</span>}
        </span>
      </span>
      <span className="mt-1 flex items-baseline gap-1.5">
        <span className={`text-2xl font-extrabold tabular-nums leading-none ${m.fg}`}>{tile.display}</span>
        {tile.detail && <span className="truncate text-[10px] font-semibold text-stone-500">{tile.detail}</span>}
      </span>
      <span className="mt-2 flex items-center justify-between gap-1">
        <span className="truncate text-[10px] font-semibold text-stone-500">→ {tile.target.display}</span>
        <RagBadge tile={tile} small />
      </span>
    </button>
  )
}

function HeroCard({ tile, focus, onOpen }) {
  const m = tile.status
  const pct = scalePct(tile, tile.value)
  const marker = scalePct(tile, tile.target.value)
  return (
    <button
      className={`relative flex flex-col rounded-3xl border bg-white p-3.5 text-left shadow-sm transition active:scale-[0.99] hover:border-teal-500 sm:p-5 ${
        focus ? 'border-[1.5px] border-teal-600 shadow-lg shadow-teal-700/10' : 'border-stone-200'
      }`}
      onClick={() => onOpen(tile.id)}
      aria-label={`${tile.label}: ${tile.display}, target ${tile.target.display}, ${m.label}`}
    >
      {focus && <span className="absolute -top-3 left-4 rounded-full bg-teal-700 px-2.5 py-0.5 text-[10px] font-extrabold text-white">In focus</span>}
      <span className="text-[10px] font-extrabold uppercase leading-tight tracking-wide text-stone-500 sm:text-[11px]">
        <span aria-hidden="true">{tile.icon}</span> {tile.label}
      </span>
      <span className={`mt-2 text-3xl font-extrabold tabular-nums leading-none tracking-tight sm:text-5xl ${m.fg}`}>{tile.display}</span>
      <span className="mt-1.5 text-[11px] font-semibold text-stone-500 sm:text-xs">
        target <strong className="text-stone-800">{tile.target.display}</strong>
        {tile.detail ? <span className="text-stone-400"> · {tile.detail}</span> : null}
      </span>
      <span className="mt-3 block">
        <ProgressBar pct={pct} tone={m.tone === 'green' ? 'good' : m.tone === 'amber' ? 'warn' : 'bad'} marker={marker} />
      </span>
      <span className="mt-2.5 flex items-center justify-between">
        <StatusChip meta={m} />
        <span className="hidden text-[10px] font-semibold text-stone-400 sm:inline sm:text-xs">{tile.isEntry ? 'demo entry' : BRAND.period}</span>
      </span>
    </button>
  )
}

function Quadrant({ q, tiles, role, onlyMine, onOpen, cadence }) {
  const reds = tiles.filter((t) => t.status.tone === 'red').length
  const unm = tiles.filter((t) => t.value == null).length
  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-extrabold tracking-tight text-navy">
            <span aria-hidden="true">{q.icon}</span> {q.label}
          </h3>
          <p className="text-xs text-stone-500">{q.blurb}</p>
        </div>
        <div className="flex flex-none flex-col items-end gap-1 text-[10px] font-extrabold">
          {reds > 0 && (
            <span className="rounded-full bg-rag-red-bg px-2 py-0.5 text-rag-red-fg">
              ⚑ {reds} red
            </span>
          )}
          {unm > 0 && (
            <span className="rounded-full bg-rag-amber-bg px-2 py-0.5 text-rag-amber-fg">
              ◐ {unm} unmeasured
            </span>
          )}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {tiles.map((t) => {
          const mine = role && role !== 'leadership' && ownedBy(t, role)
          const cadenceHit = cadence && cadence !== 'monthly' && matchesCadence(t, cadence)
          const dim = onlyMine && role !== 'leadership' && !mine
          return <Tile key={t.id} tile={t} dim={dim} mine={!!mine || !!cadenceHit} onOpen={onOpen} />
        })}
      </div>
    </div>
  )
}

// ------------------------------------------------------------- 2D benchmark

export function Benchmark2D({ zones, target }) {
  const W = 360
  const H = 210
  const padL = 30
  const padB = 34
  const padT = 18
  const chartH = H - padB - padT
  const groupW = (W - padL - 10) / zones.length
  const barW = Math.min(22, groupW * 0.32)
  const y = (v) => padT + chartH - (v / 100) * chartH
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Benchmark: Brand Equity score out of 100 and Google rating out of 5 per zone, RAKEZ in red, dashed target line at 70">
      <defs>
        <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="white" fillOpacity="0" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="white" strokeWidth="2" strokeOpacity="0.45" />
        </pattern>
      </defs>
      {[0, 25, 50, 75, 100].map((g) => (
        <g key={g}>
          <line x1={padL} x2={W - 6} y1={y(g)} y2={y(g)} stroke="#e1e7ef" strokeWidth="1" />
          <text x={padL - 6} y={y(g) + 3} fontSize="8" textAnchor="end" fill="#5b6b7f" fontWeight="700">
            {g}
          </text>
        </g>
      ))}
      <line x1={padL} x2={W - 6} y1={y(target)} y2={y(target)} stroke="#c2410c" strokeWidth="1.5" strokeDasharray="5 4" />
      <text x={W - 6} y={y(target) - 4} fontSize="8" textAnchor="end" fill="#c2410c" fontWeight="800">
        target {target}
      </text>
      {zones.map((z, i) => {
        const cx = padL + groupW * i + groupW / 2
        const isR = z.zone === 'RAKEZ'
        const beC = isR ? '#c2410c' : '#2a7d8c'
        const gC = isR ? '#c2410c' : '#1f3a5f'
        const gv = (z.google / 5) * 100
        return (
          <g key={z.zone}>
            <rect x={cx - barW - 2} y={y(z.be)} width={barW} height={y(0) - y(z.be)} rx="3" fill={beC} />
            {z.illustrative && <rect x={cx - barW - 2} y={y(z.be)} width={barW} height={y(0) - y(z.be)} rx="3" fill="url(#hatch)" />}
            <rect x={cx + 2} y={y(gv)} width={barW} height={y(0) - y(gv)} rx="3" fill={gC} opacity={isR ? 0.75 : 1} />
            {z.illustrative && <rect x={cx + 2} y={y(gv)} width={barW} height={y(0) - y(gv)} rx="3" fill="url(#hatch)" />}
            <text x={cx - barW / 2 - 2} y={y(z.be) - 3} fontSize="8" textAnchor="middle" fill="#0f1f33" fontWeight="800">
              {z.be}
            </text>
            <text x={cx + barW / 2 + 2} y={y(gv) - 3} fontSize="8" textAnchor="middle" fill="#0f1f33" fontWeight="800">
              {z.google.toFixed(1)}
            </text>
            <text x={cx} y={H - padB + 13} fontSize="9" textAnchor="middle" fill={isR ? '#c2410c' : '#0f1f33'} fontWeight="800">
              {z.zone}
            </text>
            {z.illustrative && (
              <text x={cx} y={H - padB + 23} fontSize="7" textAnchor="middle" fill="#5b6b7f" fontWeight="600">
                illustrative
              </text>
            )}
          </g>
        )
      })}
      <g fontSize="8" fontWeight="700" fill="#5b6b7f">
        <rect x={padL} y={H - 8} width="8" height="8" rx="2" fill="#2a7d8c" />
        <text x={padL + 11} y={H - 1}>
          BE score /100
        </text>
        <rect x={padL + 76} y={H - 8} width="8" height="8" rx="2" fill="#1f3a5f" />
        <text x={padL + 87} y={H - 1}>
          Google rating /5 (scaled)
        </text>
        <rect x={padL + 200} y={H - 8} width="8" height="8" rx="2" fill="#c2410c" />
        <text x={padL + 211} y={H - 1}>
          RAKEZ
        </text>
      </g>
    </svg>
  )
}

export function PeerModal({ zones, onSave, onClose }) {
  const [rows, setRows] = useState(zones.map((z) => ({ ...z })))
  const upd = (i, k, v) => setRows((r) => r.map((row, j) => (j === i ? { ...row, [k]: v } : row)))
  return (
    <Modal title="Peer values (demo)" onClose={onClose}>
      <p className="text-[13px] text-stone-500">
        Peer figures are illustrative placeholders. Enter the GIP III evidence here; RAKEZ stays at its Sep 2026 baseline unless changed.
      </p>
      <div className="mt-3 grid grid-cols-[1fr_80px_80px] items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-stone-400">
        <span>Zone</span>
        <span>BE /100</span>
        <span>Google /5</span>
      </div>
      <div className="mt-1 flex flex-col gap-2">
        {rows.map((z, i) => (
          <div key={z.zone} className="grid grid-cols-[1fr_80px_80px] items-center gap-2">
            <span className={`text-sm font-bold ${z.zone === 'RAKEZ' ? 'text-rag-red-fg' : 'text-stone-800'}`}>{z.zone}</span>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={z.be}
              onChange={(e) => upd(i, 'be', Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
              className="w-full rounded-xl border-[1.5px] border-stone-200 px-2.5 py-1.5 text-sm tabular-nums focus:border-teal-600 focus:outline-none"
              aria-label={`${z.zone} Brand Equity score`}
            />
            <input
              type="number"
              min="1"
              max="5"
              step="0.1"
              value={z.google}
              onChange={(e) => upd(i, 'google', Math.max(1, Math.min(5, Number(e.target.value) || 1)))}
              className="w-full rounded-xl border-[1.5px] border-stone-200 px-2.5 py-1.5 text-sm tabular-nums focus:border-teal-600 focus:outline-none"
              aria-label={`${z.zone} Google rating`}
            />
          </div>
        ))}
      </div>
      <button className={`${btn.primary} mt-5`} onClick={() => onSave(rows.map((r) => ({ ...r, illustrative: r.zone !== 'RAKEZ' && r.illustrative })))}>
        ✓ Save peer values (demo)
      </button>
      <p className="mt-2 text-center text-xs text-stone-400">Demo only — nothing is stored or transmitted.</p>
    </Modal>
  )
}

// ------------------------------------------------------------- Dashboard

export function Dashboard({
  profile,
  card,
  prog,
  view,
  onView,
  onlyMine,
  onOnlyMine,
  onOpenTile,
  onRestart,
  onGoto,
  peers,
  onEditPeers,
  benchMode,
  onBenchMode,
  scenes,
  onScene,
  entriesCount,
  onResetEntries,
}) {
  const rootRef = useRef(null)
  useSceneObserver(rootRef, onScene, [view])
  const role = profile.answers?.role
  const cadence = profile.answers?.cadence
  const focus = profile.answers?.focus
  const roleMeta = ROLE_META[role]
  const cadMeta = CADENCE_META[cadence]
  const S = (id) => scenes.find((s) => s.id === id)
  const slide = view === 'slide'
  const cadenceTiles = cadence && cadence !== 'monthly' ? card.tiles.filter((t) => matchesCadence(t, cadence) && t.quadrant !== 'hero') : []

  const asOf = useMemo(
    () =>
      SOURCES.filter((s) => s.feeds.length).map((s) => {
        const live = card.tiles.some((t) => t.sourceId === s.id && t.live)
        return { ...s, live }
      }),
    [card],
  )

  return (
    <div ref={rootRef} className="anim-screen flex flex-col gap-0 px-3 pb-12 pt-3">
      {/* ---------------------------------------------------------- Header */}
      <Panel data-scene="corniche" className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Eyebrow tone="brand">Balanced scorecard · monthly one-page view</Eyebrow>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-navy lg:text-3xl">{BRAND.title}</h2>
            <p className="mt-0.5 text-sm text-stone-500">
              Period <strong className="text-stone-800">{BRAND.period}</strong> · 3 hero numbers · 4 quadrants × 4 tiles · 1 benchmark chart
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className={`rounded-full px-3 py-1 text-[11px] font-extrabold ${entriesCount ? 'bg-amber-100 text-amber-800' : 'bg-navy text-white'}`}>
              {entriesCount ? `Scenario · ${entriesCount} demo ${entriesCount === 1 ? 'entry' : 'entries'}` : BRAND.periodPill}
            </span>
            {entriesCount > 0 && (
              <button className="text-xs font-semibold text-teal-700 underline decoration-teal-300 underline-offset-2" onClick={onResetEntries}>
                Reset to baseline
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-stone-900">
              {profile.name ? `${BRAND.greeting}, ${profile.name}` : `${BRAND.greeting}!`} <span aria-hidden="true">👋</span>
              {roleMeta && (
                <span className="ml-2 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-extrabold text-teal-800">
                  <span aria-hidden="true">{roleMeta.icon}</span> {roleMeta.label}
                </span>
              )}
            </p>
            {profile.bio && <p className="text-xs text-stone-500">{profile.bio}</p>}
            <button className="mt-0.5 text-xs font-semibold text-teal-700 underline decoration-teal-300 underline-offset-2" onClick={onRestart}>
              Not {profile.name || 'you'}? Retake the questionnaire
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              size="sm"
              value={view}
              onChange={onView}
              options={[
                { value: 'interactive', label: '🧊 Interactive' },
                { value: 'slide', label: '🖼️ Slide' },
              ]}
            />
            {role && role !== 'leadership' && (
              <button
                className={`rounded-full border px-3 py-1 text-xs font-bold transition active:scale-[0.98] ${
                  onlyMine ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-stone-200 bg-white text-stone-600 hover:border-teal-500'
                }`}
                onClick={() => onOnlyMine(!onlyMine)}
                aria-pressed={onlyMine}
              >
                {onlyMine ? '✓ Only my tiles' : 'Only my tiles'}
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          {[
            { k: 'red', n: card.counts.red },
            { k: 'amber', n: card.counts.amber },
            { k: 'green', n: card.counts.green },
          ].map(({ k, n }) => (
            <div key={k} className={`rounded-2xl px-2 py-2 ${STATUS_META[k].bg}`}>
              <div className={`text-xl font-extrabold tabular-nums ${STATUS_META[k].fg}`}>{n}</div>
              <div className={`text-[10px] font-extrabold uppercase tracking-wide ${STATUS_META[k].fg}`}>
                <span aria-hidden="true">{STATUS_META[k].icon}</span> {STATUS_META[k].label}
              </div>
            </div>
          ))}
          <button className="rounded-2xl bg-stone-100 px-2 py-2 transition active:scale-[0.98] hover:bg-teal-50" onClick={() => onGoto('plan')}>
            <div className="text-xl font-extrabold tabular-nums text-stone-800">
              {card.counts.measured}
              <span className="text-sm text-stone-400">/{card.counts.total}</span>
            </div>
            <div className="text-[10px] font-extrabold uppercase tracking-wide text-stone-500">measured →</div>
          </button>
        </div>

        {cadenceTiles.length > 0 && !slide && (
          <div className="mt-3 rounded-2xl bg-teal-50 px-4 py-3 text-[13px] text-teal-900">
            <strong>
              {cadence === 'weekly' ? '⚡' : '🔬'} {cadMeta.label} view
            </strong>{' '}
            — {cadMeta.note} Your tiles:{' '}
            {cadenceTiles.map((t, i) => (
              <button key={t.id} className="font-bold underline decoration-teal-300 underline-offset-2" onClick={() => onOpenTile(t.id)}>
                {t.short}
                {i < cadenceTiles.length - 1 ? ', ' : ''}
              </button>
            ))}
          </div>
        )}
        {prog.done < prog.total && !slide && (
          <button
            className="mt-3 flex w-full items-center justify-between rounded-2xl border border-dashed border-amber-400 bg-amber-50 px-4 py-3 text-left transition active:scale-[0.99]"
            onClick={() => onGoto('plan')}
          >
            <span className="text-[13px] font-semibold text-amber-900">
              🗺️ Pilot plan: <strong>{prog.done} of {prog.total}</strong> data sources live · {card.counts.total - card.counts.measured} tiles still show a dash
            </span>
            <span className="flex-none whitespace-nowrap text-sm font-bold text-amber-900">Open →</span>
          </button>
        )}
      </Panel>

      {!slide && <SceneBand scene={S('al-hamra')} />}
      {slide && <div className="h-3" />}

      {/* ---------------------------------------------------------- Hero */}
      <Panel data-scene="al-hamra" className="p-4 lg:p-5">
        <div className="flex items-center justify-between">
          <Eyebrow tone="navy">Hero row</Eyebrow>
          <span className="text-[11px] font-semibold text-stone-400">red marker = target</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2.5 lg:gap-4">
          {card.hero.map((t) => (
            <HeroCard key={t.id} tile={t} focus={focus === t.id} onOpen={onOpenTile} />
          ))}
        </div>
        {!slide && (
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <Eyebrow tone="navy">3D KPI skyline</Eyebrow>
              <span className="text-[11px] font-semibold text-stone-400">19 towers · live from the tiles</span>
            </div>
            <Skyline3D hero={card.hero} byQuadrant={card.byQuadrant} onSelect={onOpenTile} className="mt-2 h-80 lg:h-96" />
            <ModelCaption left="Height = progress to target · outline = target" right="Drag to orbit · tap a tower" />
          </div>
        )}
      </Panel>

      {!slide && <SceneBand scene={S('business-zone')} />}
      {slide && <div className="h-3" />}

      {/* ---------------------------------------------------------- Quadrants */}
      {slide ? (
        <Panel data-scene="business-zone" className="p-4 lg:p-5">
          <Eyebrow tone="navy">Quadrant grid</Eyebrow>
          <div className="mt-3 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {QUADRANTS.map((q) => (
              <Quadrant key={q.id} q={q} tiles={card.byQuadrant[q.id]} role={role} onlyMine={onlyMine} onOpen={onOpenTile} cadence={cadence} />
            ))}
          </div>
        </Panel>
      ) : (
        <>
          <Panel data-scene="business-zone" className="p-4 lg:p-5">
            <Eyebrow tone="navy">Quadrant grid · 1–2 of 4</Eyebrow>
            <div className="mt-3 grid grid-cols-1 gap-6 lg:grid-cols-2">
              {QUADRANTS.slice(0, 2).map((q) => (
                <Quadrant key={q.id} q={q} tiles={card.byQuadrant[q.id]} role={role} onlyMine={onlyMine} onOpen={onOpenTile} cadence={cadence} />
              ))}
            </div>
          </Panel>
          <SceneBand scene={S('industrial')} />
          <Panel data-scene="industrial" className="p-4 lg:p-5">
            <Eyebrow tone="navy">Quadrant grid · 3 of 4</Eyebrow>
            <div className="mt-3">
              <Quadrant q={QUADRANTS[2]} tiles={card.byQuadrant.financial} role={role} onlyMine={onlyMine} onOpen={onOpenTile} cadence={cadence} />
            </div>
          </Panel>
          <SceneBand scene={S('academic')} />
          <Panel data-scene="academic" className="p-4 lg:p-5">
            <Eyebrow tone="navy">Quadrant grid · 4 of 4</Eyebrow>
            <div className="mt-3">
              <Quadrant q={QUADRANTS[3]} tiles={card.byQuadrant.learning} role={role} onlyMine={onlyMine} onOpen={onOpenTile} cadence={cadence} />
            </div>
          </Panel>
        </>
      )}

      {!slide && <SceneBand scene={S('mountains')} />}
      {slide && <div className="h-3" />}

      {/* ---------------------------------------------------------- Benchmark */}
      <Panel data-scene="mountains" className="p-4 lg:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <Eyebrow tone="navy">Benchmark</Eyebrow>
            <p className="text-sm font-bold text-stone-900">Brand Equity score /100 and Google rating /5, per zone</p>
          </div>
          {!slide && (
            <Segmented
              size="sm"
              value={benchMode}
              onChange={onBenchMode}
              options={[
                { value: '3d', label: '🧊 3D' },
                { value: '2d', label: '📊 2D' },
              ]}
            />
          )}
        </div>
        <div className="mt-3">
          {!slide && benchMode === '3d' ? (
            <>
              <Benchmark3D zones={peers} target={BENCHMARK.target} className="h-80 lg:h-96" />
              <ModelCaption left="Dashed plane = target 70 · hatched = illustrative" right="Drag to orbit" />
            </>
          ) : (
            <Benchmark2D zones={peers} target={BENCHMARK.target} />
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-stone-500">
            <strong className="text-stone-700">Peer values are illustrative</strong> (hatched) — replace with GIP III evidence. RAKEZ = Sep 2026 baseline.
          </p>
          <button className={btn.secondary} onClick={onEditPeers}>
            ✏️ Edit peer values (demo)
          </button>
        </div>
      </Panel>

      <div className="h-3" />

      {/* ---------------------------------------------------------- Footer */}
      <Panel as="footer" className="p-4 text-xs text-stone-500">
        <Eyebrow tone="muted">Data as-of per source</Eyebrow>
        <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {asOf.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 rounded-xl bg-stone-100/80 px-3 py-1.5">
              <span className="truncate font-semibold text-stone-700">
                <span aria-hidden="true">{s.icon}</span> {s.short}
              </span>
              <span className={`flex-none font-bold ${s.live ? 'text-emerald-700' : 'text-stone-400'}`}>{s.live ? `✓ ${BRAND.period}` : '— not yet sourced'}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 leading-relaxed">
          <strong className="text-stone-700">Indicative.</strong> Baselines are from the GIP III evidence (Sep 2026); targets are the 18-month horizon. {BRAND.guardrail}
        </p>
        <p className="mt-1.5 leading-relaxed">
          {scenes.every((s) => !s.isPhoto)
            ? 'Imagery: generated skyline plates (illustrations, one per section). Licensed photographs dropped into src/assets/photos replace them and are credited here.'
            : `Photographs: ${scenes.filter((s) => s.isPhoto).map((s) => sceneCaption(s)).join(' · ')}.`}
        </p>
      </Panel>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tile detail — bottom sheet. Definition, source, owner, thresholds, and a
// demo entry control that is locked until the tile's data source is live.
// ---------------------------------------------------------------------------

function CountPicker({ max, value, onChange, label }) {
  return (
    <div>
      <span className="text-xs font-extrabold uppercase tracking-wide text-stone-400">{label}</span>
      <div className={`mt-1.5 grid gap-2 ${max >= 5 ? 'grid-cols-6' : 'grid-cols-5'}`}>
        {Array.from({ length: max + 1 }, (_, i) => (
          <button
            key={i}
            className={`rounded-xl border-[1.5px] py-2 text-sm font-bold transition active:scale-[0.97] ${
              value === i ? 'border-teal-600 bg-teal-50 text-teal-900' : 'border-stone-200 bg-white text-stone-700 hover:border-teal-500'
            }`}
            onClick={() => onChange(i)}
            aria-pressed={value === i}
          >
            {i}
          </button>
        ))}
      </div>
    </div>
  )
}

export function TileSheet({ tile, onClose, onEntry, onClear, onGoto }) {
  const src = sourceById(tile.sourceId)
  const inp = tile.input
  const initial = tile.value != null ? tile.value : inp.type === 'count' ? Math.ceil((inp.max || 1) / 2) : inp.type === 'number' ? 0 : Math.round(((inp.min + inp.max) / 2) / (inp.step || 1)) * (inp.step || 1)
  const [pending, setPending] = useState(initial)
  const [claimed, setClaimed] = useState(!!tile.claimed)
  useEffect(() => {
    setPending(initial)
    setClaimed(!!tile.claimed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tile.id])
  const preview = status(tile, pending, { claimed })
  const m = tile.status
  const pct = scalePct(tile, tile.value)
  const marker = tile.target.value != null ? scalePct(tile, tile.target.value) : null
  const shopFed = !!tile.derivedFrom

  return (
    <Modal title={null} onClose={onClose} sheet>
      <div className="flex items-start gap-3.5">
        <span className="text-4xl leading-none" aria-hidden="true">
          {tile.icon}
        </span>
        <div className="min-w-0">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-stone-400">
            {tile.id} · {QUADRANTS.find((q) => q.id === tile.quadrant)?.label || 'Hero row'}
          </span>
          <h3 className="text-xl font-extrabold tracking-tight text-stone-900">{tile.label}</h3>
          <p className="mt-0.5 text-[13px] text-stone-500">{tile.definition}</p>
        </div>
      </div>

      <div className={`mt-4 rounded-2xl p-4 ${m.bg}`}>
        <div className="flex items-end justify-between gap-3">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wide text-stone-500">{tile.isEntry ? 'Demo entry' : `Baseline ${BRAND.period}`}</span>
            <div className={`text-4xl font-extrabold tabular-nums leading-none ${m.fg}`}>{tile.display}</div>
            {tile.detail && <div className="mt-1 text-xs font-semibold text-stone-500">{tile.detail}</div>}
          </div>
          <div className="text-right">
            <span className="text-[10px] font-extrabold uppercase tracking-wide text-stone-500">Target</span>
            <div className="text-lg font-extrabold tabular-nums text-stone-800">{tile.target.display}</div>
          </div>
        </div>
        {tile.value != null && tile.rule.kind !== 'pending' && (
          <div className="mt-3">
            <ProgressBar pct={pct} tone={m.tone === 'green' ? 'good' : m.tone === 'amber' ? 'warn' : 'bad'} marker={marker} />
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusChip meta={m} detail={m.reason} />
          <span className="text-[11px] font-semibold text-stone-500">Rule: {tile.thresholds}</span>
        </div>
        {tile.signal && <p className="mt-2 text-[13px] text-stone-700">{tile.signal}</p>}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-[13px]">
        {[
          ['Source', tile.source],
          ['Owner', tile.owner],
          ['Frequency', tile.freq],
          ['Feeds', tile.quadrant === 'hero' ? 'Hero row' : QUADRANTS.find((q) => q.id === tile.quadrant)?.label],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-stone-100/80 px-3.5 py-2.5">
            <dt className="text-[10px] font-extrabold uppercase tracking-wide text-stone-400">{k}</dt>
            <dd className="font-semibold text-stone-800">{v}</dd>
          </div>
        ))}
      </dl>

      {tile.locked ? (
        <div className="mt-4 rounded-2xl bg-stone-100 px-4 py-3 text-[13px] text-stone-700">
          🔒 <strong>Source not live — set up “{src?.title}” first.</strong> Until then this tile shows its {tile.value == null ? 'dash' : 'baseline'}; the spec forbids placeholder numbers.
          <button className={`${btn.secondary} mt-3 w-full`} onClick={() => onGoto('plan', src?.id)}>
            🗺️ Open “{src?.short}” in the pilot plan →
          </button>
        </div>
      ) : shopFed ? (
        <div className="mt-4 rounded-2xl bg-teal-50 px-4 py-3 text-[13px] text-teal-900">
          🕵️ Derived from <strong>{tile.derivedFrom}</strong> — this tile is computed, not typed.
          <button className={`${btn.secondary} mt-3 w-full`} onClick={() => onGoto('shop')}>
            Log another shop call →
          </button>
        </div>
      ) : (
        <section className="mt-4 rounded-2xl border border-stone-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-extrabold text-stone-900">Enter a demo value</h4>
            <span className="text-[11px] font-semibold text-stone-400">🔓 {src?.short} is live</span>
          </div>
          {tile.rule.kind === 'claimed' && !tile.live && null}
          {tile.rule.kind === 'claimed' && (
            <label className="mt-3 flex items-center justify-between rounded-xl bg-stone-100/80 px-3.5 py-2.5 text-sm font-semibold">
              <span>Profile claimed</span>
              <input type="checkbox" className="h-4.5 w-4.5 accent-emerald-600" checked={claimed} onChange={(e) => setClaimed(e.target.checked)} />
            </label>
          )}
          <div className="mt-3">
            {inp.type === 'count' ? (
              <CountPicker max={inp.max} value={pending} onChange={setPending} label={inp.label} />
            ) : inp.type === 'number' ? (
              <label className="block">
                <span className="text-xs font-extrabold uppercase tracking-wide text-stone-400">{inp.label}</span>
                <input
                  type="number"
                  min={inp.min}
                  max={inp.max}
                  step={inp.step}
                  value={pending}
                  onChange={(e) => setPending(Math.max(inp.min, Math.min(inp.max, Number(e.target.value) || 0)))}
                  className="mt-1.5 w-full rounded-xl border-[1.5px] border-stone-200 px-3.5 py-2.5 text-sm tabular-nums focus:border-teal-600 focus:outline-none"
                />
              </label>
            ) : (
              <label className="block">
                <span className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wide text-stone-400">
                  {inp.label}
                  <span className="text-sm normal-case tracking-normal tabular-nums text-stone-900">{fmtValue(tile, pending)}</span>
                </span>
                <input
                  type="range"
                  min={inp.min}
                  max={inp.max}
                  step={inp.step}
                  value={pending}
                  onChange={(e) => setPending(Number(e.target.value))}
                  className="mt-2 w-full accent-teal-700"
                />
                <span className="flex justify-between text-[10px] font-semibold text-stone-400">
                  <span>{fmtValue(tile, inp.min)}</span>
                  <span>{fmtValue(tile, inp.max)}</span>
                </span>
              </label>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-stone-100/80 px-3.5 py-2.5 text-[13px]">
            <span className="font-semibold text-stone-600">Would show as</span>
            <StatusChip meta={preview} detail={preview.reason} />
          </div>
          <button className={`${btn.primary} mt-3`} onClick={() => onEntry(tile, pending, { claimed })}>
            ✓ Apply demo value
          </button>
          {tile.id === 'HERO_01' && (
            <button className={`${btn.outline} mt-2`} onClick={() => onGoto('rescoring')}>
              🧮 Re-score in the BE worksheet instead →
            </button>
          )}
          {tile.isEntry && (
            <button className={`${btn.ghost} mt-1 w-full`} onClick={() => onClear(tile)}>
              ↺ Reset to {BRAND.period} baseline
            </button>
          )}
          <p className="mt-2 text-center text-[11px] text-stone-400">Demo entry — in the Excel build this is one row in the Data tab (Period, KPI_ID, Value, Source_ref…).</p>
        </section>
      )}
    </Modal>
  )
}
