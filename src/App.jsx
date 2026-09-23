import React, { useEffect, useMemo, useRef, useState } from 'react'
import { BRAND, PERSONA, BENCHMARK } from './data.js'
import { scorecard, buildPlan, progress, stepState, beBaselineScores, shopOutputs, status, fmtValue, sourceById } from './engine.js'
import { Toast } from './ui.jsx'
import { Welcome, Quiz, Generating } from './flow.jsx'
import { Dashboard, TileSheet, PeerModal } from './dashboard.jsx'
import { Plan, StepSheet } from './plan.jsx'
import { Dictionary, Rescoring, Shop, Build } from './tools.jsx'
import { ScrollBackdrop, usePhotos, useSceneState, SceneChip } from './scenes.jsx'

// ---------------------------------------------------------------------------
// Screens: welcome → quiz → generating → dashboard (⇄ tile sheet)
//          dashboard → plan / dictionary / rescoring / shop / build
// Back navigation works everywhere; nothing dead-ends.
// ---------------------------------------------------------------------------

const SCREEN_SCENE = { welcome: 'corniche', quiz: 'al-hamra', generating: 'al-hamra', plan: 'business-zone', dictionary: 'academic', rescoring: 'mountains', shop: 'industrial', build: 'corniche' }

export default function App() {
  const [screen, setScreen] = useState('welcome')

  // Pre-loaded persona so the demo looks alive on first open.
  const [profile, setProfile] = useState({ name: PERSONA.name, bio: PERSONA.bio, answers: { ...PERSONA.answers } })
  const [sources, setSources] = useState(new Set(PERSONA.done))
  const [entries, setEntries] = useState({}) // kpiId -> { value, claimed? }
  const [shops, setShops] = useState([])
  const [beScores, setBeScores] = useState(beBaselineScores())
  const [peers, setPeers] = useState(BENCHMARK.zones)
  const [checked, setChecked] = useState({}) // stepId -> { itemIndex: true }
  const [activeStepId, setActiveStepId] = useState(null)
  const [activeTileId, setActiveTileId] = useState(null)
  const [peerEdit, setPeerEdit] = useState(false)
  const [view, setView] = useState('interactive')
  const [benchMode, setBenchMode] = useState('3d')
  const [onlyMine, setOnlyMine] = useState(false)
  const [buildChoice, setBuildChoice] = useState(null)
  const [quizReturn, setQuizReturn] = useState('dashboard')

  // --- Scenes: fixed backdrop of building imagery that follows the scroll.
  const scenes = usePhotos()
  const { active: sceneId, setActive: setScene, scene } = useSceneState(scenes, 'corniche')
  useEffect(() => {
    if (SCREEN_SCENE[screen]) setScene(SCREEN_SCENE[screen])
  }, [screen, setScene])

  // --- Toast: keyed by timestamp so a repeated message re-animates.
  const [toast, setToast] = useState(null)
  const timer = useRef(null)
  const showToast = (msg) => {
    clearTimeout(timer.current)
    setToast({ msg, key: Date.now() })
    timer.current = setTimeout(() => setToast(null), 2800)
  }
  useEffect(() => () => clearTimeout(timer.current), [])

  // --- Menu
  const [menuOpen, setMenuOpen] = useState(false)
  const go = (s) => {
    setMenuOpen(false)
    setActiveTileId(null)
    setActiveStepId(null)
    setScreen(s)
    window.scrollTo({ top: 0 })
  }
  const startQuiz = (from) => {
    setQuizReturn(from)
    go('quiz')
  }

  // --- Derived
  const card = useMemo(() => scorecard({ entries, sources, shops }), [entries, sources, shops])
  const steps = useMemo(() => buildPlan(profile.answers), [profile])
  const prog = progress(steps, sources)
  const activeStep = steps.find((s) => s.id === activeStepId) || null
  const activeTile = card.byId[activeTileId] || null
  const outputs = useMemo(() => shopOutputs(shops), [shops])
  const entriesCount = Object.keys(entries).length + (shops.length ? 3 : 0)

  // ------------------------------------------------------------- Actions

  // Apply the answers immediately — the generating screen is purely visual.
  const finishQuiz = (answers) => {
    setProfile({ name: null, bio: null, answers })
    setEntries({})
    setShops([])
    setBeScores(beBaselineScores())
    setOnlyMine(answers.role !== 'leadership')
    setActiveTileId(null)
    setScreen('generating')
  }

  const viewReady = () => {
    setScreen('dashboard')
    showToast('Your scorecard view is ready ✨')
  }

  const applyEntry = (tile, value, extra = {}) => {
    const next = { ...entries, [tile.id]: { value, claimed: extra.claimed } }
    setEntries(next)
    setActiveTileId(null)
    const st = status(tile, value, { claimed: extra.claimed || sources.has(tile.sourceId) })
    showToast(`${tile.short}: ${fmtValue(tile, value)} → ${st.icon} ${st.label}`)
  }

  const clearEntry = (tile) => {
    const next = { ...entries }
    delete next[tile.id]
    setEntries(next)
    setActiveTileId(null)
    showToast(`${tile.short} back to the ${BRAND.period} baseline`)
  }

  const resetEntries = () => {
    setEntries({})
    setShops([])
    setBeScores(beBaselineScores())
    showToast(`Scenario cleared — ${BRAND.periodPill} restored`)
  }

  const markLive = (step) => {
    const next = new Set(sources)
    next.add(step.id)
    setSources(next)
    setActiveStepId(null)
    const freed = steps.filter((s) => s.deps.includes(step.id) && stepState(s, next) === 'open').map((s) => s.short)
    const fed = step.feeds.map((id) => card.byId[id]?.short).filter(Boolean)
    if (step.id === 'trustpilot') showToast('🎉 Trustpilot claimed — profile tile moves ⚑ Red → ◐ Amber')
    else if (freed.length) showToast(`🎉 ${step.short} live — ${freed.join(' & ')} unlocked`)
    else if (fed.length) showToast(`🎉 ${step.short} live — ${fed.join(', ')} now accept${fed.length === 1 ? 's' : ''} entries`)
    else showToast(`🎉 ${step.short} live`)
  }

  const markNotLive = (step) => {
    const next = new Set(sources)
    next.delete(step.id)
    setSources(next)
    showToast(`${step.short} marked not live — its tiles lock again`)
  }

  const addShop = (entry) => {
    const nextShops = [entry, ...shops]
    setShops(nextShops)
    if (!sources.has('mystery-shop')) {
      const next = new Set(sources)
      next.add('mystery-shop')
      setSources(next)
    }
    const o = shopOutputs(nextShops)
    showToast(`🕵️ Logged ${entry.partner} — CSP recommends RAKEZ now ${o.recRate}% of ${o.n}`)
  }

  const clearShops = () => {
    setShops([])
    showToast('Shop log cleared — tiles back to baseline')
  }

  const applyBe = (composite) => {
    setEntries({ ...entries, HERO_01: { value: composite } })
    const st = status(card.byId.HERO_01, composite)
    showToast(`🏛️ BE score ${composite} applied → ${st.icon} ${st.label}`)
    go('dashboard')
  }

  const savePeers = (rows) => {
    setPeers(rows)
    setPeerEdit(false)
    showToast('Peer values updated (demo) — chart redrawn')
  }

  const chooseBuild = (o) => {
    setBuildChoice(o.id)
    showToast(`✓ Option ${o.id} selected — ${o.role}`)
  }

  /** Cross-screen jump used by sheets: open a tile / step on another screen. */
  const goto = (target, id) => {
    setActiveTileId(null)
    setActiveStepId(null)
    setMenuOpen(false)
    setScreen(target)
    window.scrollTo({ top: 0 })
    if (target === 'plan' && id) setTimeout(() => setActiveStepId(id), 60)
    if (target === 'dashboard' && id) setTimeout(() => setActiveTileId(id), 60)
  }

  // ------------------------------------------------------------- Navigation

  const BACK = { dashboard: 'welcome', plan: 'dashboard', dictionary: 'dashboard', rescoring: 'dashboard', shop: 'dashboard', build: 'dashboard' }
  const canBack = screen in BACK && screen !== 'quiz'
  const goBack = () => {
    setMenuOpen(false)
    setActiveTileId(null)
    setActiveStepId(null)
    setScreen(BACK[screen] || 'welcome')
    window.scrollTo({ top: 0 })
  }

  const showHeader = screen !== 'welcome'
  const showMenu = ['dashboard', 'plan', 'dictionary', 'rescoring', 'shop', 'build'].includes(screen)
  const MENU = [
    { label: '📊 Scorecard', act: () => go('dashboard') },
    { label: '🗺️ Pilot plan', act: () => go('plan') },
    { label: '📖 KPI dictionary', act: () => go('dictionary') },
    { label: '🧮 BE re-scoring', act: () => go('rescoring') },
    { label: '🕵️ Mystery-shop log', act: () => go('shop') },
    { label: '🧱 Build options', act: () => go('build') },
    { label: '🔄 Retake questionnaire', act: () => startQuiz('dashboard') },
    { label: '🏠 Welcome screen', act: () => go('welcome') },
  ]

  const tileSheetScreens = ['dashboard', 'dictionary', 'shop', 'plan']

  return (
    <div className="relative min-h-screen">
      <ScrollBackdrop scenes={scenes} active={sceneId} />
      <div className="relative z-10 flex min-h-screen justify-center">
        <div className="relative min-h-screen w-full max-w-[420px] border-x border-white/10 lg:max-w-[1080px]">
          {showHeader && (
            <header className="sticky top-0 z-40 flex items-center justify-between rounded-b-2xl border-b border-gold/20 bg-ink/85 px-4 py-3 backdrop-blur">
              {menuOpen && (
                <nav className="anim-pop absolute right-3 top-full z-50 mt-1 flex w-64 flex-col overflow-hidden rounded-2xl border border-gold/20 bg-panel py-1.5 shadow-2xl">
                  {MENU.map((m) => (
                    <button key={m.label} className="px-4 py-2.5 text-left text-sm font-semibold text-stone-500 hover:bg-gold/10" onClick={m.act}>
                      {m.label}
                    </button>
                  ))}
                </nav>
              )}
              {canBack ? (
                <button className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/20 bg-panel text-stone-400 transition hover:text-gold" onClick={goBack} aria-label="Back">
                  ←
                </button>
              ) : (
                <span className="w-9" />
              )}
              <button className="flex min-w-0 items-baseline gap-2" onClick={() => go('welcome')} aria-label={`${BRAND.name} home`}>
                <span className="rounded-lg bg-gold px-2 py-0.5 text-sm font-bold text-ink">{BRAND.accent}</span>
                <span className="truncate text-lg font-extrabold tracking-tight text-stone-100">Scorecard</span>
                <span className="hidden lg:inline">
                  <SceneChip scene={scene} />
                </span>
              </button>
              {showMenu ? (
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/20 bg-panel text-stone-400 transition hover:text-gold"
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-label="Menu"
                  aria-expanded={menuOpen}
                >
                  ☰
                </button>
              ) : (
                <span className="w-9" />
              )}
            </header>
          )}

          {menuOpen && <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />}

          {screen === 'welcome' && <Welcome scene={scene} onStart={() => go('dashboard')} onFresh={() => startQuiz('welcome')} />}
          {screen === 'quiz' && <Quiz initial={profile.answers} onDone={finishQuiz} onBackOut={() => setScreen(quizReturn)} />}
          {screen === 'generating' && <Generating onReady={viewReady} />}
          {screen === 'dashboard' && (
            <Dashboard
              profile={profile}
              card={card}
              prog={prog}
              view={view}
              onView={(v) => {
                setView(v)
                showToast(v === 'slide' ? '🖼️ Slide view — 3 hero, 4×4 tiles, 1 chart, nothing else' : '🧊 Interactive view — 3D skyline and scenes back on')
              }}
              onlyMine={onlyMine}
              onOnlyMine={(v) => {
                setOnlyMine(v)
                showToast(v ? 'Dimming tiles you don’t own' : 'Showing every tile')
              }}
              onOpenTile={setActiveTileId}
              onRestart={() => startQuiz('dashboard')}
              onGoto={goto}
              peers={peers}
              onEditPeers={() => setPeerEdit(true)}
              benchMode={benchMode}
              onBenchMode={setBenchMode}
              scenes={scenes}
              onScene={setScene}
              entriesCount={entriesCount}
              onResetEntries={resetEntries}
            />
          )}
          {screen === 'plan' && <Plan profile={profile} steps={steps} completed={sources} prog={prog} card={card} onOpenStep={setActiveStepId} onGoto={goto} />}
          {screen === 'dictionary' && <Dictionary card={card} completed={sources} onOpenTile={setActiveTileId} />}
          {screen === 'rescoring' && (
            <Rescoring
              scores={beScores}
              onScore={(dim, n) => setBeScores((s) => ({ ...s, [dim]: n }))}
              onApply={applyBe}
              onReset={() => {
                setBeScores(beBaselineScores())
                showToast('Worksheet back to the baseline scoring (48)')
              }}
              currentBE={card.byId.HERO_01.value}
            />
          )}
          {screen === 'shop' && <Shop shops={shops} outputs={outputs} card={card} onAdd={addShop} onClear={clearShops} onOpenTile={setActiveTileId} />}
          {screen === 'build' && <Build chosen={buildChoice} onChoose={chooseBuild} />}

          {activeStep && screen === 'plan' && (
            <StepSheet
              step={activeStep}
              steps={steps}
              completed={sources}
              card={card}
              checked={checked[activeStep.id] || {}}
              onToggle={(i) =>
                setChecked((c) => ({
                  ...c,
                  [activeStep.id]: { ...(c[activeStep.id] || {}), [i]: !(c[activeStep.id] || {})[i] },
                }))
              }
              onComplete={() => markLive(activeStep)}
              onUndo={() => markNotLive(activeStep)}
              onClose={() => setActiveStepId(null)}
              onOpenTile={(id) => {
                setActiveStepId(null)
                setActiveTileId(id)
              }}
            />
          )}

          {activeTile && tileSheetScreens.includes(screen) && (
            <TileSheet tile={activeTile} onClose={() => setActiveTileId(null)} onEntry={applyEntry} onClear={clearEntry} onGoto={goto} />
          )}

          {peerEdit && screen === 'dashboard' && <PeerModal zones={peers} onSave={savePeers} onClose={() => setPeerEdit(false)} />}

          <Toast toast={toast} />
        </div>
      </div>
    </div>
  )
}
