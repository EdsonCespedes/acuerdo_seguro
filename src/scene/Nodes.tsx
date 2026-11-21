import { memo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { useUi } from '../store/ui'
import { useLabels, rank, reach } from './labels'
import { Vec3 } from '../lib/util'
import { scene } from '../theme'

const tmp = new THREE.Vector3()
const goal = new THREE.Vector3()
const ndc = new THREE.Vector3()
export type Mark = 'sent' | 'ok' | null
type Props = {
  id: string; pos: Vec3; label: string; sub?: string; desc?: string; color: string; index: number; active: boolean
  dim?: boolean; scale?: number; open?: boolean; show?: boolean; always?: boolean
  kind?: 'opp' | 'company' | 'person'; mark?: Mark; onSelect: (id: string) => void
}

const G = {
  halo: new THREE.SphereGeometry(0.6, 10, 10),
  sphere: new THREE.SphereGeometry(1, 14, 14),
  octa: new THREE.OctahedronGeometry(0.26),
  ringOpp: new THREE.RingGeometry(0.36, 0.4, 36, 1, 0, Math.PI * 1.5),
  ringCo: new THREE.RingGeometry(0.46, 0.5, 36, 1, 0, Math.PI * 1.5),
  ping: new THREE.RingGeometry(0.37, 0.39, 32),
  hit: new THREE.SphereGeometry(0.85, 6, 6),
}
const HIT_MAT = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
const NO_RAY = () => null

function Node({ id, pos, label, sub, desc, color, index, active, dim, scale = 1, open, show = true, always = false, kind = 'opp', mark = null, onSelect }: Props) {
  const g = useRef<THREE.Group>(null)
  const ring = useRef<THREE.Mesh>(null)
  const ping = useRef<THREE.Mesh>(null)
  const halo = useRef<THREE.Mesh>(null)
  const [hover, setHover] = useState(false)
  const [p0] = useState(pos)
  const inSet = useLabels((s) => s.ids.has(id))
  const full = useLabels((s) => s.full.has(id))
  const c = scene.nodeByKey[color] ?? color
  const R = kind === 'company' ? 0.3 : 0.2
  const ringColor = active ? scene.lineActive : mark === 'ok' ? scene.linkOk : mark === 'sent' ? scene.sent : scene.nodeRing

  useFrame((state, dt) => {
    const grp = g.current
    if (!grp) return
    if (!show && !grp.visible) { rank.delete(id); return } // oculto y quieto: costo cero
    const reduced = useUi.getState().reduced
    const t = state.clock.elapsedTime
    grp.position.lerp(goal.set(pos[0], pos[1], pos[2]), reduced ? 1 : 0.07)
    grp.scale.lerp(tmp.setScalar(show ? scale * (active ? 1.35 : hover ? 1.15 : 1) : 0.0001), reduced ? 1 : 0.12)
    grp.visible = grp.scale.x > 0.02
    if (show && !dim && grp.visible) {
      ndc.copy(grp.position).project(state.camera)
      if (ndc.z < 1 && Math.abs(ndc.x) < 1.05 && Math.abs(ndc.y) < 1.05) {
        const d = state.camera.position.distanceTo(grp.position)
        rank.set(id, d + Math.hypot(ndc.x, ndc.y) * 8); reach.set(id, d)
      } else rank.delete(id)
    } else rank.delete(id)
    if (!grp.visible) return
    if (ring.current) {
      if (!reduced) ring.current.rotation.z += Math.min(dt, 0.05) * (active ? 2.2 : 0.35)
      const m = ring.current.material as THREE.MeshBasicMaterial
      m.opacity += ((active ? 1 : hover ? 0.9 : mark ? 0.95 : dim ? 0.2 : 0.55) - m.opacity) * 0.15
    }
    if (halo.current) (halo.current.material as THREE.MeshBasicMaterial).opacity = active ? 0.3 : hover ? 0.2 : mark === 'ok' ? 0.28 : dim ? 0.03 : 0.1
    if (ping.current) {
      const on = !!open && !dim && !reduced
      ping.current.visible = on
      if (on) {
        const k = (t * 0.45 + index * 0.37) % 1
        ping.current.scale.setScalar(1 + k * 1.1);
        (ping.current.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.45
      }
    }
  })

  const showLabel = show && (always || hover || active || inSet)
  const near = full || hover || active
  return (
    <group ref={g} position={p0} scale={0.0001}>
      <mesh ref={halo} geometry={G.halo}><meshBasicMaterial color={mark === 'ok' ? scene.linkOk : scene.nodeRing} transparent opacity={0.1} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>
      <mesh geometry={kind === 'person' ? G.octa : G.sphere} scale={kind === 'person' ? 1 : R}>
        <meshBasicMaterial color={active ? scene.nodeActive : c} transparent opacity={dim ? 0.3 : 1} />
      </mesh>
      <Billboard>
        <mesh ref={ring} geometry={kind === 'company' ? G.ringCo : G.ringOpp}><meshBasicMaterial color={ringColor} transparent opacity={0.55} side={THREE.DoubleSide} depthWrite={false} /></mesh>
        {open && <mesh ref={ping} geometry={G.ping}><meshBasicMaterial color={scene.signal} transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} /></mesh>}
      </Billboard>
      <mesh geometry={G.hit} material={HIT_MAT} raycast={show ? THREE.Mesh.prototype.raycast : NO_RAY}
        onClick={(e) => { e.stopPropagation(); onSelect(id) }}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = '' }} />
      {showLabel && (
        <Html center position={[0, -0.8, 0]} zIndexRange={[near ? 8 : 5, 0]} style={{ pointerEvents: 'none' }}>
          <div className={'node-label k-' + kind + (near ? ' is-near' : '') + (active ? ' is-active' : '') + (dim ? ' is-dim' : '') + (mark ? ' m-' + mark : '')}>
            <span>{label}</span>
            {near && sub && <small>{sub}</small>}
            {near && desc && <em>{desc}</em>}
          </div>
        </Html>
      )}
    </group>
  )
}
export default memo(Node)
