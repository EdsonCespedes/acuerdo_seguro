import { useState } from 'react'
import { Plus } from 'lucide-react'
import branches from '../data/branches.json'
import { useCollection, upsert } from '../lib/db'
import { useUi } from '../store/ui'
import { emit } from '../store/tour'
import { Btn, Tag, Empty, Tabs } from '../design-system/ui'
import { uid, CO, fmtBs, fmtDay, shortTitle } from '../lib/util'
import { pickOpp } from './actions'
import { useTab } from './common'
import { PreBtn } from './Preseleccion'

const day = (add = 0) => new Date(Date.now() + add * 86400000).toISOString().slice(0, 10)
const list = (t: string) => t.split(/[,\n]/).map((x) => x.trim()).filter(Boolean)

function Crear() {
  const toast = useUi((s) => s.toast)
  const [f, setF] = useState({ title: '', branch: branches[0].id, specialty: '', budget: '', days: '7', modality: 'Remoto', deadline: day(14), skills: '', deliverables: '', description: '' })
  const [err, setErr] = useState('')
  const set = (k: string, v: string) => setF((x) => ({ ...x, [k]: v }))
  const publish = () => {
    const budget = Math.round(Number(f.budget) * 100), days = Number(f.days)
    if (f.title.trim().length < 4) return setErr('Escribe un título.')
    if (!(budget > 0) || !(days > 0)) return setErr('Revisa el pago y el plazo.')
    if (!list(f.skills).length || !list(f.deliverables).length) return setErr('Agrega al menos una habilidad y un entregable.')
    if (f.description.trim().length < 10) return setErr('Cuenta en una frase qué necesitas.')
    setErr('')
    const id = uid('op')
    upsert('opportunities', {
      id, branch: f.branch, specialty: f.specialty.trim() || branches.find((b) => b.id === f.branch)?.name, title: f.title.trim(), company_id: CO,
      budget_cents: budget, days, modality: f.modality, deliverables: list(f.deliverables), skills: list(f.skills), description: f.description.trim(),
      posted: day(), deadline: f.deadline, status: 'abierta',
    })
    toast('Oferta publicada'); emit('publish'); pickOpp(id)
  }
  return (
    <>
      <label className="fld">Título<input value={f.title} maxLength={60} onChange={(e) => set('title', e.target.value)} placeholder="Ej. Fotos para el menú" /></label>
      <label className="fld">Área<select value={f.branch} onChange={(e) => set('branch', e.target.value)}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      <label className="fld">Pago total (Bs)<input inputMode="decimal" value={f.budget} onChange={(e) => set('budget', e.target.value)} /></label>
      <label className="fld">Plazo (días)<input inputMode="numeric" value={f.days} onChange={(e) => set('days', e.target.value)} /></label>
      <label className="fld">Modalidad<select value={f.modality} onChange={(e) => set('modality', e.target.value)}><option>Remoto</option><option>Mixta</option><option>Presencial</option></select></label>
      <label className="fld">Cierra el<input type="date" value={f.deadline} min={day(1)} onChange={(e) => set('deadline', e.target.value)} /></label>
      <label className="fld">Habilidades (separadas por coma)<input value={f.skills} onChange={(e) => set('skills', e.target.value)} placeholder="Diseño para redes, Canva" /></label>
      <label className="fld">Entregables (separados por coma)<input value={f.deliverables} onChange={(e) => set('deliverables', e.target.value)} placeholder="5 diseños, 2 videos" /></label>
      <label className="fld">Qué necesitas<textarea rows={3} value={f.description} maxLength={160} onChange={(e) => set('description', e.target.value)} /></label>
      {err && <p className="err" role="alert">{err}</p>}
      <div className="actions"><Btn kind="primary" data-t="publish" onClick={publish}><Plus size={16} /> Publicar oferta</Btn></div>
    </>
  )
}

function Mis() {
  const opps = useCollection('opportunities').filter((o) => o.company_id === CO).sort((a, b) => b.posted.localeCompare(a.posted))
  const apps = useCollection('applications')
  if (!opps.length) return <Empty>Aún no publicaste ofertas.</Empty>
  return (
    <>
      {opps.map((o) => {
        const n = apps.filter((a) => a.opportunity_id === o.id).length, open = o.status === 'abierta'
        return (
          <div className="item" key={o.id}>
            <div className="item-top"><b>{shortTitle(o.title, 30)}</b><Tag tone={open ? 'ok' : 'neutral'}>{open ? 'Abierta' : 'Cerrada'}</Tag></div>
            <small className="fine">{fmtBs(o.budget_cents)} · {n} postulaciones · cierra {fmtDay(o.deadline)}</small>
            <div className="actions">
              <PreBtn oppId={o.id} open />
              <Btn onClick={() => pickOpp(o.id)}>Ver</Btn>
              <Btn onClick={() => upsert('opportunities', { ...o, status: open ? 'cerrada' : 'abierta' })}>{open ? 'Cerrar' : 'Reabrir'}</Btn>
            </div>
          </div>
        )
      })}
    </>
  )
}

export default function Publicar() {
  const role = useUi((s) => s.role)
  const [tab, setTab] = useTab('publicar', 'crear')
  if (role !== 'company') return <Empty>Crear ofertas es solo para empresas. Cambia de rol arriba.</Empty>
  return (
    <>
      <Tabs items={[{ id: 'crear', label: 'Crear' }, { id: 'mis', label: 'Mis ofertas' }]} value={tab} onChange={setTab} />
      {tab === 'mis' ? <Mis /> : <Crear />}
    </>
  )
}
