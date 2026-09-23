import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'
import { QUADRANTS, BENCHMARK } from './data.js'
import { STATUS_META } from './engine.js'

// ---------------------------------------------------------------------------
// Two interactive 3D models built from the scorecard data.
//  - Skyline3D: 19 towers (3 hero on the central avenue, 4 quadrant blocks of
//    4). Height = attainment toward target, colour = RAG, ghost outline =
//    target. Drag to orbit, hover for a tooltip, tap a tower to open its tile.
//  - Benchmark3D: paired bars per zone (BE /100 teal, Google /5 navy), RAKEZ
//    in red, dashed target plane at 70.
// Labels are DOM (drei <Html>) so no font files are fetched.
// ---------------------------------------------------------------------------

const NAVY = '#8b6b45'
const TEAL = '#d4a76a'
const RED = '#e0532e'
const GROUND = '#1a140e'
const MAX_H = 3

/** Auto-rotate that pauses while the user is interacting, then resumes. */
function Controls({ target = [0, 0.8, 0], minD = 6, maxD = 16, resumeMs = 5000, ...rest }) {
  const ref = useRef()
  const [spin, setSpin] = useState(true)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  return (
    <OrbitControls
      ref={ref}
      target={target}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minDistance={minD}
      maxDistance={maxD}
      maxPolarAngle={1.35}
      minPolarAngle={0.35}
      autoRotate={spin}
      autoRotateSpeed={0.55}
      onStart={() => {
        clearTimeout(timer.current)
        setSpin(false)
      }}
      onEnd={() => {
        clearTimeout(timer.current)
        timer.current = setTimeout(() => setSpin(true), resumeMs)
      }}
      {...rest}
    />
  )
}

/** Pulls the camera back on narrow canvases so the whole model stays in frame. */
function FitCamera({ dir, distance, target }) {
  const { camera, size } = useThree()
  useEffect(() => {
    const aspect = size.width / size.height
    const d = distance * (aspect < 1.25 ? 1.4 : aspect < 1.8 ? 1.15 : 1)
    const len = Math.hypot(...dir)
    camera.position.set((dir[0] / len) * d, (dir[1] / len) * d, (dir[2] / len) * d)
    camera.lookAt(...target)
    camera.updateProjectionMatrix()
  }, [camera, size.width, size.height, distance, dir, target])
  return null
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[6, 10, 4]} intensity={1.4} />
      <directionalLight position={[-6, 4, -6]} intensity={0.5} color="#f0c48a" />
    </>
  )
}

/** Smoothly animates a mesh's scale.y toward `h` so entries grow the tower. */
function GrowingBox({ h, color, emissive = 0, x, z, w = 0.8, onClick, onOver, onOut, opacity = 1 }) {
  const ref = useRef()
  const cur = useRef(0.01)
  useFrame((_, dt) => {
    if (!ref.current) return
    cur.current += (h - cur.current) * Math.min(1, dt * 5)
    ref.current.scale.y = cur.current
    ref.current.position.y = cur.current / 2
  })
  return (
    <mesh ref={ref} position={[x, 0.005, z]} scale={[1, 0.01, 1]} onClick={onClick} onPointerOver={onOver} onPointerOut={onOut}>
      <boxGeometry args={[w, 1, w]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={emissive} roughness={0.55} metalness={0.05} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  )
}

/** Wireframe ghost showing the target height. */
function Ghost({ x, z, h, w = 0.8, color = '#d4a76a' }) {
  const geo = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, w)), [w, h])
  const mat = useMemo(() => new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.55 }), [color])
  const obj = useMemo(() => new THREE.LineSegments(geo, mat), [geo, mat])
  return <primitive object={obj} position={[x, h / 2, z]} />
}

function Tower({ tile, x, z, w, onSelect, hovered, setHovered }) {
  const meta = { ...tile.status, hex: { red: '#e0532e', amber: '#d4a76a', green: '#3fa66b' }[tile.status.tone] }
  const unmeasured = tile.value == null
  const h = Math.max(0.12, (unmeasured ? 0.08 : tile.attainment) * MAX_H)
  const isHover = hovered === tile.id
  return (
    <group>
      <GrowingBox
        h={h}
        w={w}
        x={x}
        z={z}
        color={meta.hex}
        emissive={isHover ? 0.35 : 0.08}
        opacity={unmeasured ? 0.55 : 1}
        onClick={(e) => {
          e.stopPropagation()
          onSelect?.(tile.id)
        }}
        onOver={(e) => {
          e.stopPropagation()
          setHovered(tile.id)
          document.body.style.cursor = 'pointer'
        }}
        onOut={() => {
          setHovered((h0) => (h0 === tile.id ? null : h0))
          document.body.style.cursor = ''
        }}
      />
      <Ghost x={x} z={z} h={MAX_H} w={w} />
      {isHover && (
        <Html position={[x, h + 0.35, z]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className="anim-pop w-48 rounded-2xl border border-gold/20 bg-ink/95 p-2.5 text-left shadow-xl backdrop-blur">
            <div className="text-[10px] font-extrabold uppercase tracking-wide text-stone-400">{tile.id}</div>
            <div className="text-xs font-bold leading-snug text-stone-100">
              <span aria-hidden="true">{tile.icon}</span> {tile.label}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="font-bold tabular-nums text-stone-200">
                {tile.display} → {tile.target.display}
              </span>
              <span className={`rounded-full px-1.5 py-0.5 font-extrabold ${meta.bg} ${meta.fg}`}>
                {meta.icon} {meta.label}
              </span>
            </div>
            <div className="mt-1 text-[10px] font-semibold text-gold">Tap to open tile →</div>
          </div>
        </Html>
      )}
    </group>
  )
}

function QuadrantLabel({ q, x, z, count }) {
  return (
    <Html position={[x, 0.02, z]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
      <div className="whitespace-nowrap rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-extrabold text-white">
        <span aria-hidden="true">{q.icon}</span> {q.label}
        {count ? <span className="ml-1 font-semibold text-stone-500">· {count}</span> : null}
      </div>
    </Html>
  )
}

function SkylineScene({ hero, byQuadrant, onSelect, hovered, setHovered }) {
  const blocks = [
    { id: 'customer', cx: -2.0, cz: -1.6 },
    { id: 'process', cx: 2.0, cz: -1.6 },
    { id: 'financial', cx: -2.0, cz: 1.6 },
    { id: 'learning', cx: 2.0, cz: 1.6 },
  ]
  const offsets = [
    [-0.55, -0.55],
    [0.55, -0.55],
    [-0.55, 0.55],
    [0.55, 0.55],
  ]
  return (
    <>
      <Lights />
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[9.5, 8]} />
        <meshStandardMaterial color={GROUND} roughness={1} />
      </mesh>
      {/* Central avenue */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <planeGeometry args={[1.3, 8]} />
        <meshStandardMaterial color="#231a12" roughness={1} />
      </mesh>
      {/* Quadrant plinths */}
      {blocks.map((b) => (
        <mesh key={b.id} position={[b.cx, 0.02, b.cz]}>
          <boxGeometry args={[2.3, 0.04, 2.3]} />
          <meshStandardMaterial color="#261d14" roughness={1} />
        </mesh>
      ))}
      {/* Hero avenue */}
      {hero.map((t, i) => (
        <Tower key={t.id} tile={t} x={0} z={(i - 1) * 1.6} w={0.9} onSelect={onSelect} hovered={hovered} setHovered={setHovered} />
      ))}
      <Html position={[0, 0.02, 3.1]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        <div className="whitespace-nowrap rounded-full bg-gold text-ink px-2 py-0.5 text-[10px] font-extrabold">🏛️ Hero row</div>
      </Html>
      {/* Quadrant blocks */}
      {blocks.map((b) => {
        const q = QUADRANTS.find((x) => x.id === b.id)
        const tiles = byQuadrant[b.id] || []
        const reds = tiles.filter((t) => t.status.tone === 'red').length
        return (
          <group key={b.id}>
            {tiles.map((t, i) => (
              <Tower key={t.id} tile={t} x={b.cx + offsets[i][0]} z={b.cz + offsets[i][1]} w={0.75} onSelect={onSelect} hovered={hovered} setHovered={setHovered} />
            ))}
            <QuadrantLabel q={q} x={b.cx} z={b.cz + 1.45} count={reds ? `${reds} red` : ''} />
          </group>
        )
      })}
    </>
  )
}

function CanvasFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-stone-400">
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-gold/20 border-t-gold" aria-hidden="true" />
    </div>
  )
}

function webglAvailable() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

function NoWebGL({ children }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center">
      <span className="text-3xl" aria-hidden="true">
        🧊
      </span>
      <p className="text-sm font-bold text-stone-500">3D view needs WebGL</p>
      <p className="text-xs text-stone-400">{children}</p>
    </div>
  )
}

/** 19-tower KPI skyline. */
export function Skyline3D({ hero, byQuadrant, onSelect, className = '' }) {
  const [hovered, setHovered] = useState(null)
  const ok = useMemo(webglAvailable, [])
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#1b140d] to-[#0b0906] ${className}`} style={{ touchAction: 'pan-y' }}>
      {ok ? (
        <Canvas dpr={[1, 1.5]} camera={{ position: [7, 5.6, 7.5], fov: 36 }} gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}>
          <FitCamera dir={SKY_DIR} distance={11.8} target={SKY_TARGET} />
          <Suspense fallback={null}>
            <SkylineScene hero={hero} byQuadrant={byQuadrant} onSelect={onSelect} hovered={hovered} setHovered={setHovered} />
          </Suspense>
          <Controls target={SKY_TARGET} minD={6} maxD={18} />
        </Canvas>
      ) : (
        <NoWebGL>Every tower is also a tile below — same data, same taps.</NoWebGL>
      )}
      <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5">
        {['red', 'amber', 'green'].map((k) => (
          <span key={k} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${STATUS_META[k].bg} ${STATUS_META[k].fg}`}>
            <span aria-hidden="true">{STATUS_META[k].icon}</span> {STATUS_META[k].label}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Caption row shown under a 3D model (kept out of the canvas to avoid label collisions). */
export function ModelCaption({ left, right }) {
  return (
    <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] font-semibold text-stone-400">
      <span>{left}</span>
      <span>{right}</span>
    </div>
  )
}

const SKY_DIR = [7, 5.6, 7.5]
const SKY_TARGET = [0, 0.9, 0]
const BENCH_DIR = [5.5, 4.2, 8.5]
const BENCH_TARGET = [0, 1.1, 0]

// ------------------------------------------------------------- Benchmark 3D

function Bar({ x, z, h, color, w = 0.5, label, value, hovered, onOver, onOut, illustrative }) {
  return (
    <group>
      <GrowingBox h={h} w={w} x={x} z={z} color={color} emissive={hovered ? 0.3 : 0.06} opacity={illustrative ? 0.72 : 1} onOver={onOver} onOut={onOut} />
      <Html position={[x, h + 0.25, z]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        <div className={`whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums ${hovered ? 'bg-gold text-ink' : 'bg-ink/90 text-stone-200'}`}>
          {value}
          {label ? <span className="ml-1 font-semibold text-stone-400">{label}</span> : null}
        </div>
      </Html>
    </group>
  )
}

function DashedTargetPlane({ y, width, depth }) {
  const obj = useMemo(() => {
    const pts = [
      new THREE.Vector3(-width / 2, 0, -depth / 2),
      new THREE.Vector3(width / 2, 0, -depth / 2),
      new THREE.Vector3(width / 2, 0, depth / 2),
      new THREE.Vector3(-width / 2, 0, depth / 2),
      new THREE.Vector3(-width / 2, 0, -depth / 2),
    ]
    const geo = new THREE.BufferGeometry().setFromPoints(pts)
    const mat = new THREE.LineDashedMaterial({ color: RED, dashSize: 0.18, gapSize: 0.12 })
    const line = new THREE.Line(geo, mat)
    line.computeLineDistances()
    return line
  }, [width, depth])
  return (
    <group position={[0, y, 0]}>
      <primitive object={obj} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial color={RED} transparent opacity={0.07} side={THREE.DoubleSide} />
      </mesh>
      <Html position={[width / 2 + 0.15, 0, -depth / 2]} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        <div className="whitespace-nowrap rounded-md bg-ink/90 px-1.5 py-0.5 text-[10px] font-extrabold text-rag-red-fg">target 70</div>
      </Html>
    </group>
  )
}

function BenchmarkScene({ zones, target, hovered, setHovered }) {
  const gap = 1.7
  const x0 = (-(zones.length - 1) * gap) / 2
  const width = zones.length * gap + 0.6
  return (
    <>
      <Lights />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[width + 1, 3.6]} />
        <meshStandardMaterial color={GROUND} roughness={1} />
      </mesh>
      <DashedTargetPlane y={(target / 100) * MAX_H} width={width} depth={2.2} />
      {zones.map((zn, i) => {
        const x = x0 + i * gap
        const isRakez = zn.zone === 'RAKEZ'
        const beColor = isRakez ? RED : TEAL
        const gColor = isRakez ? RED : NAVY
        const hov = hovered === zn.zone
        const over = (e) => {
          e.stopPropagation()
          setHovered(zn.zone)
        }
        const out = () => setHovered((h) => (h === zn.zone ? null : h))
        return (
          <group key={zn.zone}>
            <Bar x={x - 0.32} z={0} h={(zn.be / 100) * MAX_H} color={beColor} value={zn.be} label="/100" hovered={hov} onOver={over} onOut={out} illustrative={zn.illustrative} />
            <Bar x={x + 0.32} z={0} h={(zn.google / 5) * MAX_H} color={gColor} value={zn.google.toFixed(1)} label="/5" hovered={hov} onOver={over} onOut={out} illustrative={zn.illustrative} />
            <Html position={[x, 0.02, 1.35]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
              <div className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-extrabold ${isRakez ? 'bg-rag-red-fg text-white' : 'bg-black/70 text-white'}`}>
                {zn.zone}
                {zn.illustrative ? <span className="ml-1 font-semibold text-stone-500">· illustrative</span> : null}
              </div>
            </Html>
          </group>
        )
      })}
    </>
  )
}

/** Paired-bar benchmark in 3D: BE score /100 (teal) and Google rating /5 (navy). */
export function Benchmark3D({ zones = BENCHMARK.zones, target = BENCHMARK.target, className = '' }) {
  const [hovered, setHovered] = useState(null)
  const ok = useMemo(webglAvailable, [])
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#1b140d] to-[#0b0906] ${className}`} style={{ touchAction: 'pan-y' }}>
      {ok ? (
        <Canvas dpr={[1, 1.5]} camera={{ position: [5.5, 4.2, 8.5], fov: 34 }} gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}>
          <FitCamera dir={BENCH_DIR} distance={10.9} target={BENCH_TARGET} />
          <Suspense fallback={null}>
            <BenchmarkScene zones={zones} target={target} hovered={hovered} setHovered={setHovered} />
          </Suspense>
          <Controls target={BENCH_TARGET} minD={6} maxD={16} />
        </Canvas>
      ) : (
        <NoWebGL>Switch to the 2D chart with the toggle above.</NoWebGL>
      )}
      <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5 text-[10px] font-extrabold">
        <span className="inline-flex items-center gap-1 rounded-full bg-ink/90 px-2 py-0.5 text-stone-500">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: TEAL }} /> BE score /100
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-ink/90 px-2 py-0.5 text-stone-500">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: NAVY }} /> Google /5
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-ink/90 px-2 py-0.5 text-stone-500">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: RED }} /> RAKEZ
        </span>
      </div>
    </div>
  )
}

export { CanvasFallback }
