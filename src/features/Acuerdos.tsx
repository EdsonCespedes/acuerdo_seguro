import { useState } from 'react'
import { motion } from 'motion/react'
import { Check } from 'lucide-react'
import { upsert, useCollection } from '../lib/db'
import { useUi } from '../store/ui'
import { emit } from '../store/tour'
import { Btn, Row, Section, Tag, Empty, Tabs, dur } from '../design-system/ui'
import { fmtBs, fmtDate, fmtDateTime, nowIso } from '../lib/util'
import { latest, semaforo, balance, newVersion, acceptVersion, isBilateral, canDeliver, DelState } from '../lib/rules'
import { AgPicker, useAg, useTab } from './common'

export const DEL_LABEL: Record<string, string> = { pendiente: 'Pendiente', entregado: 'Entregado', en_revision: 'En revisión', cambios_solicitados: 'Cambios pedidos', aprobado: 'Aprobado' }
const partyOf = (role: string) => (role === 'company' ? 'company' : 'worker')
const SEM = { rojo: 'Falta: ', amarillo: 'Conviene agregar: ', verde: 'Acuerdo completo' }

function Detalle() {
  const ag = useAg(); const v = latest(ag); const sem = semaforo(v)
  const role = useUi((s) => s.role); const toast = useUi((s) => s.toast)
  const party = partyOf(role)
  const [edit, setEdit] = useState<{ total: string; advance: string; days: string } | null>(null)
  const [err, setErr] = useState('')
  const closed = ag.status === 'cerrado'
  const accept = () => {
    try { upsert('agreements', acceptVersion(ag, v.v, party as any)); toast(`Versión ${v.v} aceptada`); emit('accept') } catch (e: any) { toast(e.message, 'err') }
  }
  const saveEdit = () => {
    const total = Math.round(Number(edit!.total) * 100), adv = Math.round(Number(edit!.advance) * 100), days = Number(edit!.days)
    if (!(total > 0) || !(days > 0) || adv < 0 || adv > total) return setErr('Revisa el total, el anticipo y el plazo.')
    setErr(''); upsert('agreements', newVersion(ag, { total_cents: total, advance_cents: adv, days }, nowIso()))
    setEdit(null); toast(`Versión ${v.v + 1} creada. Falta aceptarla.`, 'warn')
  }
  return (
    <motion.div key={ag.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: dur.base }}>
      <h3 className="h-ag">{ag.title}</h3>
      <div className={'light light-' + sem.level} role="status">
        <i className="dot" />
        <div><b>{sem.level === 'verde' ? SEM.verde : SEM[sem.level] + (sem.level === 'rojo' ? sem.red : sem.yellow).join(', ')}</b></div>
      </div>
      <Row label="Versión"><b className="num">v{v.v}</b> · {fmtDate(v.createdAt)}</Row>
      <Row label="Alcance">{v.scope}</Row>
      <Row label="Entregables">{v.deliverables.map((d) => `${d.qty} ${d.kind.toLowerCase()}${d.qty > 1 ? 's' : ''}`).join(' · ')}</Row>
      <Row label="Total"><b className="num">{fmtBs(v.total_cents)}</b></Row>
      <Row label="Anticipo / saldo"><span className="num">{fmtBs(v.advance_cents)} / {fmtBs(balance(v))}</span></Row>
      <Row label="Plazo"><span className="num">{v.days} días</span></Row>
      <Row label="Revisiones">{v.revisions ?? '—'}</Row>
      <Row label="Aceptación">
        <Tag tone={v.acceptedBy.includes('company') ? 'ok' : 'neutral'}>Empresa</Tag> <Tag tone={v.acceptedBy.includes('worker') ? 'ok' : 'neutral'}>Trabajador</Tag>
      </Row>
      {isBilateral(v) && <p className="ok-line"><Check size={16} /> Aceptada por ambas partes</p>}
      {closed ? <p className="fine">Acuerdo cerrado.</p> : edit ? (
        <Section title="Nueva versión">
          <label className="fld">Total (Bs)<input inputMode="decimal" value={edit.total} onChange={(e) => setEdit({ ...edit, total: e.target.value })} /></label>
          <label className="fld">Anticipo (Bs)<input inputMode="decimal" value={edit.advance} onChange={(e) => setEdit({ ...edit, advance: e.target.value })} /></label>
          <label className="fld">Plazo (días)<input inputMode="numeric" value={edit.days} onChange={(e) => setEdit({ ...edit, days: e.target.value })} /></label>
          {err && <p className="err" role="alert">{err}</p>}
          <div className="actions"><Btn kind="primary" onClick={saveEdit}>Crear versión {v.v + 1}</Btn><Btn onClick={() => setEdit(null)}>Cancelar</Btn></div>
        </Section>
      ) : (
        <div className="actions">
          <Btn kind="primary" data-t="accept" disabled={v.acceptedBy.includes(party) || sem.level === 'rojo'} onClick={accept}>{v.acceptedBy.includes(party) ? 'Ya aceptaste' : `Aceptar v${v.v}`}</Btn>
          <Btn onClick={() => setEdit({ total: String(v.total_cents / 100), advance: String(v.advance_cents / 100), days: String(v.days) })}>Proponer cambios</Btn>
        </div>
      )}
    </motion.div>
  )
}

function Entregables() {
  const ag = useAg(); const bilateral = isBilateral(latest(ag))
  const dels = useCollection('deliverables').filter((d) => d.agreement_id === ag.id)
  const role = useUi((s) => s.role); const toast = useUi((s) => s.toast)
  const move = (d: any, to: DelState) => {
    upsert('deliverables', { ...d, state: to, history: [...d.history, { from: d.state, to, by: role, at: nowIso() }] })
    toast(DEL_LABEL[to]); if (to === 'entregado') emit('deliver')
  }
  const NEXT: DelState[] = ['entregado', 'en_revision', 'aprobado', 'cambios_solicitados']
  const LABEL: Record<string, string> = { entregado: 'Marcar entregado', en_revision: 'Revisar', aprobado: 'Aprobar', cambios_solicitados: 'Pedir cambios' }
  return (
    <>
      {!bilateral && <p className="fine">Se activan cuando ambas partes aceptan la versión.</p>}
      {dels.map((d) => (
        <div className="item" key={d.id}>
          <div className="item-top"><b>{d.title}</b><Tag tone={d.state === 'aprobado' ? 'ok' : d.state === 'cambios_solicitados' ? 'warn' : 'neutral'}>{DEL_LABEL[d.state]}</Tag></div>
          {bilateral && <div className="actions">{NEXT.filter((to) => canDeliver(role, d.state, to)).map((to) => <Btn key={to} data-t={to === 'entregado' ? 'deliver' : undefined} onClick={() => move(d, to)}>{LABEL[to]}</Btn>)}</div>}
          {d.history.length > 0 && <small className="hist">{d.history.map((h: any) => `${DEL_LABEL[h.to]} · ${fmtDateTime(h.at)}`).join(' → ')}</small>}
        </div>
      ))}
    </>
  )
}

function Versiones() {
  const ag = useAg()
  return (
    <>
      {ag.versions.slice().reverse().map((x: any) => (
        <Row key={x.v} label={`v${x.v} · ${fmtDate(x.createdAt)}`}>{fmtBs(x.total_cents)} · {x.days} días · {x.acceptedBy.length ? 'aceptada por ' + x.acceptedBy.map((p: string) => (p === 'company' ? 'empresa' : 'trabajador')).join(' y ') : 'sin aceptar'}</Row>
      ))}
    </>
  )
}

export default function Acuerdos() {
  const [tab, setTab] = useTab('acuerdos', 'acuerdo')
  const ags = useCollection('agreements')
  if (!ags.length) return <Empty>Aún no tienes acuerdos.</Empty>
  return (
    <>
      <AgPicker />
      <Tabs items={[{ id: 'acuerdo', label: 'Acuerdo' }, { id: 'entregables', label: 'Entregables' }, { id: 'versiones', label: 'Versiones' }]} value={tab} onChange={setTab} />
      {tab === 'acuerdo' ? <Detalle /> : tab === 'entregables' ? <Entregables /> : <Versiones />}
    </>
  )
}
