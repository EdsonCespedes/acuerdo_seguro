import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useUi } from '../store/ui'
import { rng, isLowEnd } from '../lib/util'
import { scene } from '../theme'

function makeLabel() {
  const c = document.createElement('canvas'); c.width = c.height = 256
  const x = c.getContext('2d')!
  x.font = '800 104px "Nunito Variable", Nunito, system-ui, sans-serif'
  x.textAlign = 'center'; x.textBaseline = 'middle'
  x.fillStyle = scene.label; x.fillText('A.S', 128, 136)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}
const VERT = `
varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main() {
  vP = position; vN = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`
const FRAG = `
uniform vec3 uCore; uniform vec3 uRim; uniform float uTime; uniform float uPower;
varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main() {
  float f = pow(1.0 - clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0), 2.4);
  float band = smoothstep(0.92, 1.0, sin(vP.y * 5.0 - uTime * 0.9)) * 0.1;
  vec3 col = mix(uCore, uRim, f);
  float a = clamp((0.1 + f * 0.75 + band) * uPower, 0.0, 1.0);
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}`
export default function Soma({ onSelect }: { onSelect: () => void }) {
  const group = useRef<THREE.Group>(null)
  const wire = useRef<THREE.Mesh>(null)
  const ringA = useRef<THREE.Mesh>(null)
  const ringB = useRef<THREE.Mesh>(null)
  const electron = useRef<THREE.Mesh>(null)
  const orbit = useRef<THREE.Points>(null)
  const low = useMemo(isLowEnd, [])
  const tex = useMemo(makeLabel, [])
  const shell = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uCore: { value: new THREE.Color(scene.coreInner) }, uRim: { value: new THREE.Color(scene.coreRim) }, uTime: { value: 0 }, uPower: { value: 1 } },
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }), [])
  const particles = useMemo(() => {
    const r = rng('orbit'); const n = low ? 36 : 80; const a = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) { const th = r() * 6.283, ph = Math.acos(2 * r() - 1), R = 1.55 + r() * 0.8; a.set([R * Math.sin(ph) * Math.cos(th), R * Math.cos(ph) * 0.8, R * Math.sin(ph) * Math.sin(th)], i * 3) }
    return a
  }, [low])
  useEffect(() => () => { shell.dispose(); tex.dispose() }, [shell, tex])

  const spin = useRef(0.1)
  useFrame(({ clock }, dt) => {
    const st = useUi.getState()
    const e = st.reduced ? 0 : 1
    const t = clock.elapsedTime, step = Math.min(dt, 0.05)
    const busy = !!st.selected || st.zone === 'modules'
    shell.uniforms.uTime.value = e ? t : 0
    shell.uniforms.uPower.value = (0.9 + 0.1 * Math.sin(t * 1.1) * (e || 0.2)) * (busy ? 1.3 : 1)
    if (group.current) group.current.scale.setScalar(1 + 0.02 * Math.sin(t * 1.1) * (e || 0.2))
    spin.current += ((busy ? 0.6 : 0.1) - spin.current) * 0.05
    if (orbit.current) orbit.current.rotation.y += step * spin.current * e
    if (wire.current) wire.current.rotation.y += step * 0.05 * e
    if (ringA.current) ringA.current.rotation.z += step * 0.12 * e
    if (ringB.current) ringB.current.rotation.z -= step * 0.08 * e
    if (electron.current) { const a = t * 0.7 * e; electron.current.position.set(Math.cos(a) * 1.75, Math.sin(a) * 1.75, 0) }
  })

  return (
    <group ref={group}>
      <mesh><sphereGeometry args={[0.95, 24, 24]} /><meshBasicMaterial color={scene.coreBody} transparent opacity={0.6} depthWrite={false} /></mesh>
      <mesh><sphereGeometry args={[0.5, 20, 20]} /><meshBasicMaterial color={scene.coreNucleus} /></mesh>
      <mesh material={shell} onClick={(e) => { e.stopPropagation(); onSelect() }}><sphereGeometry args={[1.3, 32, 32]} /></mesh>
      <mesh onClick={(e) => { e.stopPropagation(); onSelect() }} onPointerOver={() => { document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = '' }}><sphereGeometry args={[2.2, 8, 8]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
      <mesh ref={wire}><icosahedronGeometry args={[1.34, 1]} /><meshBasicMaterial color={scene.wire} wireframe transparent opacity={0.22} depthWrite={false} /></mesh>
      <mesh ref={ringA} rotation={[Math.PI / 2.3, 0.3, 0]}>
        <torusGeometry args={[1.75, 0.008, 6, 96]} /><meshBasicMaterial color={scene.ring} transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} />
        <mesh ref={electron}><sphereGeometry args={[0.05, 8, 8]} /><meshBasicMaterial color={scene.electron} /></mesh>
      </mesh>
      <mesh ref={ringB} rotation={[Math.PI / 3.2, -0.6, 0.5]}>
        <torusGeometry args={[2.1, 0.006, 6, 96]} /><meshBasicMaterial color={scene.ring} transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <points ref={orbit}>
        <bufferGeometry><bufferAttribute attach="attributes-position" array={particles} count={particles.length / 3} itemSize={3} /></bufferGeometry>
        <pointsMaterial color={scene.electron} size={0.045} sizeAttenuation transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
      <sprite scale={[1.0, 1.0, 1]} renderOrder={10}><spriteMaterial map={tex} depthTest={false} transparent opacity={0.95} /></sprite>
    </group>
  )
}
