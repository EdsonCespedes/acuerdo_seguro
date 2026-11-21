import * as THREE from 'three'
export function taperedTube(curve: THREE.Curve<THREE.Vector3>, r0: number, r1: number, tubular = 24, radial = 6) {
  const frames = curve.computeFrenetFrames(tubular, false)
  const pos: number[] = [], nor: number[] = [], idx: number[] = []
  const p = new THREE.Vector3()
  for (let i = 0; i <= tubular; i++) {
    const u = i / tubular
    curve.getPointAt(u, p)
    const r = r0 + (r1 - r0) * u
    const N = frames.normals[i], B = frames.binormals[i]
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a)
      const nx = c * N.x + s * B.x, ny = c * N.y + s * B.y, nz = c * N.z + s * B.z
      pos.push(p.x + r * nx, p.y + r * ny, p.z + r * nz); nor.push(nx, ny, nz)
    }
  }
  for (let i = 0; i < tubular; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = (i + 1) * (radial + 1) + j
    idx.push(a, b, a + 1, b, b + 1, a + 1)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setIndex(idx)
  return g
}
