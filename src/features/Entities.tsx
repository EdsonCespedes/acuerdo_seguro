import { useCollection } from '../lib/db'
import { Btn, Row, Section, Tag, Empty } from '../design-system/ui'
import { CO, ME, fmtBs, shortOf } from '../lib/util'
import { companyRanking, oppScore, pct } from '../lib/match'
import { pickOpp, acceptApplication } from './actions'

export function Prox({ s }: { s: number }) {
  return <span className="prox" title="Cercanía">{pct(s)}%<i style={{ ['--w' as any]: pct(s) + '%' }} /></span>
}

export function Empresa({ id }: { id: string }) {
  const users = useCollection('users'); const opps = useCollection('opportunities')
  const co = users.find((u) => u.id === id)
  const r = companyRanking(users.find((u) => u.id === ME), opps, users).find((x) => x.company.id === id)
  if (!co || !r) return <Empty>Esta empresa ya no existe.</Empty>
  return (
    <>
      <p className="lead-text">{co.description}</p>
      <Row label="Rubro">{co.rubro} · {co.city}</Row>
      <Row label="Cercanía a tu perfil"><Prox s={r.score} /></Row>
      <Section title={`Publicaciones (${r.opps.length})`}>
        {r.opps.map((x) => (
          <button className="line" key={x.opp.id} onClick={() => pickOpp(x.opp.id)}>
            <span><b>{x.opp.title}</b><small>{shortOf(x.opp)} · {fmtBs(x.opp.budget_cents)}</small></span>
            <Prox s={x.score} />
          </button>
        ))}
      </Section>
    </>
  )
}

export function Persona({ id }: { id: string }) {
  const users = useCollection('users'); const opps = useCollection('opportunities'); const apps = useCollection('applications')
  const w = users.find((u) => u.id === id)
  if (!w) return <Empty>Esta persona ya no existe.</Empty>
  const mine = opps.filter((o) => o.company_id === CO).map((o) => ({ o, s: oppScore(w, o) })).sort((a, b) => b.s - a.s)
  return (
    <>
      <p className="lead-text">{w.headline}</p>
      <Row label="Ciudad">{w.city}</Row>
      <Row label="Disponibilidad">{w.availability} · {w.modality}</Row>
      <Row label="Tarifa"><span className="num">Bs {w.rate_bs}</span> por hora</Row>
      <Section title="Habilidades"><div className="chips">{(w.skills || []).map((s: string) => <Tag key={s} tone="cyan">{s}</Tag>)}</div></Section>
      <Section title="Cercanía a tus publicaciones">
        {mine.map(({ o, s }) => {
          const a = apps.find((x) => x.worker_id === id && x.opportunity_id === o.id)
          return (
            <div className="item" key={o.id}>
              <button className="line" onClick={() => pickOpp(o.id)}><span><b>{o.title}</b><small>{a ? 'Postuló · ' + a.status : 'No ha postulado'}</small></span><Prox s={s} /></button>
              {a && a.status !== 'aceptada' && <div className="actions"><Btn kind="primary" onClick={() => acceptApplication(a.id)}>Aceptar y conectar</Btn></div>}
              {a?.status === 'aceptada' && <div className="actions"><Tag tone="ok">Conexión formada</Tag></div>}
            </div>
          )
        })}
      </Section>
    </>
  )
}
