import { useState } from 'react'
import { Copy, Sparkles, Trash2 } from 'lucide-react'
import { useCollection, useRecord, upsert, remove } from '../lib/db'
import { useUi } from '../store/ui'
import { emit } from '../store/tour'
import { Btn, Section, Tag, Empty, Tabs } from '../design-system/ui'
import { uid, nowIso, ME, CO, fmtDay, shortTitle } from '../lib/util'
import { usePre } from '../store/pre'
import { PreBtn } from './Preseleccion'
import { askAi, aiReady } from '../lib/ai'
import { CV_SYSTEM, cvPrompt, cvLocal } from '../lib/cv'
import { useTab } from './common'

const copy = (t: string, toast: (m: string) => void) => { navigator.clipboard?.writeText(t); toast('Copiado') }

function Generar() {
  const me = useRecord('users', ME)
  const ev = useCollection('evidence').filter((e) => e.user_id === ME)
  const opps = useCollection('opportunities')
  const users = useCollection('users')
  const toast = useUi((s) => s.toast)
  const [target, setTarget] = useState('')
  const [extra, setExtra] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  if (!me) return null
  const opp = opps.find((o) => o.id === target) ?? null
  const run = async () => {
    setBusy(true); setSaved(false)
    let out = ''
    try {
      out = await askAi(CV_SYSTEM, cvPrompt(me, ev, opp, extra))
    } catch {
      out = cvLocal(me, ev, opp, extra)
      toast(aiReady ? 'La IA no respondió, se usó la versión básica' : 'Falta la clave de IA, se usó la versión básica', 'warn')
    }
    setText(out); setBusy(false); emit('cv')
  }
  const save = () => {
    upsert('cvs', { id: uid('cv'), user_id: ME, title: opp ? `CV para ${opp.title}` : 'CV general', text, createdAt: nowIso() })
    setSaved(true); toast('CV guardado')
  }
  return (
    <>
      <label className="fld">Para qué convocatoria
        <select value={target} onChange={(e) => setTarget(e.target.value)}>
          <option value="">CV general</option>
          {opps.map((o) => <option key={o.id} value={o.id}>{o.title} · {users.find((u) => u.id === o.company_id)?.name}</option>)}
        </select>
      </label>
      <label className="fld">Algo más que quieras incluir<textarea rows={2} value={extra} onChange={(e) => setExtra(e.target.value)} /></label>
      {!aiReady && <Tag tone="warn">Sin clave de IA: versión básica</Tag>}
      <div className="actions"><Btn kind="primary" data-t="cv" disabled={busy} onClick={run}><Sparkles size={16} /> {busy ? 'Generando…' : 'Generar'}</Btn></div>
      {text && (
        <>
          <pre className="cv">{text}</pre>
          <div className="actions">
            <Btn onClick={() => copy(text, toast)}><Copy size={16} /> Copiar</Btn>
            <Btn onClick={save} disabled={saved}>{saved ? 'Guardado' : 'Guardar'}</Btn>
          </div>
        </>
      )}
    </>
  )
}

function Mis() {
  const cvs = useCollection('cvs').filter((c) => c.user_id === ME)
  const toast = useUi((s) => s.toast)
  const [open, setOpen] = useState<string | null>(null)
  if (!cvs.length) return <Empty>Aún no guardaste ningún CV.</Empty>
  return (
    <Section title="CV guardados">
      {cvs.slice().reverse().map((c) => (
        <div className="item" key={c.id}>
          <div className="item-top"><b>{c.title}</b><small>{fmtDay(c.createdAt)}</small></div>
          {open === c.id && <pre className="cv">{c.text}</pre>}
          <div className="actions">
            <Btn onClick={() => setOpen(open === c.id ? null : c.id)}>{open === c.id ? 'Ocultar' : 'Ver'}</Btn>
            <Btn onClick={() => copy(c.text, toast)}><Copy size={16} /> Copiar</Btn>
            <button className="icon-btn" aria-label="Borrar" onClick={() => remove('cvs', c.id)}><Trash2 size={16} /></button>
          </div>
        </div>
      ))}
    </Section>
  )
}

function Preseleccion() {
  const opps = useCollection('opportunities').filter((o) => o.company_id === CO)
  const apps = useCollection('applications')
  const runs = usePre((s) => s.runs)
  if (!opps.length) return <Empty>Aún no publicaste ofertas.</Empty>
  return (
    <Section title="Tus convocatorias">
      {opps.map((o) => {
        const n = apps.filter((a) => a.opportunity_id === o.id).length
        return (
          <div className="item" key={o.id}>
            <div className="item-top"><b>{shortTitle(o.title, 34)}</b>{runs[o.id] ? <Tag tone="ok">Analizada</Tag> : <Tag>{n} postulante{n === 1 ? '' : 's'}</Tag>}</div>
            <div className="actions"><PreBtn oppId={o.id} open /></div>
          </div>
        )
      })}
    </Section>
  )
}

export default function Cv() {
  const role = useUi((s) => s.role)
  const [tab, setTab] = useTab('cv', 'generar')
  if (role === 'company') return <><Tabs items={[{ id: 'pre', label: 'Preselección' }]} value="pre" onChange={() => {}} /><Preseleccion /></>
  return (
    <>
      <Tabs items={[{ id: 'generar', label: 'Generar' }, { id: 'mis', label: 'Mis CV' }]} value={tab} onChange={setTab} />
      {tab === 'generar' ? <Generar /> : <Mis />}
    </>
  )
}
