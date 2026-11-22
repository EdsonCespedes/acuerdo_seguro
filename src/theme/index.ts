import { theme, Theme } from './colors'

export { theme, palette } from './colors'
export type { Theme } from './colors'
export const scene = theme.scene

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())
const decl = (o: Record<string, string>) => Object.entries(o).map(([k, v]) => `--${kebab(k)}:${v};`).join('')
const soft = 'color-mix(in srgb, var(--accent) 18%, transparent)'

export function themeCss(t: Theme = theme): string {
  const { ok, err, warn, onWarn } = t.status
  return (
    `:root{${decl(t.dark)}--accent-soft:${soft};` +
    `${decl({ ok, err, warn, onWarn, shadow: t.shadow, neon: t.scene.linkOk, lightBg: t.light.bg, lightText: t.light.text })}color-scheme:dark}` +
    `.sheet{${decl(t.light)}--accent-soft:${soft};color-scheme:light}`
  )
}

export function applyTheme(t: Theme = theme) {
  let el = document.getElementById('theme-vars') as HTMLStyleElement | null
  if (!el) { el = document.createElement('style'); el.id = 'theme-vars'; document.head.prepend(el) }
  el.textContent = themeCss(t)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.dark.bg)
}
