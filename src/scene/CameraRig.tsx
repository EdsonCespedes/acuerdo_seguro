import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useUi } from '../store/ui'
export default function CameraRig() {
  const controls = useRef<any>(null)
  const goal = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null)
  const flight = useUi((s) => s.flight)

  useEffect(() => {
    if (flight) goal.current = { pos: new THREE.Vector3(...flight.pos), target: new THREE.Vector3(...flight.target) }
  }, [flight])

  useFrame((state, dt) => {
    const g = goal.current, c = controls.current
    if (!g || !c) return
    const reduced = useUi.getState().reduced
    const k = 1 - Math.exp(-dt * (reduced ? 14 : 2.4))
    state.camera.position.lerp(g.pos, k)
    c.target.lerp(g.target, k)
    c.update()
    if (state.camera.position.distanceTo(g.pos) < 0.05 && c.target.distanceTo(g.target) < 0.05) goal.current = null
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={1.5}
      maxDistance={70}
      rotateSpeed={0.7}
      panSpeed={0.8}
      touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
      onStart={() => { goal.current = null }}
    />
  )
}
