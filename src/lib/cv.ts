export const CV_SYSTEM = 'Eres un asistente que redacta CV en español de Bolivia. Usa solo los datos recibidos. No inventes empleadores, títulos, años ni cifras. Responde en texto plano sin markdown, con estas secciones en mayúsculas: PERFIL, HABILIDADES, HERRAMIENTAS, EXPERIENCIA Y PROYECTOS, DISPONIBILIDAD. Máximo 280 palabras. Si hay una convocatoria objetivo, enfoca el perfil hacia ella sin mentir.'

export function cvPrompt(u: any, evidence: any[], opp: any | null, extra: string) {
  const lines = [
    `Nombre: ${u.name}`,
    `Ciudad: ${u.city}`,
    `Titular: ${u.headline}`,
    `Habilidades: ${(u.skills || []).join(', ')}`,
    `Herramientas: ${(u.tools || []).join(', ')}`,
    `Disponibilidad: ${u.availability}. Modalidad: ${u.modality}. Tarifa: Bs ${u.rate_bs} por hora.`,
    `Experiencia: ${(u.experience || []).join('; ') || 'sin datos'}`,
    `Portafolio: ${evidence.map((e) => `${e.title} (${e.kind})`).join('; ') || 'sin datos'}`,
  ]
  if (opp) lines.push(`Convocatoria objetivo: ${opp.title}. Pide: ${(opp.skills || []).join(', ')}. Entregables: ${(opp.deliverables || []).join(', ')}.`)
  if (extra.trim()) lines.push(`Nota de la persona: ${extra.trim()}`)
  return lines.join('\n')
}

export function cvLocal(u: any, evidence: any[], opp: any | null, extra: string) {
  const have = new Set((u.skills || []).map((s: string) => s.toLowerCase()))
  const match = opp ? (opp.skills || []).filter((s: string) => have.has(s.toLowerCase())) : []
  const out = [
    u.name.toUpperCase(),
    `${u.city} · ${u.modality}`,
    '',
    'PERFIL',
    u.headline + (opp ? `. Interesada en: ${opp.title}.` : '.') + (match.length ? ` Coincide en: ${match.join(', ')}.` : ''),
    '',
    'HABILIDADES',
    (u.skills || []).map((s: string) => '- ' + s).join('\n'),
    '',
    'HERRAMIENTAS',
    (u.tools || []).join(', '),
    '',
    'EXPERIENCIA Y PROYECTOS',
    [...(u.experience || []), ...evidence.map((e) => `${e.title} (${e.kind})`)].map((s) => '- ' + s).join('\n'),
    '',
    'DISPONIBILIDAD',
    `${u.availability}. Tarifa: Bs ${u.rate_bs} por hora.`,
  ]
  if (extra.trim()) out.push('', 'NOTA', extra.trim())
  return out.join('\n')
}
