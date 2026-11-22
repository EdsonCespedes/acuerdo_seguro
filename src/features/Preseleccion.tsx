import { useEffect, useMemo, useState } from 'react'
import { Sparkles, SlidersHorizontal, ChevronDown } from 'lucide-react'
import { motion } from 'motion/react'
import { useCollection } from '../lib/db'
import { useUi } from '../store/ui'
import { usePre, runPreselection, syncShortlist } from '../store/pre'
import { Btn, Section, Tag, Empty } from '../design-system/ui'
import { shortTitle } from '../lib/util'
import { pct } from '../lib/match'
import { knownCities } from '../lib/geo'
import { aiReady } from '../lib/ai'
import { PRE_DEFAULT, PreFilters, Gender, SHORT_MAX, SHORT_MIN, activeCount, recalify, shortlist } from '../lib/preselect'
import { Prox } from './Entities'
import { acceptApplication, pickOpp } from './actions'

const GENDERS: { id: Gender; label: string }[] = [{ id: '', label: 'Todos' }, { id: 'mujer', label: 'Mujeres' }, { id: 'varón', label: 'Varones' }]
const MODALITIES: PreFilters['modality'][] = ['', 'Remoto', 'Presencial', 'Mixta']
const RADII = [{ id: 0, label: 'Cualquiera' }, { id: 5, label: 'Misma ciudad' }, { id: 20, label: 'Hasta 20 km' }, { id: 35, label: 'Hasta 35 km' }]
const MODES: { id: PreFilters['mode']; label: string }[] = [{ id: 'recalificar', label: 'Recalificar' }, { id: 'filtrar', label: 'Filtrar (ocultar)' }]

const tone = (s: string) => (s === 'preseleccionada' || s === 'aceptada' ? 'ok' : s === 'en revisión' ? 'cyan' : 'neutral') as 'ok' | 'cyan' | 'neutral'

export function PreBtn({ oppId, open }: { oppId: string; open?: boolean }) {
  const busy = usePre((s) => !!s.busy[oppId])
  return (
    <Btn kind="primary" data-t="pre" disabled={busy} onClick={() => { if (open) pickOpp(oppId); runPreselection(oppId) }}>
      <Sparkles size={16} /> {busy ? 'Analizando…' : 'Preseleccionar con IA'}
    </Btn>
  )
}

export function Candidatos({ opp, title }: { opp: any; title?: string }) {
  const apps = useCollection('applications').filter((a) => a.opportunity_id === opp.id)
  const users = useCollection('users')
  const run = usePre((s) => s.runs[opp.id])
  const busy = usePre((s) => !!s.busy[opp.id])
  return (
    <Section title={title ?? `Postulaciones (${apps.length})`}>
      <div className="actions wide"><PreBtn oppId={opp.id} /></div>
      {!aiReady && <Tag tone="warn">Sin clave de IA: análisis básico</Tag>}
      {run ? <Ranked opp={opp} apps={apps} users={users} busy={busy} /> : <Plain apps={apps} users={users} busy={busy} />}
    </Section>
  )
}

function Plain({ apps, users, busy }: { apps: any[]; users: any[]; busy: boolean }) {
  if (!apps.length) return <Empty>Aún no hay postulaciones.</Empty>
  return (
    <>
      {busy && <small className="fine">La IA está analizando a los candidatos…</small>}
      {apps.map((a) => {
        const w = users.find((u) => u.id === a.worker_id)
        return (
          <div className="item" key={a.id}>
            <div className="item-top"><b>{w?.name}</b><Tag tone={tone(a.status)}>{a.status}</Tag></div>
            <small className="fine">{w?.headline}</small>
            {a.status !== 'aceptada' && <div className="actions"><Btn kind="primary" onClick={() => acceptApplication(a.id)}>Aceptar y conectar</Btn></div>}
          </div>
        )
      })}
    </>
  )
}

function Ranked({ opp, apps, users, busy }: { opp: any; apps: any[]; users: any[]; busy: boolean }) {
  const run = usePre((s) => s.runs[opp.id])
  const f = usePre((s) => s.filters[opp.id]) ?? PRE_DEFAULT
  const setFilters = usePre((s) => s.setFilters), resetFilters = usePre((s) => s.resetFilters)
  const [open, setOpen] = useState(true)
  const workers = useMemo(() => users.filter((u) => u.role === 'worker'), [users])
  const home = users.find((u) => u.id === opp.company_id)?.city ?? ''
  const cities = useMemo(() => knownCities(), [])
  const rows = useMemo(() => recalify(opp, run, workers, apps, f, home), [opp, run, workers, apps, f, home])
  const ids = useMemo(() => shortlist(rows).map((r) => r.user.id), [rows])
  const key = ids.join(',')
  useEffect(() => { syncShortlist(opp.id, ids) }, [opp.id, key]) 
  const pending = apps.filter((a) => !run.items[a.worker_id]).length
  const n = activeCount(f)
  const set = (p: Partial<PreFilters>) => setFilters(opp.id, p)
  const pick = <T extends string | number>(items: { id: T; label: string }[], value: T, on: (v: T) => void) => (
    <div className="chips">{items.map((i) => <button key={String(i.id)} type="button" className={'chip' + (value === i.id ? ' on' : '')} aria-pressed={value === i.id} onClick={() => on(i.id)}>{i.label}</button>)}</div>
  )
  return (
    <>
      <div className="actions">
        <Tag tone={run.source === 'ia' ? 'cyan' : 'warn'}>{run.source === 'ia' ? 'Análisis con IA' : 'Análisis básico (sin IA)'}</Tag>
        {busy && <small className="fine">Analizando de nuevo…</small>}
      </div>
      {pending > 0 && <small className="fine">{pending} postulación{pending > 1 ? 'es' : ''} nueva{pending > 1 ? 's' : ''} sin analizar: vuelve a tocar Preseleccionar con IA.</small>}
      <button type="button" className="filter-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        <SlidersHorizontal size={16} /> Filtrar y recalificar{n > 0 && <b className="badge">{n}</b>}<ChevronDown size={16} className={open ? 'up' : ''} />
      </button>
      {open && (
        <div className="fpanel">
          <small className="fine">El % de la IA se recalcula al instante con cada filtro.</small>
          <div className="fgroup"><span>Modo</span>{pick(MODES, f.mode, (mode) => set({ mode }))}</div>
          <div className="fgroup"><span>Ubicación cercana a</span>
            <label className="fld"><select value={f.refCity || home} onChange={(e) => set({ refCity: e.target.value === home ? '' : e.target.value })} aria-label="Ciudad de referencia">
              {cities.map((c) => <option key={c} value={c}>{c}{c === home ? ' (la empresa)' : ''}</option>)}
            </select></label>
            {pick(RADII, f.maxKm, (maxKm) => set({ maxKm }))}
          </div>
          <div className="fgroup"><span>Sexo</span>{pick(GENDERS, f.gender, (gender) => set({ gender }))}<small className="fine">La IA no ve el sexo: este filtro solo reordena la lista.</small></div>
          <div className="fgroup"><span>Modalidad</span>{pick(MODALITIES.map((m) => ({ id: m, label: m || 'Cualquiera' })), f.modality, (modality) => set({ modality }))}</div>
          <label className="fld">Precio máximo: <b>{f.maxRate ? `Bs ${f.maxRate}/h` : 'sin tope'}</b>
            <input type="range" className="range" min={25} max={65} step={5} value={f.maxRate || 65} onChange={(e) => set({ maxRate: Number(e.target.value) >= 65 ? 0 : Number(e.target.value) })} />
          </label>
          <label className="fld">Disponibilidad mínima: <b>{f.minHours ? `${f.minHours} h por semana` : 'cualquiera'}</b>
            <input type="range" className="range" min={0} max={30} step={5} value={f.minHours} onChange={(e) => set({ minHours: Number(e.target.value) })} />
          </label>
          <div className="fgroup"><span>Habilidades imprescindibles</span>
            <div className="chips">{(opp.skills || []).map((sk: string) => <button key={sk} type="button" className={'chip' + (f.must.includes(sk) ? ' on' : '')} aria-pressed={f.must.includes(sk)} onClick={() => set({ must: f.must.includes(sk) ? f.must.filter((x) => x !== sk) : [...f.must, sk] })}>{sk}</button>)}</div>
          </div>
          <label className="check"><input type="checkbox" checked={f.needExp} onChange={(e) => set({ needExp: e.target.checked })} /><span>Con experiencia previa</span></label>
          <label className="check"><input type="checkbox" checked={f.onlyApplied} onChange={(e) => set({ onlyApplied: e.target.checked })} /><span>Solo quienes postularon</span></label>
          <div className="actions"><Btn kind="quiet" onClick={() => resetFilters(opp.id)}>Restablecer filtros</Btn></div>
        </div>
      )}
      <small className="fine">Preselección automática: las {SHORT_MAX} mejores postulaciones con {Math.round(SHORT_MIN * 100)}% o más.</small>
      {rows.map(({ user: u, app, base, score, reason, src, flags, dist }) => {
        const d = pct(score) - pct(base)
        return (
          <motion.div layout transition={{ duration: 0.3 }} className="item cand" key={u.id}>
            <div className="item-top"><b>{u.name}</b>{app ? <Tag tone={tone(app.status)}>{app.status}</Tag> : <Tag>Sugerida</Tag>}</div>
            <small className="fine">{shortTitle(u.headline, 56)}</small>
            <small className="meta">{u.city}{dist !== null && dist >= 1 ? ` (${Math.round(dist)} km)` : ''} · {u.modality} · Bs {u.rate_bs}/h · {u.availability}</small>
            <div className="match"><small>Match IA <b className="num">{pct(base)}%</b></small><span className="arrow">→</span><Prox s={score} />{d !== 0 && <em className={'delta' + (d < 0 ? ' neg' : '')}>{d > 0 ? '+' : '−'}{Math.abs(d)}</em>}</div>
            {flags.length > 0 && <div className="flags">{flags.map((x) => <Tag key={x} tone="warn">{x}</Tag>)}</div>}
            <small className="why">{reason}{src === 'local' && run.source === 'ia' ? ' (estimado, la IA no lo devolvió)' : ''}</small>
            <div className="actions">
              {app && app.status !== 'aceptada' && <Btn kind="primary" onClick={() => acceptApplication(app.id)}>Aceptar y conectar</Btn>}
              {app?.status === 'aceptada' && <Tag tone="ok">Conexión formada</Tag>}
              {!app && <Btn onClick={() => useUi.getState().selectEntity('person', u.id)}>Ver perfil</Btn>}
            </div>
          </motion.div>
        )
      })}
      {!rows.length && <Empty>{f.mode === 'filtrar' && n > 0 ? 'Nadie cumple todos los filtros. Quita alguno o cambia a Recalificar.' : f.onlyApplied ? 'Aún nadie postuló. Quita "Solo quienes postularon" para ver personas cercanas.' : 'No hay personas cercanas a esta convocatoria.'}</Empty>}
    </>
  )
}
