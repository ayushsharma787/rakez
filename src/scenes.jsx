import React, { useEffect, useMemo, useRef, useState } from 'react'
import { SCENES } from './data.js'

// ---------------------------------------------------------------------------
// Scroll-driven building imagery.
// - usePhotos(): real photographs dropped into src/assets/photos win; every
//   other scene gets a deterministic generated skyline plate (SVG data URI).
// - ScrollBackdrop: fixed, full-bleed, cross-fades to the active scene and
//   parallax-drifts with scroll (compositor-only transforms).
// - useSceneObserver(): picks the section most in view → active scene.
// - SceneBand: a transparent gap between panels that reveals the backdrop and
//   captions it, so the change is visible even inside the 420px frame.
// ---------------------------------------------------------------------------

const photoFiles = import.meta.glob('./assets/photos/*.{jpg,jpeg,png,webp}', { eager: true, query: '?url', import: 'default' })

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Procedural dusk skyline in the scene's palette. Pure SVG, ~60 shapes. */
export function skylineSVG(scene, seed = 7) {
  const W = 1600
  const H = 900
  const [skyTop, skyMid, glow] = scene.palette
  const rnd = mulberry32(seed + scene.id.length * 131)
  const horizon = 600
  const shapes = []

  // Mountains (behind everything) for the mountain scene and city scene.
  if (scene.style === 'mountains' || scene.style === 'city') {
    let pts = `0,${horizon}`
    for (let x = 0; x <= W; x += 80) {
      const h = scene.style === 'mountains' ? 180 + rnd() * 160 : 60 + rnd() * 70
      pts += ` ${x},${horizon - h}`
    }
    pts += ` ${W},${horizon}`
    shapes.push(`<polygon points="${pts}" fill="${skyMid}" opacity="0.55"/>`)
  }

  // Buildings.
  const profile = {
    city: { count: 26, wMin: 40, wMax: 110, hMin: 120, hMax: 420, towers: true },
    towers: { count: 18, wMin: 50, wMax: 120, hMin: 160, hMax: 470, towers: true },
    offices: { count: 16, wMin: 90, wMax: 200, hMin: 90, hMax: 260, towers: false },
    sheds: { count: 14, wMin: 140, wMax: 260, hMin: 60, hMax: 130, towers: false },
    campus: { count: 15, wMin: 110, wMax: 220, hMin: 70, hMax: 190, towers: false },
    mountains: { count: 22, wMin: 40, wMax: 100, hMin: 90, hMax: 300, towers: true },
  }[scene.style] || { count: 20, wMin: 50, wMax: 120, hMin: 100, hMax: 350, towers: true }

  let x = -40
  let i = 0
  while (x < W + 40 && i < 60) {
    const w = profile.wMin + rnd() * (profile.wMax - profile.wMin)
    const h = profile.hMin + rnd() * (profile.hMax - profile.hMin)
    const y = horizon - h
    const shade = 0.55 + rnd() * 0.35
    const fill = `rgba(8,14,26,${shade.toFixed(2)})`
    if (profile.towers && rnd() > 0.55) {
      // Setback tower: base + narrower crown + spire.
      const crownW = w * (0.5 + rnd() * 0.3)
      const crownH = h * (0.18 + rnd() * 0.2)
      shapes.push(`<rect x="${x.toFixed(0)}" y="${(y + crownH).toFixed(0)}" width="${w.toFixed(0)}" height="${(h - crownH).toFixed(0)}" fill="${fill}"/>`)
      shapes.push(`<rect x="${(x + (w - crownW) / 2).toFixed(0)}" y="${y.toFixed(0)}" width="${crownW.toFixed(0)}" height="${(crownH + 2).toFixed(0)}" fill="${fill}"/>`)
      if (rnd() > 0.5) shapes.push(`<rect x="${(x + w / 2 - 2).toFixed(0)}" y="${(y - 30 - rnd() * 40).toFixed(0)}" width="4" height="60" fill="${fill}"/>`)
    } else if (scene.style === 'sheds') {
      // Industrial shed: pitched roof.
      shapes.push(`<polygon points="${x.toFixed(0)},${horizon} ${x.toFixed(0)},${y.toFixed(0)} ${(x + w / 2).toFixed(0)},${(y - 28).toFixed(0)} ${(x + w).toFixed(0)},${y.toFixed(0)} ${(x + w).toFixed(0)},${horizon}" fill="${fill}"/>`)
      if (rnd() > 0.5) shapes.push(`<rect x="${(x + w * 0.8).toFixed(0)}" y="${(y - 90).toFixed(0)}" width="10" height="100" fill="${fill}"/>`)
    } else {
      shapes.push(`<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" rx="${scene.style === 'campus' ? 10 : 2}" fill="${fill}"/>`)
    }
    // Lit windows.
    const cols = Math.max(2, Math.floor(w / 18))
    const rows = Math.max(2, Math.floor(h / 22))
    let win = ''
    for (let r = 1; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (rnd() > 0.62) {
          const wx = x + 6 + c * (w - 12) / cols
          const wy = y + 10 + r * (h - 16) / rows
          win += `M${wx.toFixed(0)} ${wy.toFixed(0)}h6v8h-6z`
        }
      }
    }
    if (win) shapes.push(`<path d="${win}" fill="${glow}" opacity="${(0.5 + rnd() * 0.4).toFixed(2)}"/>`)
    x += w + 8 + rnd() * 30
    i++
  }

  const water = scene.style === 'city' || scene.style === 'towers'
  const ground = water
    ? `<rect x="0" y="${horizon}" width="${W}" height="${H - horizon}" fill="url(#water)"/>`
    : `<rect x="0" y="${horizon}" width="${W}" height="${H - horizon}" fill="#0a1220"/>`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${skyTop}"/>
      <stop offset="0.62" stop-color="${skyMid}"/>
      <stop offset="1" stop-color="${glow}"/>
    </linearGradient>
    <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${glow}" stop-opacity="0.45"/>
      <stop offset="0.25" stop-color="#0a1220"/>
      <stop offset="1" stop-color="#050a12"/>
    </linearGradient>
    <radialGradient id="sun" cx="0.72" cy="0.68" r="0.35">
      <stop offset="0" stop-color="${glow}" stop-opacity="0.9"/>
      <stop offset="1" stop-color="${glow}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  <rect width="${W}" height="${horizon}" fill="url(#sun)"/>
  ${shapes.join('\n  ')}
  ${ground}
</svg>`
}

function svgDataUri(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/** Resolve every scene to { ...scene, src, isPhoto }. */
export function usePhotos() {
  return useMemo(
    () =>
      SCENES.map((scene) => {
        const key = Object.keys(photoFiles).find((k) => k.endsWith(`/${scene.file}`))
        if (key) return { ...scene, src: photoFiles[key], isPhoto: true }
        return { ...scene, src: svgDataUri(skylineSVG(scene)), isPhoto: false }
      }),
    [],
  )
}

export function sceneCaption(scene) {
  if (!scene) return ''
  return scene.isPhoto ? `${scene.title}${scene.credit ? ` · ${scene.credit}` : ''}` : `${scene.title} · Illustration`
}

/** Fixed, full-bleed backdrop. Cross-fades on `active`; drifts with scroll. */
export function ScrollBackdrop({ scenes, active }) {
  const layerRef = useRef(null)
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        if (!layerRef.current) return
        const y = Math.min(window.scrollY * 0.08, 90)
        layerRef.current.style.transform = `translate3d(0, ${-y}px, 0) scale(1.04)`
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
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-stone-950" aria-hidden="true">
      <div ref={layerRef} className="absolute inset-0 will-change-transform">
        {scenes.map((s) => (
          <img
            key={s.id}
            src={s.src}
            alt=""
            className={`scene-photo ${s.id === active ? 'is-active' : ''}`}
            style={{ objectPosition: s.focus || '50% 50%', transform: `scale(${s.zoom || 1})`, transition: 'opacity 0.9s ease, transform 1.4s ease' }}
            draggable="false"
          />
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#070503]/70 via-[#1b1108]/35 to-[#070503]/85" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,rgba(212,167,106,0.18),transparent_60%)]" />
    </div>
  )
}

/** Observe [data-scene] sections inside `rootRef`; report the one most in view. */
export function useSceneObserver(rootRef, onScene, deps = []) {
  const cb = useRef(onScene)
  cb.current = onScene
  useEffect(() => {
    const root = rootRef.current
    if (!root || typeof IntersectionObserver === 'undefined') return
    const els = Array.from(root.querySelectorAll('[data-scene]'))
    if (!els.length) return
    const ratios = new Map()
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) ratios.set(e.target, e.isIntersecting ? e.intersectionRatio : 0)
        let best = null
        let bestR = 0
        for (const el of els) {
          const r = ratios.get(el) || 0
          if (r > bestR) {
            best = el
            bestR = r
          }
        }
        if (best) cb.current(best.dataset.scene)
      },
      { threshold: [0, 0.15, 0.3, 0.5, 0.7, 0.9, 1], rootMargin: '-20% 0px -20% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

/** Transparent gap between panels that shows the backdrop and captions it. */
export function SceneBand({ scene, label, height = 'h-28' }) {
  return (
    <div className={`relative flex ${height} items-end px-2 pb-2`} aria-hidden="true">
      <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-black/55 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur">
        <span>📍</span>
        <span className="truncate">{label || sceneCaption(scene)}</span>
      </span>
    </div>
  )
}

/** Small live caption chip for the sticky header / footer. */
export function SceneChip({ scene }) {
  if (!scene) return null
  return (
    <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white">
      <span aria-hidden="true">🏙️</span>
      <span className="truncate">{sceneCaption(scene)}</span>
    </span>
  )
}

/** Scene state hook shared by App: current id + lookup. */
export function useSceneState(scenes, initial) {
  const [active, setActive] = useState(initial || scenes[0]?.id)
  const scene = scenes.find((s) => s.id === active) || scenes[0]
  return { active, setActive, scene }
}
