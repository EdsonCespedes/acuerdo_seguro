import { Bookmark, BookmarkCheck, Send } from 'lucide-react'
import branches from '../data/branches.json'
import { useCollection, useRecord, upsert } from '../lib/db'
import { useUi } from '../store/ui'
import { Btn, Row, Section, Tag, Empty } from '../design-system/ui'
import { fmtBs, fmtDay, leftLabel, ME } from '../lib/util'
import { applyTo, toggleSave, acceptApplication } from './actions'

export default function Opportunity({ id }: { id: string }) {
  const o = useRecord('opportunities', id)
  const role = useUi((s) => s.role)
  const apps = useCollection('applications').filter((a) => a.opportunity_id === id)
  const users = useCollection('users')
  const saved = !!useRecord('saved', 'sv_' + id)
  if (!o) return <Empty>Esta convocatoria ya no existe.</Empty>
  const co = users.find((u) => u.id === o.company_id)
  const me = users.find((u) => u.id === ME)
  const b = branches.find((x) => x.id === o.branch)
  const applied = apps.some((a) => a.worker_id === ME)
  const connected = apps.some((a) => a.worker_id === ME && a.status === 'aceptada')
  const have = new Set((me?.skills || []).map((s: string) => s.toLowerCase()))
  const hits = o.skills.filter((s: string) => have.has(s.toLowerCase())).length
  return (
    <>
      <p className="lead-text">{o.description}</p>
      <Row label="Empresa">{co?.name}</Row>
      <Row label="Rubro">{co?.rubro} · {co?.city}</Row>
      <Row label="Área">{b?.name} · {o.specialty}</Row>
      <Row label="Pago"><b className="num">{fmtBs(o.budget_cents)}</b></Row>
      <Row label="Plazo"><span className="num">{o.days} días</span> · {o.modality}</Row>
      <Row label="Cierre">{fmtDay(o.deadline)} · {leftLabel(o.deadline)}</Row>
      <Section title="Entregables"><ul className="plain">{o.deliverables.map((d: string) => <li key={d}>{d}</li>)}</ul></Section>
      <Section title="Habilidades">
        <div className="chips">{o.skills.map((s: string) => <Tag key={s} tone={role === 'worker' && have.has(s.toLowerCase()) ? 'ok' : 'cyan'}>{s}</Tag>)}</div>
        {role === 'worker' && <small className="fine">Coincides en {hits} de {o.skills.length}</small>}
      </Section>
      {role === 'worker' && connected && <div className="actions"><Tag tone="ok">Conexión formada con {co?.name}</Tag></div>}
      {role === 'worker' && (
        <div className="actions">
          <Btn kind="primary" data-t="apply" onClick={() => applyTo(id)} disabled={applied}><Send size={16} /> {applied ? 'Postulación enviada' : 'Postularme'}</Btn>
          <Btn onClick={() => toggleSave(id)}>{saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />} {saved ? 'Guardada' : 'Guardar'}</Btn>
        </div>
      )}
      {role === 'company' && (
        <Section title={`Postulaciones (${apps.length})`}>
          {apps.length ? apps.map((a) => {
            const w = users.find((u) => u.id === a.worker_id)
            return (
              <div className="item" key={a.id}>
                <div className="item-top"><b>{w?.name}</b><Tag tone={a.status === 'preseleccionada' || a.status === 'aceptada' ? 'ok' : 'neutral'}>{a.status}</Tag></div>
                <small className="fine">{w?.headline}</small>
                {a.status !== 'aceptada' && <div className="actions">{a.status !== 'preseleccionada' && <Btn onClick={() => upsert('applications', { ...a, status: 'preseleccionada' })}>Preseleccionar</Btn>}<Btn kind="primary" onClick={() => acceptApplication(a.id)}>Aceptar y conectar</Btn></div>}
              </div>
            )
          }) : <Empty>Aún no hay postulaciones.</Empty>}
        </Section>
      )}
    </>
  )
}
