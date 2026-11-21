import { RotateCcw } from 'lucide-react'
import { upsert, useCollection, useRecord, resetData } from '../lib/db'
import { useUi } from '../store/ui'
import { Btn, Row, Section, Tag, Tabs } from '../design-system/ui'
import { ME, CO, ROLE_LABEL, fmtDate, nowIso } from '../lib/util'
import { useTab } from './common'

function Datos() {
  const role = useUi((s) => s.role)
  const toast = useUi((s) => s.toast)
  const u = useRecord('users', role === 'worker' ? ME : CO)
  if (!u) return null
  return (
    <>
      <Row label="Nombre">{u.name}</Row>
      <Row label="Tipo de cuenta"><Tag tone="cyan">{ROLE_LABEL[role]}</Tag></Row>
      <Row label="Ciudad">{u.city}</Row>
      <Row label="Miembro desde">{fmtDate(u.since + 'T12:00:00-04:00')}</Row>
      <div className="actions"><Btn kind="danger" onClick={() => { resetData(); toast('Datos restablecidos') }}><RotateCcw size={16} /> Restablecer datos</Btn></div>
    </>
  )
}

function Privacidad() {
  const cons = useCollection('consents'); const state = useCollection('consents_state')
  const on = (c: any) => state.find((s) => s.id === c.id)?.on ?? c.default
  return (
    <Section title="Permisos">
      {cons.map((c) => (
        <label className="check" key={c.id}>
          <input type="checkbox" checked={!!on(c)} disabled={c.required} onChange={(e) => upsert('consents_state', { id: c.id, on: e.target.checked, at: nowIso() })} />
          <span>{c.label}{c.required && <Tag tone="warn">requerido</Tag>}</span>
        </label>
      ))}
    </Section>
  )
}

export default function Cuenta() {
  const [tab, setTab] = useTab('cuenta', 'datos')
  return (
    <>
      <Tabs items={[{ id: 'datos', label: 'Cuenta' }, { id: 'privacidad', label: 'Privacidad' }]} value={tab} onChange={setTab} />
      {tab === 'datos' ? <Datos /> : <Privacidad />}
    </>
  )
}
