import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html, PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'
import modules from '../data/modules.json'
import CameraRig from './CameraRig'
import Soma from './Soma'
import Node, { Mark } from './Nodes'
import { Tube, Pulses, Discharge, toCurve } from './Wires'
import { useUi } from '../store/ui'
import { useCollection } from '../lib/db'
import { MODULE_POS, dendritePoints, offersView } from '../lib/layout'
import { computeWorld } from '../lib/world'
import { pct } from '../lib/match'
import { oppMatches } from '../lib/filters'
import { rng, isLowEnd, fmtBs, shortOf, shortTitle, modLabel, modShort, modulesFor, ME, CO, Vec3 } from '../lib/util'
import { useLabels, rank, reach } from './labels'
import { pickOpp, pressCore, quickApply } from '../features/actions'
import { scene } from '../theme'

function Motes() {
  const ref = useRef<THREE.Points>(null)
  const low = useMemo(isLowEnd, [])
  const arr = useMemo(() => {
    const r = rng('motes'); const n = low ? 100 : 260; const a = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) { const R = 14 + r() * 50, th = r() * 6.283, ph = Math.acos(2 * r() - 1); a.set([R * Math.sin(ph) * Math.cos(th), R * Math.cos(ph), R * Math.sin(ph) * Math.sin(th)], i * 3) }
    return a
  }, [low])
  useFrame((_, dt) => { if (ref.current && !useUi.getState().reduced) ref.current.rotation.y += Math.min(dt, 0.05) * 0.006 })
  return (
    <points ref={ref}>
      <bufferGeometry><bufferAttribute attach="attributes-position" array={arr} count={arr.length / 3} itemSize={3} /></bufferGeometry>
      <pointsMaterial color={scene.mote} size={0.09} sizeAttenuation transparent opacity={0.45} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  )
}

function LabelBudget({ max }: { max: number }) {
  const acc = useRef(0)
  useFrame((_, dt) => {
    acc.current += dt; if (acc.current < 0.2) return; acc.current = 0
    const top = [...rank.entries()].sort((a, b) => a[1] - b[1]).slice(0, max).map((e) => e[0])
    const full = top.filter((id) => (reach.get(id) ?? 99) < 9).slice(0, 2)
    const cur = useLabels.getState()
    const same = (a: Set<string>, b: string[]) => a.size === b.length && b.every((i) => a.has(i))
    if (same(cur.ids, top) && same(cur.full, full)) return
    useLabels.setState({ ids: new Set(top), full: new Set(full) })
  })
  return null
}

function CoreHint({ zone }: { zone: string }) {
  return (
    <Html center position={[0, -2.7, 0]} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
      <div className="node-label"><span>{zone === 'offers' ? 'Menú' : 'Ofertas'}</span></div>
    </Html>
  )
}

type Link = { key: string; a: Vec3; b: Vec3; state: 'ok' | 'wait' | 'soft' }
const sub3 = (a: Vec3, b: Vec3): Vec3 => [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
function linkCurve(a: Vec3, b: Vec3) {
  const d = sub3(a, b), n = Math.hypot(...d) || 1
  const off: Vec3 = [-d[2] / n * 0.7, 0.35, d[0] / n * 0.7]
  const at = (k: number): Vec3 => [a[0] + d[0] * k + off[0], a[1] + d[1] * k + off[1], a[2] + d[2] * k + off[2]]
  const out = (p: Vec3, k: number): Vec3 => p.map((x) => x * k) as Vec3
  const start = Math.hypot(...a) < 0.01 ? out(b, 1.3 / (Math.hypot(...b) || 1)) : a
  return toCurve([start, at(0.33), at(0.66), b])
}

const onOpp = (id: string) => { const u = useUi.getState(); if (u.applyMode && u.role === 'worker') quickApply(id); else pickOpp(id) }
const onCompany = (id: string) => useUi.getState().selectEntity('company', id)
const onPerson = (id: string) => useUi.getState().selectEntity('person', id)
const onModule = (id: string) => useUi.getState().selectModule(id)

function World() {
  const sel = useUi((s) => s.selected)
  const zone = useUi((s) => s.zone)
  const query = useUi((s) => s.query)
  const branchF = useUi((s) => s.branch)
  const role = useUi((s) => s.role)
  const lens = useUi((s) => s.lens)
  const opps = useCollection('opportunities')
  const users = useCollection('users')
  const apps = useCollection('applications')
  const world = useMemo(() => computeWorld(role, lens), [role, lens, opps.length, users.length])
  const mods = useMemo(() => modulesFor(modules, role), [role])
  const modCurves = useMemo(() => mods.map((m) => ({ id: m.id, curve: toCurve(dendritePoints(m.id, MODULE_POS[m.id])) })), [mods])
  const modIdx = sel?.kind === 'module' ? modCurves.findIndex((m) => m.id === sel.id) : -1
  const color = (b: string) => scene.branch[b] ?? scene.line
  const names = useMemo(() => new Map<string, string>(users.map((u) => [u.id, shortTitle(u.name, 16)])), [users])
  const coName = (id: string) => names.get(id) ?? ''
  const mineIds = new Set(opps.filter((o) => o.company_id === CO).map((o) => o.id))
  const offersOn = zone === 'offers'

  const oppMark = (id: string): Mark => {
    const list = apps.filter((a) => a.opportunity_id === id && (role === 'worker' ? a.worker_id === ME : mineIds.has(id)))
    return list.some((a) => a.status === 'aceptada') ? 'ok' : role === 'worker' && list.length ? 'sent' : null
  }
  const personMark = (id: string): Mark => {
    const list = apps.filter((a) => a.worker_id === id && mineIds.has(a.opportunity_id))
    return list.some((a) => a.status === 'aceptada') ? 'ok' : list.length ? 'sent' : null
  }

  const spec: Link[] = []
  if (offersOn) {
    if (role === 'worker') {
      for (const a of apps) if (a.worker_id === ME && world.opps[a.opportunity_id]) spec.push({ key: a.id, a: [0, 0, 0], b: world.opps[a.opportunity_id].pos, state: a.status === 'aceptada' ? 'ok' : 'wait' })
    } else {
      for (const id of mineIds) if (world.opps[id]) spec.push({ key: 'm' + id, a: [0, 0, 0], b: world.opps[id].pos, state: 'soft' })
      for (const a of apps) {
        const per = world.people[a.worker_id], op = world.opps[a.opportunity_id]
        if (mineIds.has(a.opportunity_id) && per && op) spec.push({ key: a.id, a: per.pos, b: op.pos, state: a.status === 'aceptada' ? 'ok' : 'wait' })
      }
    }
  }
  const sig = spec.map((l) => [l.key, l.state, ...l.a, ...l.b].join(',')).join('|')
  const links = useMemo(() => spec.map((l) => ({ ...l, curve: linkCurve(l.a, l.b) })), [sig])
  const okCurves = links.filter((l) => l.state === 'ok').map((l) => l.curve)

  return (
    <>
      <Motes />
      <LabelBudget max={isLowEnd() ? 6 : 9} />
      <Soma onSelect={pressCore} />
      {role !== 'company' && <CoreHint zone={zone} />}

      {zone === 'modules' && (
        <>
          {modCurves.map(({ id, curve }) => <Tube key={id} curve={curve} r0={0.035} r1={0.022} active={sel?.kind === 'module' && sel.id === id} />)}
          <Pulses curves={modCurves.map((c) => c.curve)} active={modIdx} speed={0.13} />
          {mods.map((m, i) => (
            <Node key={m.id} id={m.id} pos={MODULE_POS[m.id]} label={shortTitle(modLabel(m, role), 14)} sub={shortTitle(modShort(m, role), 26)} color={m.color} index={i}
              active={sel?.kind === 'module' && sel.id === m.id} onSelect={onModule} always />
          ))}
        </>
      )}

      {links.map((l) => l.state === 'ok'
        ? <Tube key={l.key} curve={l.curve} r0={0.05} r1={0.035} active tint={scene.linkOk} />
        : <Tube key={l.key} curve={l.curve} color={l.state === 'wait' ? scene.linkWait : scene.line} r0={0.018} r1={0.012} opacity={l.state === 'wait' ? 0.4 : 0.16} />)}
      {okCurves.length > 0 && <Pulses curves={okCurves} speed={0.22} size={0.08} color={scene.linkOk} />}

      {opps.map((o, i) => {
        const hit = oppMatches(o, query, branchF)
        const pl = world.opps[o.id]
        if (!pl) return null
        return (
          <Node key={o.id} id={o.id} pos={pl.pos} label={shortTitle(o.title, 20)} sub={`${coName(o.company_id)} · ${fmtBs(o.budget_cents)}`} desc={shortOf(o, 40)} color={color(o.branch)} open={o.status === 'abierta'}
            index={i} scale={0.9} show={offersOn && pl.show} active={sel?.kind === 'opp' && sel.id === o.id} dim={!hit} mark={oppMark(o.id)}
            onSelect={onOpp} />
        )
      })}

      {users.filter((u) => world.companies[u.id]).map((u, i) => {
        const pl = world.companies[u.id]
        const n = opps.filter((o) => o.company_id === u.id).length
        return (
          <Node key={u.id} id={u.id} kind="company" pos={pl.pos} label={shortTitle(u.name, 18)} sub={`${shortTitle(u.rubro, 14)} · ${n} ofertas`} desc={`${pct(pl.score ?? 0)}% cerca`} color={scene.company}
            index={i} scale={1.25} show={offersOn} active={sel?.kind === 'company' && sel.id === u.id} onSelect={onCompany} />
        )
      })}

      {users.filter((u) => world.people[u.id]).map((u, i) => {
        const pl = world.people[u.id]
        return (
          <Node key={u.id} id={u.id} kind="person" pos={pl.pos} label={shortTitle(u.name, 18)} sub={shortTitle(u.headline, 24)} desc={`${pct(pl.score ?? 0)}% cerca`} color={scene.person}
            index={i} scale={0.95} show={offersOn} active={sel?.kind === 'person' && sel.id === u.id} mark={personMark(u.id)} onSelect={onPerson} />
        )
      })}

      <Discharge key={sel ? sel.kind + sel.id : 'none'} curve={modIdx >= 0 ? modCurves[modIdx].curve : null} />
      <CameraRig />
    </>
  )
}

export default function NeuronScene() {
  const low = isLowEnd()
  const maxDpr = low ? 1.5 : 2
  const [dpr, setDpr] = useState(Math.min(maxDpr, window.devicePixelRatio || 1))
  const [visible, setVisible] = useState(!document.hidden)
  const view = useUi((s) => s.view)
  const close = useUi((s) => s.close)
  useEffect(() => {
    const f = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', f); return () => document.removeEventListener('visibilitychange', f)
  }, [])
  const start = offersView(window.innerWidth < 900)
  return (
    <div className="scene" aria-label="Escena 3D. Usa la vista de lista para entrar sin gestos.">
      <Canvas
        dpr={dpr} frameloop={visible && view === 'scene' ? 'always' : 'never'}
        camera={{ position: start.pos, fov: 55, near: 0.1, far: 300 }}
        gl={{ antialias: !low, powerPreference: 'high-performance', stencil: false, alpha: false }}
        onPointerMissed={() => close()}
        onCreated={({ gl }) => { gl.toneMapping = THREE.NoToneMapping; gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); window.dispatchEvent(new Event('as-webgl-lost')) }) }}
      >
        <color attach="background" args={[scene.bg]} />
        <PerformanceMonitor flipflops={3} onFallback={() => setDpr(1)} onChange={({ factor }) => setDpr(Math.round((1 + (Math.min(maxDpr, window.devicePixelRatio || 1) - 1) * factor) * 10) / 10)} />
        <Suspense fallback={null}><World /></Suspense>
      </Canvas>
    </div>
  )
}
