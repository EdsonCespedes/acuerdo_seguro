import type { Theme } from './colors'

export const manifestJson = (t: Theme) =>
  JSON.stringify(
    {
      name: 'Acuerdo Seguro',
      short_name: 'Acuerdo Seguro',
      lang: 'es-BO',
      display: 'standalone',
      background_color: t.dark.bg,
      theme_color: t.dark.bg,
      start_url: '/',
      icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
    },
    null,
    2,
  )
export const iconSvg = (t: Theme) => {
  const s = t.scene
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">` +
    `<rect width="128" height="128" rx="28" fill="${t.dark.bgDeep}"/>` +
    `<g stroke="${s.line}" stroke-width="4" fill="none" stroke-linecap="round">` +
    `<path d="M64 62 L26 30"/><path d="M64 62 L104 34"/><path d="M64 62 L64 116" stroke="${s.lineActive}"/></g>` +
    `<g fill="${s.nodeRing}"><circle cx="26" cy="30" r="6"/><circle cx="104" cy="34" r="6"/><circle cx="64" cy="116" r="6"/></g>` +
    `<circle cx="64" cy="62" r="24" fill="${s.coreBody}" stroke="${s.coreRim}" stroke-width="3"/>` +
    `<circle cx="64" cy="62" r="12" fill="${s.coreNucleus}"/>` +
    `<circle cx="64" cy="62" r="4" fill="${s.spark}"/></svg>`
  )
}
