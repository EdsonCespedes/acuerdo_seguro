import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useUi } from '../store/ui'
import { Vec3, isLowEnd } from '../lib/util'
import { taperedTube } from './neuronGeo'
import { scene } from '../theme'

const LOW = isLowEnd(), SEG = LOW ? 28 : 40, RAD = LOW ? 4 : 5
export const toCurve = (pts: Vec3[]) => new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.5)
export function Tube({ curve, color = scene.line, r0, r1, active = false, dim = false, opacity = 0.55 }: { curve: THREE.CatmullRomCurve3; color?: string; r0: number; r1: number; active?: boolean; dim?: boolean; opacity?: number }) {
  const geo = useMemo(() => taperedTube(curve, r0, r1, SEG, RAD), [curve, r0, r1])
  const glow = useMemo(() => (active ? taperedTube(curve, r0 * 4, r1 * 4, SEG, 6) : null), [curve, r0, r1, active])
  useEffect(() => () => geo.dispose(), [geo])
  useEffect(() => () => glow?.dispose(), [glow])
  return (
    <>
      <mesh geometry={geo}>
        <meshBasicMaterial color={active ? scene.lineActive : color} transparent opacity={active ? 1 : dim ? 0.12 : opacity} depthWrite={false} />
      </mesh>
      {glow && (
        <mesh geometry={glow}>
          <meshBasicMaterial color={scene.lineActive} transparent opacity={0.16} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      )}
    </>
  )
}
const TRAIL = 4
export function Pulses({ curves, active = -1, speed = 0.12, size = 0.06, color = scene.signal }: { curves: THREE.CatmullRomCurve3[]; active?: number; speed?: number; size?: number; color?: string }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const phase = useRef<number[]>([])
  const n = curves.length * TRAIL
  useFrame((_, dt) => {
    const m = ref.current; if (!m || !n) return
    const reduced = useUi.getState().reduced
    const step = Math.min(dt, 0.05)
    const ph = phase.current
    curves.forEach((c, i) => {
      if (ph[i] === undefined) ph[i] = (i * 0.37) % 1
      const on = i === active
      if (!reduced) ph[i] = (ph[i] + step * speed * (0.75 + ((i * 7) % 5) * 0.1) * (on ? 2.4 : 1)) % 1
      for (let j = 0; j < TRAIL; j++) {
        const u = (((ph[i] - j * 0.016) % 1) + 1) % 1
        c.getPointAt(u, dummy.position)
        dummy.scale.setScalar(reduced ? 0 : (0.55 + Math.sin(u * Math.PI) * 0.8) * (1 - j * 0.22) * (on ? 1.5 : 1))
        dummy.updateMatrix(); m.setMatrixAt(i * TRAIL + j, dummy.matrix)
      }
    })
    m.instanceMatrix.needsUpdate = true
  })
  if (!n) return null
  return (
    <instancedMesh ref={ref} args={[undefined as any, undefined as any, n]} frustumCulled={false}>
      <sphereGeometry args={[size, 6, 6]} />
      <meshBasicMaterial color={color} transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} />
    </instancedMesh>
  )
}
const DISCHARGE_S = 0.8
export function Discharge({ curve }: { curve: THREE.CatmullRomCurve3 | null }) {
  const group = useRef<THREE.Group>(null)
  const parts = useRef<(THREE.Mesh | null)[]>([])
  const t0 = useRef(-1)
  useFrame(({ clock }) => {
    const g = group.current; if (!g) return
    if (!curve || useUi.getState().reduced) { g.visible = false; return }
    if (t0.current < 0) t0.current = clock.elapsedTime
    const k = (clock.elapsedTime - t0.current) / DISCHARGE_S
    if (k >= 1) { g.visible = false; return }
    g.visible = true
    const e = 1 - Math.pow(1 - k, 3)
    const fade = k < 0.85 ? 1 : (1 - k) / 0.15
    parts.current.forEach((m, i) => {
      if (!m) return
      curve.getPointAt(Math.max(0, e - i * 0.035), m.position)
      m.scale.setScalar((1 - i * 0.17) * fade)
    })
  })
  return (
    <group ref={group} visible={false}>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} ref={(el) => { parts.current[i] = el }}>
          <sphereGeometry args={[0.13, 8, 8]} />
          <meshBasicMaterial color={i === 0 ? scene.spark : scene.signal} transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}
