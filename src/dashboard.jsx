import React, { useEffect, useMemo, useRef, useState } from 'react'
import { BRAND, QUADRANTS, ROLE_META, CADENCE_META, BENCHMARK, SOURCES } from './data.js'
import { STATUS_META, status, fmtValue, scalePct, ownedBy, matchesCadence, sourceById } from './engine.js'
import { Modal, ProgressBar, TickBar, StatusChip, Segmented, Eyebrow, Panel, Chapter, CountUp, ScrollRail, btn } from './ui.jsx'
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
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-black/30 px-2 py-0.5 font-extrabold ${m.fg} ${small ? 'text-[10px]' : 'text-[11px]'}`}>
      <span aria-hidden="true">{m.icon}</span> {m.label}
    </span>
  )
}

/** Counts numeric values up from zero; leaves words ('Held', 'No', dashes) static. */
function AnimatedValue({ tile, className }) {
  if (tile.value == null) return <span className={className}>{tile.display}</span>
  const f = fmtValue(tile, tile.value)
  const prefix = tile.display === `~${f}` ? '~' : tile.display === f ? '' : null
  if (prefix == null) return <span className={className}>{tile.display}</span>
  return <CountUp value={tile.value} format={(v) => `${prefix}${fmtValue(tile, Number(v.toFixed(tile.input?.step < 1 ? 1 : 0)))}`} className={className} />
}

function Tile({ tile, dim, mine, onOpen }) {
  const m = tile.status
  return (
    <button
      className={`relative flex min-h-[112px] w-full flex-col justify-between rounded-xl border p-3 text-left transition active:scale-[0.985] hover:border-gold/70 ${m.bg} ${
        dim ? 'opacity-40' : ''
      } ${mine ? 'border-gold/60 ring-2 ring-gold/20' : 'border-gold/15'}`}
      onClick={() => onOpen(tile.id)}
      aria-label={`${tile.label}: ${tile.display}, target ${tile.target.display}, ${m.label}${tile.locked ? ', source not yet live' : ''}`}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-extrabold uppercase leading-tight tracking-wide text-stone-400">{tile.short}</span>
        <span className="flex flex-none items-center gap-1">
          {tile.locked && (
            <span className="text-[10px]" title="Source not yet live" aria-hidden="true">
              🔒
            </span>
          )}
          {mine && <span className="rounded-full bg-gold text-ink px-1.5 text-[9px] font-extrabold">yours</span>}
        </span>
      </span>
      <span className="mt-1 flex items-baseline gap-1.5">
        <AnimatedValue tile={tile} className={`text-2xl font-light tabular-nums leading-none ${m.fg}`} />
        {tile.detail && <span className="truncate text-[10px] font-semibold text-stone-400">{tile.detail}</span>}
      </span>
      <span className="mt-2 flex items-center justify-between gap-1">
        <span className="truncate text-[10px] font-semibold text-stone-400">→ {tile.target.display}</span>
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
      className={`relative flex w-full flex-col rounded-xl border bg-panel p-3.5 text-left shadow-sm transition active:scale-[0.99] hover:border-gold/70 sm:p-5 ${
        focus ? 'border-[1.5px] border-gold shadow-lg shadow-gold/10' : 'border-gold/20'
      }`}
      onClick={() => onOpen(tile.id)}
      aria-label={`${tile.label}: ${tile.display}, target ${tile.target.display}, ${m.label}`}
    >
      {focus && <span className="absolute -top-3 left-4 rounded-full bg-gold text-ink px-2.5 py-0.5 text-[10px] font-extrabold">In focus</span>}
      <span className="text-[10px] font-extrabold uppercase leading-tight tracking-wide text-stone-400 sm:text-[11px]">
        <span aria-hidden="true">{tile.icon}</span> {tile.label}
      </span>
      <AnimatedValue tile={tile} className={`mt-2 block text-3xl font-light tabular-nums leading-none tracking-tight sm:text-5xl ${m.fg}`} />
      <span className="mt-1.5 text-[11px] font-semibold text-stone-400 sm:text-xs">
        target <strong className="text-stone-200">{tile.target.display}</strong>
        {tile.detail ? <span className="text-stone-400"> · {tile.detail}</span> : null}
      </span>
      <span className="mt-3 block">
        <TickBar pct={pct} tone={m.tone === 'green' ? 'good' : m.tone === 'amber' ? 'warn' : 'bad'} marker={marker} />
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
      <div className="flex items-start justify-end gap-2">
        <div className="flex flex-none flex-wrap items-end gap-1 text-[10px] font-extrabold">
          {reds > 0 && (
            <span className="rounded-full bg-rag-red-bg px-2 py-0.5 text-rag-red-fg">
              ⚑ {reds} failing
            </span>
          )}
          {unm > 0 && (
            <span className="rounded-full bg-rag-amber-bg px-2 py-0.5 text-rag-amber-fg">
              ◐ {unm} not measured yet
            </span>
          )}
        </div>
      </div>
      <div className="stagger mt-2 grid grid-cols-2 gap-2.5">
        {tiles.map((t, i) => {
          const mine = role && role !== 'leadership' && ownedBy(t, role)
          const cadenceHit = cadence && cadence !== 'monthly' && matchesCadence(t, cadence)
          const dim = onlyMine && role !== 'leadership' && !mine
          return (
            <div key={t.id} style={{ '--i': i }} className="flex">
              <Tile tile={t} dim={dim} mine={!!mine || !!cadenceHit} onOpen={onOpen} />
            </div>
          )
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
          <line x1="0" y1="0" x2="0" y2="6" stroke="#070503" strokeWidth="2" strokeOpacity="0.5" />
        </pattern>
      </defs>
      {[0, 25, 50, 75, 100].map((g) => (
        <g key={g}>
          <line x1={padL} x2={W - 6} y1={y(g)} y2={y(g)} stroke="rgba(212,167,106,0.18)" strokeWidth="1" />
          <text x={padL - 6} y={y(g) + 3} fontSize="8" textAnchor="end" fill="#a89c8c" fontWeight="700">
            {g}
          </text>
        </g>
      ))}
      <line x1={padL} x2={W - 6} y1={y(target)} y2={y(target)} stroke="#f2a37c" strokeWidth="1.5" strokeDasharray="5 4" />
      <text x={W - 6} y={y(target) - 4} fontSize="8" textAnchor="end" fill="#f2a37c" fontWeight="800">
        target {target}
      </text>
      {zones.map((z, i) => {
        const cx = padL + groupW * i + groupW / 2
        const isR = z.zone === 'RAKEZ'
        const beC = isR ? '#e0532e' : '#d4a76a'
        const gC = isR ? '#e0532e' : '#8b6b45'
        const gv = (z.google / 5) * 100
        return (
          <g key={z.zone}>
            <rect x={cx - barW - 2} y={y(z.be)} width={barW} height={y(0) - y(z.be)} rx="3" fill={beC} />
            {z.illustrative && <rect x={cx - barW - 2} y={y(z.be)} width={barW} height={y(0) - y(z.be)} rx="3" fill="url(#hatch)" />}
            <rect x={cx + 2} y={y(gv)} width={barW} height={y(0) - y(gv)} rx="3" fill={gC} opacity={isR ? 0.75 : 1} />
            {z.illustrative && <rect x={cx + 2} y={y(gv)} width={barW} height={y(0) - y(gv)} rx="3" fill="url(#hatch)" />}
            <text x={cx - barW / 2 - 2} y={y(z.be) - 3} fontSize="8" textAnchor="middle" fill="#ead2a8" fontWeight="800">
              {z.be}
            </text>
            <text x={cx + barW / 2 + 2} y={y(gv) - 3} fontSize="8" textAnchor="middle" fill="#ead2a8" fontWeight="800">
              {z.google.toFixed(1)}
            </text>
            <text x={cx} y={H - padB + 13} fontSize="9" textAnchor="middle" fill={isR ? '#c2410c' : '#0f1f33'} fontWeight="800">
              {z.zone}
            </text>
            {z.illustrative && (
              <text x={cx} y={H - padB + 23} fontSize="7" textAnchor="middle" fill="#a89c8c" fontWeight="600">
                illustrative
              </text>
            )}
          </g>
        )
      })}
      <g fontSize="8" fontWeight="700" fill="#a89c8c">
        <rect x={padL} y={H - 8} width="8" height="8" rx="2" fill="#d4a76a" />
        <text x={padL + 11} y={H - 1}>
          BE score /100
        </text>
        <rect x={padL + 76} y={H - 8} width="8" height="8" rx="2" fill="#8b6b45" />
        <text x={padL + 87} y={H - 1}>
          Google rating /5 (scaled)
        </text>
        <rect x={padL + 200} y={H - 8} width="8" height="8" rx="2" fill="#e0532e" />
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
      <p className="text-[13px] text-stone-400">
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
            <span className={`text-sm font-bold ${z.zone === 'RAKEZ' ? 'text-rag-red-fg' : 'text-stone-200'}`}>{z.zone}</span>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={z.be}
              onChange={(e) => upd(i, 'be', Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
              className="w-full rounded-xl border-[1.5px] border-gold/20 px-2.5 py-1.5 text-sm tabular-nums focus:border-gold focus:outline-none"
              aria-label={`${z.zone} Brand Equity score`}
            />
            <input
              type="number"
              min="1"
              max="5"
              step="0.1"
              value={z.google}
              onChange={(e) => upd(i, 'google', Math.max(1, Math.min(5, Number(e.target.value) || 1)))}
              className="w-full rounded-xl border-[1.5px] border-gold/20 px-2.5 py-1.5 text-sm tabular-nums focus:border-gold focus:outline-none"
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

const CHAPTERS = [
  { id: 'corniche', title: 'Overview' },
  { id: 'al-hamra', title: 'Three numbers' },
  { id: 'business-zone', title: 'Customer & selling' },
  { id: 'industrial', title: 'Money' },
  { id: 'academic', title: 'Learning' },
  { id: 'mountains', title: 'Benchmark & next' },
]

export function Dashboard({ profile, card, prog, view, onOpenTile, onGoto, peers, onEditPeers, benchMode, onBenchMode, scenes, onScene, activeScene, entriesCount, onResetEntries, personalised }) {
  const rootRef = useRef(null)
  useSceneObserver(rootRef, onScene, [view])
  const role = profile.answers?.role
  const cadence = profile.answers?.cadence
  const focus = profile.answers?.focus
  const roleMeta = ROLE_META[role]
  const cadMeta = CADENCE_META[cadence]
  const S = (id) => scenes.find((s) => s.id === id)
  const slide = view === 'slide'
  const dashes = card.counts.total - card.counts.measured
  const jump = (id) => rootRef.current?.querySelector(`[data-scene="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const asOf = useMemo(
    () => SOURCES.filter((s) => s.feeds.length).map((s) => ({ ...s, live: card.tiles.some((t) => t.sourceId === s.id && t.live) })),
    [card],
  )
  const Band = ({ id }) => (slide ? <div className="h-3" /> : <SceneBand scene={S(id)} />)

  return (
    <div ref={rootRef} className="anim-screen flex flex-col gap-0 px-3 pb-12 pt-3">
      {!slide && <ScrollRail chapters={CHAPTERS} active={activeScene} onJump={jump} />}

      {/* ---------------------------------------------------------- Overview */}
      <Panel data-scene="corniche" className="p-5 lg:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <Eyebrow tone="brand">RAKEZ · {BRAND.periodPill}</Eyebrow>
          <span className={`rounded-full px-3 py-1 text-[11px] font-extrabold ${entriesCount ? 'bg-amber-400/15 text-amber-200' : 'bg-white/[0.06] text-stone-400'}`}>
            {entriesCount ? `${entriesCount} demo ${entriesCount === 1 ? 'entry' : 'entries'} · ` : 'Static mock-up · '}
            {entriesCount ? (
              <button className="underline decoration-gold/50 underline-offset-2" onClick={onResetEntries}>
                reset
              </button>
            ) : (
              'no live data'
            )}
          </span>
        </div>
        <h2 className="mt-2 text-4xl font-light tracking-tight text-stone-50 lg:text-6xl">Acquisition & Brand Scorecard</h2>
        <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-stone-300 lg:text-lg">
          One page, once a month. It answers a single question: <strong className="font-semibold text-gold-light">is the acquisition strategy lifting RAKEZ's brand, or just buying registrations?</strong>
        </p>
        <div className="hairline mt-4" />

        <p className="mt-4 text-[13px] text-stone-400">
          Every tile shows today's number, the target, and one of three words. Tap any tile for the definition, the source and who owns it.
        </p>
        <div className="stagger mt-3 grid grid-cols-3 gap-2.5">
          {[
            { k: 'red', n: card.counts.red, word: 'failing today', glow: true },
            { k: 'amber', n: card.counts.amber, word: `not measured yet or below target` },
            { k: 'green', n: card.counts.green, word: 'on target' },
          ].map(({ k, n, word, glow }, i) => (
            <div key={k} style={{ '--i': i }} className={`rounded-xl border border-gold/10 px-3 py-3 ${STATUS_META[k].bg} ${glow && n ? 'glow-red' : ''}`}>
              <div className={`text-4xl font-light tabular-nums leading-none lg:text-5xl ${STATUS_META[k].fg}`}>
                <CountUp value={n} duration={900} />
              </div>
              <div className={`mt-1.5 text-[11px] font-bold leading-snug ${STATUS_META[k].fg}`}>
                <span aria-hidden="true">{STATUS_META[k].icon}</span> {word}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[12px] text-stone-500">
          {card.counts.measured} of {card.counts.total} KPIs have a number today. The other {dashes} show a dash until their data source is switched on — never a made-up figure.
        </p>
        {personalised && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-stone-400">
            <span className="rounded-full bg-gold/10 px-2.5 py-1 font-bold text-gold-light">
              <span aria-hidden="true">{roleMeta?.icon}</span> Viewing as {roleMeta?.label}
              {cadMeta ? ` · ${cadMeta.label.toLowerCase()}` : ''}
            </span>
            <span>Your tiles carry a gold “yours” mark.</span>
            <button className="font-semibold text-gold underline decoration-gold/50 underline-offset-2" onClick={() => onGoto('quiz')}>
              Change
            </button>
          </div>
        )}
      </Panel>

      <Band id="al-hamra" />

      {/* ---------------------------------------------------------- Three numbers */}
      <Panel data-scene="al-hamra" className="p-4 lg:p-6">
        <Chapter n={1} title="The three numbers that matter" says="If only these three move, the strategy is working. Red tick = target." />
        <div className="flip grid grid-cols-3 gap-2.5 lg:gap-4">
          {card.hero.map((t, i) => (
            <div key={t.id} style={{ '--i': i }} className="flex">
              <HeroCard tile={t} focus={focus === t.id} onOpen={onOpenTile} />
            </div>
          ))}
        </div>
        {!slide && (
          <div className="mt-6">
            <Chapter n="1b" title="The same 19 KPIs as a skyline" says="Each tower is one KPI. Taller means closer to target; red means failing today; the outline is the target. Drag to look around, tap a tower to open it." />
            <Skyline3D hero={card.hero} byQuadrant={card.byQuadrant} onSelect={onOpenTile} className="h-80 lg:h-96" />
          </div>
        )}
      </Panel>

      <Band id="business-zone" />

      {/* ---------------------------------------------------------- Quadrants */}
      {slide ? (
        <Panel data-scene="business-zone" className="p-4 lg:p-6">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {QUADRANTS.map((q, i) => (
              <div key={q.id}>
                <Chapter n={i + 2} title={q.label} says={q.blurb} />
                <Quadrant q={q} tiles={card.byQuadrant[q.id]} role={role} onlyMine={false} onOpen={onOpenTile} cadence={cadence} />
              </div>
            ))}
          </div>
        </Panel>
      ) : (
        <>
          <Panel data-scene="business-zone" className="p-4 lg:p-6">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <div>
                <Chapter n={2} title="Customer" says="Do prospects and partners choose RAKEZ on value, or only when prompted?" />
                <Quadrant q={QUADRANTS[0]} tiles={card.byQuadrant.customer} role={role} onlyMine={false} onOpen={onOpenTile} cadence={cadence} />
              </div>
              <div>
                <Chapter n={3} title="How we sell" says="Is the first quote honest, complete and fast?" />
                <Quadrant q={QUADRANTS[1]} tiles={card.byQuadrant.process} role={role} onlyMine={false} onOpen={onOpenTile} cadence={cadence} />
              </div>
            </div>
          </Panel>
          <Band id="industrial" />
          <Panel data-scene="industrial" className="p-4 lg:p-6">
            <Chapter n={4} title="Money" says="Is growth paid for sustainably? Three of these wait on the finance close." />
            <Quadrant q={QUADRANTS[2]} tiles={card.byQuadrant.financial} role={role} onlyMine={false} onOpen={onOpenTile} cadence={cadence} />
          </Panel>
          <Band id="academic" />
          <Panel data-scene="academic" className="p-4 lg:p-6">
            <Chapter n={5} title="Learning & growth" says="Are people, partners and content getting better every quarter?" />
            <Quadrant q={QUADRANTS[3]} tiles={card.byQuadrant.learning} role={role} onlyMine={false} onOpen={onOpenTile} cadence={cadence} />
          </Panel>
        </>
      )}

      <Band id="mountains" />

      {/* ---------------------------------------------------------- Benchmark */}
      <Panel data-scene="mountains" className="p-4 lg:p-6">
        <Chapter
          n={6}
          title="How RAKEZ compares"
          says="Brand Equity score out of 100 and Google rating out of 5, per free zone. RAKEZ is red; the dashed line is the 70 target."
          right={
            !slide && (
              <Segmented
                size="sm"
                value={benchMode}
                onChange={onBenchMode}
                options={[
                  { value: '3d', label: '3D' },
                  { value: '2d', label: '2D' },
                ]}
              />
            )
          }
        />
        {!slide && benchMode === '3d' ? (
          <>
            <Benchmark3D zones={peers} target={BENCHMARK.target} className="h-80 lg:h-96" />
            <ModelCaption left="Dashed plane = target 70 · faded bars = illustrative" right="Drag to orbit" />
          </>
        ) : (
          <Benchmark2D zones={peers} target={BENCHMARK.target} />
        )}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-stone-400">
            <strong className="text-stone-300">Peer values are illustrative</strong> until the GIP III evidence is entered. RAKEZ is the real Sep 2026 baseline.
          </p>
          <button className={btn.secondary} onClick={onEditPeers}>
            ✏️ Enter peer values
          </button>
        </div>
      </Panel>

      <div className="h-3" />

      {/* ---------------------------------------------------------- Next */}
      {!slide && (
        <Panel className="p-4 lg:p-6">
          <Chapter n={7} title="What happens next" says={`${dashes} tiles still show a dash because their data source is not switched on. The pilot plan wires them one by one; ${prog.done} of ${prog.total} sources are live.`} />
          <div className="stagger grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <button style={{ '--i': 0 }} className="rounded-xl border border-gold/40 bg-gold/10 p-4 text-left transition active:scale-[0.99] hover:bg-gold/15" onClick={() => onGoto('plan')}>
              <span className="block text-2xl" aria-hidden="true">🗺️</span>
              <span className="mt-1 block text-[15px] font-bold text-gold-light">Switch on the data sources</span>
              <span className="block text-xs text-stone-400">Pilot plan · {prog.total - prog.done} to go</span>
            </button>
            <button style={{ '--i': 1 }} className="rounded-xl border border-gold/20 p-4 text-left transition active:scale-[0.99] hover:bg-white/[0.04]" onClick={() => onGoto('rescoring')}>
              <span className="block text-2xl" aria-hidden="true">🧮</span>
              <span className="mt-1 block text-[15px] font-bold text-stone-100">Re-score Brand Equity</span>
              <span className="block text-xs text-stone-400">Five dimensions, live composite</span>
            </button>
            <button style={{ '--i': 2 }} className="rounded-xl border border-gold/20 p-4 text-left transition active:scale-[0.99] hover:bg-white/[0.04]" onClick={() => onGoto('shop')}>
              <span className="block text-2xl" aria-hidden="true">🕵️</span>
              <span className="mt-1 block text-[15px] font-bold text-stone-100">Log a mystery-shop call</span>
              <span className="block text-xs text-stone-400">Feeds three Customer tiles</span>
            </button>
          </div>
        </Panel>
      )}

      <div className="h-3" />

      {/* ---------------------------------------------------------- Footer */}
      <Panel as="footer" className="p-4 text-xs text-stone-400">
        <Eyebrow tone="muted">Where each number comes from</Eyebrow>
        <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {asOf.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.04] px-3 py-1.5">
              <span className="truncate font-semibold text-stone-300">
                <span aria-hidden="true">{s.icon}</span> {s.short}
              </span>
              <span className={`flex-none font-bold ${s.live ? 'text-emerald-300' : 'text-stone-500'}`}>{s.live ? `✓ ${BRAND.period}` : '— not yet'}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 leading-relaxed">
          <strong className="text-stone-300">Indicative.</strong> Baselines are from the GIP III evidence (Sep 2026); targets are the 18-month horizon. {BRAND.guardrail}
        </p>
        <p className="mt-1.5 leading-relaxed">
          {scenes.every((s) => !s.isPhoto)
            ? 'Imagery: generated skyline plates (illustrations, one per section).'
            : `Photograph: ${scenes.find((s) => s.isPhoto).title} — ${scenes.find((s) => s.isPhoto).credit}; each section shows a different crop.`}
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
              value === i ? 'border-gold bg-gold/10 text-gold-light' : 'border-gold/20 bg-panel text-stone-500 hover:border-gold/70'
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
          <h3 className="text-xl font-extrabold tracking-tight text-stone-100">{tile.label}</h3>
          <p className="mt-0.5 text-[13px] text-stone-400">{tile.definition}</p>
        </div>
      </div>

      <div className={`mt-4 rounded-2xl p-4 ${m.bg}`}>
        <div className="flex items-end justify-between gap-3">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wide text-stone-400">{tile.isEntry ? 'Demo entry' : `Baseline ${BRAND.period}`}</span>
            <div className={`text-4xl font-light tabular-nums leading-none ${m.fg}`}>{tile.display}</div>
            {tile.detail && <div className="mt-1 text-xs font-semibold text-stone-400">{tile.detail}</div>}
          </div>
          <div className="text-right">
            <span className="text-[10px] font-extrabold uppercase tracking-wide text-stone-400">Target</span>
            <div className="text-lg font-extrabold tabular-nums text-stone-200">{tile.target.display}</div>
          </div>
        </div>
        {tile.value != null && tile.rule.kind !== 'pending' && (
          <div className="mt-3">
            <ProgressBar pct={pct} tone={m.tone === 'green' ? 'good' : m.tone === 'amber' ? 'warn' : 'bad'} marker={marker} />
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusChip meta={m} detail={m.reason} />
          <span className="text-[11px] font-semibold text-stone-400">{tile.status.rag} · rule: {tile.thresholds}</span>
        </div>
        {tile.signal && <p className="mt-2 text-[13px] text-stone-500">{tile.signal}</p>}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-[13px]">
        {[
          ['Source', tile.source],
          ['Owner', tile.owner],
          ['Frequency', tile.freq],
          ['Feeds', tile.quadrant === 'hero' ? 'Hero row' : QUADRANTS.find((q) => q.id === tile.quadrant)?.label],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-white/[0.04] px-3.5 py-2.5">
            <dt className="text-[10px] font-extrabold uppercase tracking-wide text-stone-400">{k}</dt>
            <dd className="font-semibold text-stone-200">{v}</dd>
          </div>
        ))}
      </dl>

      {tile.locked ? (
        <div className="mt-4 rounded-2xl bg-white/[0.06] px-4 py-3 text-[13px] text-stone-500">
          🔒 <strong>Source not live — set up “{src?.title}” first.</strong> Until then this tile shows its {tile.value == null ? 'dash' : 'baseline'}; the spec forbids placeholder numbers.
          <button className={`${btn.secondary} mt-3 w-full`} onClick={() => onGoto('plan', src?.id)}>
            🗺️ Open “{src?.short}” in the pilot plan →
          </button>
        </div>
      ) : shopFed ? (
        <div className="mt-4 rounded-2xl bg-gold/10 px-4 py-3 text-[13px] text-gold-light">
          🕵️ Derived from <strong>{tile.derivedFrom}</strong> — this tile is computed, not typed.
          <button className={`${btn.secondary} mt-3 w-full`} onClick={() => onGoto('shop')}>
            Log another shop call →
          </button>
        </div>
      ) : (
        <section className="mt-4 rounded-2xl border border-gold/20 bg-panel p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-extrabold text-stone-100">Enter a demo value</h4>
            <span className="text-[11px] font-semibold text-stone-400">🔓 {src?.short} is live</span>
          </div>
          {tile.rule.kind === 'claimed' && !tile.live && null}
          {tile.rule.kind === 'claimed' && (
            <label className="mt-3 flex items-center justify-between rounded-xl bg-white/[0.04] px-3.5 py-2.5 text-sm font-semibold">
              <span>Profile claimed</span>
              <input type="checkbox" className="h-4.5 w-4.5 accent-[#7fd39a]" checked={claimed} onChange={(e) => setClaimed(e.target.checked)} />
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
                  className="mt-1.5 w-full rounded-xl border-[1.5px] border-gold/20 px-3.5 py-2.5 text-sm tabular-nums focus:border-gold focus:outline-none"
                />
              </label>
            ) : (
              <label className="block">
                <span className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wide text-stone-400">
                  {inp.label}
                  <span className="text-sm normal-case tracking-normal tabular-nums text-stone-100">{fmtValue(tile, pending)}</span>
                </span>
                <input
                  type="range"
                  min={inp.min}
                  max={inp.max}
                  step={inp.step}
                  value={pending}
                  onChange={(e) => setPending(Number(e.target.value))}
                  className="mt-2 w-full accent-[#d4a76a]"
                />
                <span className="flex justify-between text-[10px] font-semibold text-stone-400">
                  <span>{fmtValue(tile, inp.min)}</span>
                  <span>{fmtValue(tile, inp.max)}</span>
                </span>
              </label>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-white/[0.04] px-3.5 py-2.5 text-[13px]">
            <span className="font-semibold text-stone-400">Would show as</span>
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
