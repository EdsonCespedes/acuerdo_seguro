import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useCollection, useRecord, upsert, remove } from '../lib/db'
import { useUi } from '../store/ui'
import { emit } from '../store/tour'
import { Btn, Row, Section, Tag, Empty, Tabs } from '../design-system/ui'
import { uid, nowIso, ME, CO, fmtDay } from '../lib/util'
import { useTab } from './common'

const list = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean)

function Datos() {
  const role = useUi((s) => s.role)
  const toast = useUi((s) => s.toast)
  const u = useRecord('users', role === 'worker' ? ME : CO)
  const [f, setF] = useState<any>(null)
  const [err, setErr] = useState('')
  if (!u) return null
  const cur = f && f.id === u.id ? f : { ...u, skills_txt: (u.skills || []).join(', '), tools_txt: (u.tools || []).join(', '), exp_txt: (u.experience || []).join('\n') }
  const set = (k: string, v: any) => setF({ ...cur, [k]: v })
  const save = () => {
    if (!cur.name?.trim()) return setErr('Escribe un nombre.')
    if (role === 'worker' && !cur.headline?.trim()) return setErr('Escribe tu titular.')
    setErr('')
    const rec = { ...cur }
    delete rec.skills_txt; delete rec.tools_txt; delete rec.exp_txt
    if (role === 'worker') {
      rec.skills = list(cur.skills_txt); rec.tools = list(cur.tools_txt)
      rec.experience = cur.exp_txt.split('\n').map((x: string) => x.trim()).filter(Boolean)
      rec.rate_bs = Number(cur.rate_bs) || 0
    }
    upsert('users', rec); toast('Perfil guardado'); emit('save')
  }
  return (
    <>
      <label className="fld">{role === 'worker' ? 'Nombre' : 'Nombre comercial'}<input value={cur.name || ''} onChange={(e) => set('name', e.target.value)} /></label>
      {role === 'worker' ? (<>
        <label className="fld">Titular<input value={cur.headline || ''} onChange={(e) => set('headline', e.target.value)} /></label>
        <label className="fld">Ciudad<select value={cur.city || 'Cochabamba'} onChange={(e) => set('city', e.target.value)}>{['Cochabamba', 'Sacaba', 'Quillacollo', 'Tiquipaya', 'Vinto'].map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="fld">Género<select value={cur.gender || ''} onChange={(e) => set('gender', e.target.value)}><option value="mujer">Mujer</option><option value="varón">Varón</option><option value="">Prefiero no indicar</option></select></label>
        <label className="fld">Habilidades (separadas por coma)<input value={cur.skills_txt} onChange={(e) => set('skills_txt', e.target.value)} /></label>
        <label className="fld">Herramientas<input value={cur.tools_txt} onChange={(e) => set('tools_txt', e.target.value)} /></label>
        <label className="fld">Experiencia (una por línea)<textarea rows={3} value={cur.exp_txt} onChange={(e) => set('exp_txt', e.target.value)} /></label>
        <label className="fld">Disponibilidad<input value={cur.availability || ''} onChange={(e) => set('availability', e.target.value)} /></label>
        <label className="fld">Modalidad<select value={cur.modality} onChange={(e) => set('modality', e.target.value)}><option>Remoto</option><option>Presencial</option><option>Mixta</option></select></label>
        <label className="fld">Tarifa por hora (Bs)<input inputMode="numeric" value={cur.rate_bs ?? ''} onChange={(e) => set('rate_bs', e.target.value.replace(/\D/g, ''))} /></label>
      </>) : (<>
        <label className="fld">Rubro<input value={cur.rubro || ''} onChange={(e) => set('rubro', e.target.value)} /></label>
        <label className="fld">Ciudad<input value={cur.city || ''} onChange={(e) => set('city', e.target.value)} /></label>
        <label className="fld">Descripción<textarea rows={3} value={cur.description || ''} onChange={(e) => set('description', e.target.value)} /></label>
      </>)}
      {err && <p className="err" role="alert">{err}</p>}
      <div className="actions"><Btn kind="primary" data-t="save" onClick={save}>Guardar</Btn></div>
    </>
  )
}

function Portafolio() {
  const items = useCollection('evidence').filter((e) => e.user_id === ME)
  const toast = useUi((s) => s.toast)
  const [t, setT] = useState(''); const [u, setU] = useState(''); const [k, setK] = useState('Diseño'); const [err, setErr] = useState('')
  const add = () => {
    if (!t.trim()) return setErr('Ponle un título.')
    if (u && !/^https?:\/\//i.test(u)) return setErr('El enlace debe empezar con https://')
    setErr(''); upsert('evidence', { id: uid('ev'), user_id: ME, title: t.trim(), url: u.trim(), kind: k, createdAt: nowIso() })
    setT(''); setU(''); toast('Trabajo agregado'); emit('evidence')
  }
  return (
    <>
      <Section title="Agregar trabajo">
        <label className="fld">Título<input value={t} onChange={(e) => setT(e.target.value)} /></label>
        <label className="fld">Enlace (opcional)<input value={u} onChange={(e) => setU(e.target.value)} placeholder="https://" /></label>
        <label className="fld">Tipo<select value={k} onChange={(e) => setK(e.target.value)}><option>Diseño</option><option>Video</option><option>Texto</option><option>Otro</option></select></label>
        {err && <p className="err" role="alert">{err}</p>}
        <div className="actions"><Btn kind="primary" data-t="evidence" onClick={add}>Agregar</Btn></div>
      </Section>
      <Section title="Tu portafolio">
        {items.length ? items.map((e) => (
          <div className="row" key={e.id}>
            <span className="row-v left"><b>{e.title}</b><br /><small>{e.kind} · {fmtDay(e.createdAt)}{e.url && <> · <a href={e.url} target="_blank" rel="noreferrer">ver</a></>}</small></span>
            <button className="icon-btn" aria-label="Quitar" onClick={() => remove('evidence', e.id)}><Trash2 size={16} /></button>
          </div>
        )) : <Empty>Aún no hay trabajos.</Empty>}
      </Section>
    </>
  )
}

function Trayectoria() {
  const ags = useCollection('agreements').filter((a) => a.worker_id === ME)
  const ids = new Set(ags.map((a) => a.id))
  const dels = useCollection('deliverables').filter((d) => ids.has(d.agreement_id))
  const pays = useCollection('payments').filter((p) => ids.has(p.agreement_id))
  const ev = useCollection('evidence').filter((e) => e.user_id === ME)
  const apps = useCollection('applications').filter((a) => a.worker_id === ME)
  const ok = dels.filter((d) => d.state === 'aprobado').length
  const conf = pays.filter((p) => p.state === 'confirmado_receptor').length
  return (
    <>
      <Row label="Acuerdos cerrados"><b className="num">{ags.filter((a) => a.status === 'cerrado').length}</b> de {ags.length}</Row>
      <Row label="Entregables aprobados"><b className="num">{ok}</b> de {dels.length}</Row>
      <Row label="Pagos confirmados"><b className="num">{conf}</b> de {pays.length}</Row>
      <Row label="Postulaciones"><b className="num">{apps.length}</b></Row>
      <Row label="Trabajos en portafolio"><b className="num">{ev.length}</b></Row>
    </>
  )
}

export default function Perfil() {
  const role = useUi((s) => s.role)
  const [tab, setTab] = useTab('perfil', 'datos')
  const items = role === 'worker' ? [{ id: 'datos', label: 'Datos' }, { id: 'portafolio', label: 'Portafolio' }, { id: 'trayectoria', label: 'Trayectoria' }] : [{ id: 'datos', label: 'Datos' }]
  const t = items.some((i) => i.id === tab) ? tab : 'datos'
  return (
    <>
      <Tabs items={items} value={t} onChange={setTab} />
      {role === 'company' && <Tag tone="cyan">Empresa</Tag>}
      {t === 'datos' ? <Datos /> : t === 'portafolio' ? <Portafolio /> : <Trayectoria />}
    </>
  )
}
