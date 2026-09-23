// ---------------------------------------------------------------------------
// Pure logic — no React. Everything derives from (answers, entries, live
// sources, shop log, BE scores). Status rules follow the spec's KPI dictionary.
// ---------------------------------------------------------------------------

import { KPIS, SOURCES, BE_DIMENSIONS, ROLE_META, CADENCE_META, QUADRANTS, SHOP_PROTOCOL } from './data.js'

export const STATUS_META = {
  red: { tone: 'red', label: 'Red', word: 'Failing today', icon: '⚑', hex: '#c2410c', fill: '#fef2ee', bg: 'bg-rag-red-bg', fg: 'text-rag-red-fg', ring: 'ring-rag-red-fg/30' },
  amber: { tone: 'amber', label: 'Amber', word: 'Not measured / below target', icon: '◐', hex: '#b45309', fill: '#fef7e6', bg: 'bg-rag-amber-bg', fg: 'text-rag-amber-fg', ring: 'ring-rag-amber-fg/30' },
  green: { tone: 'green', label: 'Green', word: 'On target', icon: '✓', hex: '#15803d', fill: '#ecfdf3', bg: 'bg-rag-green-bg', fg: 'text-rag-green-fg', ring: 'ring-rag-green-fg/30' },
}

const clamp01 = (x) => Math.max(0, Math.min(1, x))

export function fmtNumber(v, step = 1) {
  if (v == null || Number.isNaN(v)) return '—'
  const decimals = step < 1 ? String(step).split('.')[1].length : 0
  return Number(v).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: decimals })
}

/** Display string for a value on a KPI's scale. */
export function fmtValue(kpi, value) {
  if (value == null) return '—'
  const unit = kpi.scale.unit
  const step = kpi.input?.step ?? 1
  if (kpi.rule.kind === 'zero') return value === 0 ? 'Held' : `${value} cut${value === 1 ? '' : 's'}`
  if (kpi.rule.kind === 'sign') return value > 0 ? `+${value}` : String(value)
  if (unit === '%') return `${fmtNumber(value, step)}%`
  if (unit === '% vs prior qtr') return `${value > 0 ? '+' : ''}${fmtNumber(value, step)}%`
  if (unit === '★') return fmtNumber(value, 0.1)
  if (unit === 'AED') return `AED ${fmtNumber(value)}`
  if (unit.startsWith('/')) return `${fmtNumber(value, step)} ${unit}`
  return fmtNumber(value, step)
}

/** RAG status for a KPI at a value. Unmeasured is always amber (spec §3). */
/** Plain words for a status, so a first-time reader needs no legend. */
export function plainLabel(st, value) {
  if (st.tone === 'green') return 'On target'
  if (st.tone === 'red') return 'Failing today'
  return value == null ? 'Not measured yet' : 'Below target'
}

export function status(kpi, value, ctx = {}) {
  const r = kpi.rule
  const out = statusRaw(kpi, value, ctx)
  return { ...out, label: plainLabel(out, value), rag: STATUS_META[out.tone].label }
}

function statusRaw(kpi, value, ctx = {}) {
  const r = kpi.rule
  if (value == null) return { ...STATUS_META.amber, reason: 'Not yet measured' }
  switch (r.kind) {
    case 'higher':
      if (value < r.red) return { ...STATUS_META.red, reason: `Below ${fmtValue(kpi, r.red)}` }
      if (value < r.amber) return { ...STATUS_META.amber, reason: `Below target ${kpi.target.display}` }
      return { ...STATUS_META.green, reason: 'At target' }
    case 'zero':
      return value === 0 ? { ...STATUS_META.green, reason: 'No reactive cuts' } : { ...STATUS_META.red, reason: 'Reactive cut logged' }
    case 'sign':
      if (value < 0) return { ...STATUS_META.red, reason: 'Net negative' }
      if (value === 0) return { ...STATUS_META.amber, reason: 'Flat' }
      return { ...STATUS_META.green, reason: 'Net positive' }
    case 'nonneg':
      return value < 0 ? { ...STATUS_META.red, reason: 'Below prior quarter' } : { ...STATUS_META.green, reason: 'Held or grew' }
    case 'pending':
      return { ...STATUS_META.amber, reason: 'Thresholds set after 3 months of data' }
    case 'claimed':
      if (!ctx.claimed) return { ...STATUS_META.red, reason: 'Profile unclaimed' }
      if (value < r.green) return { ...STATUS_META.amber, reason: value < r.amber ? 'Claimed — rating below 3.5' : 'Claimed — rating below 3.8' }
      return { ...STATUS_META.green, reason: 'Claimed and ≥3.8' }
    default:
      return { ...STATUS_META.amber, reason: 'No rule' }
  }
}

/** Progress toward target as 0..1 — drives bars and 3D tower heights. */
export function attainment(kpi, value, ctx = {}) {
  if (value == null) return 0
  const { min } = kpi.scale
  const t = kpi.target.value
  switch (kpi.rule.kind) {
    case 'higher':
      return clamp01((value - min) / (t - min))
    case 'zero':
      return value === 0 ? 1 : Math.max(0.15, 1 - value / kpi.scale.max)
    case 'sign':
      return value > 0 ? 1 : value === 0 ? 0.45 : 0.2
    case 'nonneg':
      return value >= 0 ? 1 : 0.25
    case 'pending':
      return 0.45
    case 'claimed':
      return clamp01(value / kpi.target.value) * (ctx.claimed ? 1 : 0.6)
    default:
      return 0
  }
}

/** Position of a value on the KPI's own scale (0–100), for bars with markers. */
export function scalePct(kpi, value) {
  if (value == null) return 0
  const { min, max } = kpi.scale
  return clamp01((value - min) / (max - min)) * 100
}

// ------------------------------------------------------------- Mystery shop

/** Aggregate the logged mystery-shop calls into the three spec outputs. */
export function shopOutputs(shops) {
  const n = shops.length
  if (!n) return { n: 0, recRate: null, priceMatch: null, adherence: null, extrasAvg: null }
  const named = shops.filter((s) => s.namedFirst).length
  const matched = shops.filter((s) => s.priceMatched).length
  const elements = SHOP_PROTOCOL.scriptElements.length
  const used = shops.reduce((acc, s) => acc + Object.values(s.script || {}).filter(Boolean).length, 0)
  const extras = shops.reduce((acc, s) => acc + (s.extras || 0), 0)
  return {
    n,
    recRate: Math.round((named / n) * 100),
    priceMatch: Math.round((matched / n) * 100),
    adherence: Math.round((used / (n * elements)) * 100),
    extrasAvg: Math.round((extras / n) * 10) / 10,
  }
}

// ------------------------------------------------------------- Brand Equity

export function beComposite(scores) {
  const sum = BE_DIMENSIONS.reduce((acc, d) => acc + (scores[d.id] ?? 0) * d.weight, 0)
  return Math.round((sum / 5) * 100)
}

export function beBaselineScores() {
  return Object.fromEntries(BE_DIMENSIONS.map((d) => [d.id, d.baseline]))
}

// ------------------------------------------------------------- Scorecard

/**
 * Resolve every KPI into a tile model.
 * state = { entries: {id: {value, claimed?}}, sources: Set, shops: [] }
 * Entries override baselines; shop-derived outputs override entries for the
 * three KPIs the mystery shop feeds (spec §7).
 */
export function scorecard(state) {
  const { entries = {}, sources = new Set(), shops = [] } = state
  const shop = shopOutputs(shops)
  const derived = {}
  if (shop.n) {
    derived.CUST_01 = { value: shop.recRate, from: `${shop.n} logged shop call${shop.n === 1 ? '' : 's'}` }
    derived.CUST_02 = { value: shop.priceMatch, from: `${shop.n} logged shop call${shop.n === 1 ? '' : 's'}` }
    derived.LG_02 = { value: shop.adherence, from: `${shop.n} logged shop call${shop.n === 1 ? '' : 's'}` }
  }

  const tiles = KPIS.map((kpi) => {
    const d = derived[kpi.id]
    const e = entries[kpi.id]
    const value = d ? d.value : e && e.value !== undefined ? e.value : kpi.baseline.value
    const isEntry = !!d || (!!e && e.value !== undefined)
    const claimed = kpi.rule.kind === 'claimed' ? sources.has(kpi.sourceId) || !!e?.claimed : undefined
    const ctx = { claimed }
    const st = status(kpi, value, ctx)
    const display = isEntry ? fmtValue(kpi, value) : kpi.baseline.display
    const detail = isEntry ? (d ? d.from : 'demo entry') : kpi.baseline.detail || null
    const live = sources.has(kpi.sourceId)
    return {
      ...kpi,
      value,
      display,
      detail,
      claimed,
      isEntry,
      derivedFrom: d ? d.from : null,
      status: st,
      attainment: attainment(kpi, value, ctx),
      live,
      locked: !live,
    }
  })

  const byId = Object.fromEntries(tiles.map((t) => [t.id, t]))
  const hero = tiles.filter((t) => t.quadrant === 'hero')
  const byQuadrant = Object.fromEntries(QUADRANTS.map((q) => [q.id, tiles.filter((t) => t.quadrant === q.id)]))
  const counts = {
    red: tiles.filter((t) => t.status.tone === 'red').length,
    amber: tiles.filter((t) => t.status.tone === 'amber').length,
    green: tiles.filter((t) => t.status.tone === 'green').length,
    measured: tiles.filter((t) => t.value != null).length,
    total: tiles.length,
  }
  return { tiles, byId, hero, byQuadrant, counts, shop }
}

/** Does this role own the tile? Leadership owns everything. */
export function ownedBy(kpi, role) {
  const meta = ROLE_META[role]
  if (!meta || !meta.owners) return true
  return meta.owners.includes(kpi.owner)
}

export function matchesCadence(kpi, cadence) {
  const meta = CADENCE_META[cadence]
  if (!meta) return true
  return meta.match.includes(kpi.freq)
}

// ------------------------------------------------------------- Pilot plan
// Same lock/progress model as the template journey, over the data sources.

export function buildPlan(answers) {
  const role = answers?.role
  // Your own sources first, then the rest, keeping dependency order stable.
  const mine = SOURCES.filter((s) => role && ROLE_META[role]?.owners?.includes(s.owner))
  const rest = SOURCES.filter((s) => !mine.includes(s))
  const ordered = [...SOURCES.filter((s) => s.id === 'dictionary'), ...mine.filter((s) => s.id !== 'dictionary'), ...rest.filter((s) => s.id !== 'dictionary')]
  return ordered
}

/** 'done' | 'open' (unlocked, actionable) | 'locked' (prerequisites pending) */
export function stepState(step, completed) {
  if (completed.has(step.id)) return 'done'
  return step.deps.every((d) => completed.has(d)) ? 'open' : 'locked'
}

export function currentStep(steps, completed) {
  return steps.find((s) => stepState(s, completed) === 'open') || null
}

export function blockers(step, steps, completed) {
  return step.deps.filter((d) => !completed.has(d)).map((d) => steps.find((s) => s.id === d)?.short || d)
}

export function depNames(step, steps) {
  return step.deps.map((d) => steps.find((s) => s.id === d)?.short || d)
}

export function progress(steps, completed) {
  const done = steps.filter((s) => completed.has(s.id)).length
  const total = steps.length
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 }
}

export function sourceById(id) {
  return SOURCES.find((s) => s.id === id) || null
}

export function kpiById(id) {
  return KPIS.find((k) => k.id === id) || null
}
