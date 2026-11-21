// all hex colors live here
export const palette = {
  navy950: '#040B1A',
  navy900: '#071428',
  navy800: '#0C1E3C',
  navy750: '#102A52',
  navy700: '#14305C',
  navy600: '#1E4585',
  blue600: '#1747D6',
  blue500: '#2563FF',
  blue400: '#4D8DFF',
  cyan500: '#00C2FF',
  cyan400: '#00E5FF',
  cyan200: '#9DF3FF',
  ice100: '#E6F7FF',
  white: '#FFFFFF',
  mist100: '#F1F6FD',
  mist200: '#DCE7F6',
  slate400: '#8FA8CC',
  slate600: '#51668A',
  green: '#1F9D6B',
  red: '#D6455D',
  amber: '#F5A524',
}

// roles below use palette colors
const p = palette

// colors for each interface role
type Ctx = {
  bg: string
  bgDeep: string
  text: string
  textMuted: string
  line: string
  lineStrong: string
  field: string
  fieldHover: string
  chip: string
  hud: string
  accent: string
  primary: string
  onPrimary: string
  primaryHover: string
}

// dark is scene, hud and list
const dark: Ctx = {
  bg: p.navy900, bgDeep: p.navy950,
  text: p.ice100, textMuted: p.slate400,
  line: p.navy700, lineStrong: p.navy600,
  field: p.navy800, fieldHover: p.navy750, chip: p.navy800, hud: p.navy800,
  accent: p.cyan400,
  primary: p.cyan400, onPrimary: p.navy950, primaryHover: p.cyan200,
}

// light is the info sheets
const light: Ctx = {
  bg: p.white, bgDeep: p.mist100,
  text: p.navy900, textMuted: p.slate600,
  line: p.mist200, lineStrong: p.slate400,
  field: p.mist100, fieldHover: p.mist200, chip: p.mist100, hud: p.white,
  accent: p.blue500,
  primary: p.blue500, onPrimary: p.white, primaryHover: p.blue600,
}

// colors of the 3d scene
const scene = {
  bg: p.navy950,
  // core
  coreBody: p.navy800,
  coreNucleus: p.blue500,
  coreInner: p.blue600,
  coreRim: p.cyan400,
  label: p.white,
  wire: p.blue400,
  ring: p.cyan400,
  electron: p.cyan200,
  // wires
  line: p.blue500,
  lineActive: p.cyan400,
  sheath: p.blue500,
  signal: p.cyan200,
  spark: p.white,
  // nodes
  nodeRing: p.cyan400,
  nodeActive: p.white,
  mote: p.blue400,
  linkOk: p.cyan400,
  linkWait: p.slate400,
  sent: p.amber,
  person: p.cyan200,
  company: p.white,
  branch: { diseno: p.blue400, redes: p.cyan400, redaccion: p.cyan200, web: p.blue500, admin: p.slate400, formacion: p.white } as Record<string, string>,
  nodeByKey: { light: p.cyan200, white: p.white, mid: p.blue400, dark: p.navy600 } as Record<string, string>,
}

// everything else is generated from this
export const theme = {
  dark,
  light,
  status: { ok: p.green, err: p.red, warn: p.amber, onWarn: p.navy950 },
  shadow: p.navy950,
  scene,
}

export type Theme = typeof theme
