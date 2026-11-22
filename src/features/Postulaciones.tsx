import { useCollection } from '../lib/db'
import { useUi } from '../store/ui'
import { Btn, Tag, Empty, Tabs } from '../design-system/ui'
import { fmtBs, fmtDay, ME, CO, shortTitle } from '../lib/util'
import { pickOpp, toggleSave, simulateAccept } from './actions'
import { Candidatos } from './Preseleccion'
import { useTab } from './common'

const tone = (s: string) => (s === 'preseleccionada' || s === 'aceptada' ? 'ok' : s === 'en revisión' ? 'cyan' : 'neutral') as 'ok' | 'cyan' | 'neutral'

function Enviadas() {
  const apps = useCollection('applications').filter((a) => a.worker_id === ME)
  const opps = useCollection('opportunities'); const users = useCollection('users')
  if (!apps.length) return <Empty>Aún no te postulaste a ninguna convocatoria.</Empty>
  return (
    <>
      {apps.slice().reverse().map((a) => {
        const o = opps.find((x) => x.id === a.opportunity_id)
        if (!o) return null
        return (
          <div className="item" key={a.id}>
            <button className="line" onClick={() => pickOpp(o.id)}>
              <span><b>{o.title}</b><small>{users.find((u) => u.id === o.company_id)?.name} · enviada {fmtDay(a.createdAt)}</small></span>
              <Tag tone={tone(a.status)}>{a.status}</Tag>
            </button>
            {a.status === 'aceptada'
              ? <small className="fine">Conexión formada: la verás brillar en la escena.</small>
              : <div className="actions"><Btn kind="quiet" onClick={() => simulateAccept(a.id)}>Demo: la empresa acepta</Btn></div>}
          </div>
        )
      })}
    </>
  )
}

function Guardadas() {
  const saved = useCollection('saved').filter((s) => s.user_id === ME)
  const opps = useCollection('opportunities'); const users = useCollection('users')
  if (!saved.length) return <Empty>No guardaste convocatorias.</Empty>
  return (
    <>
      {saved.map((s) => {
        const o = opps.find((x) => x.id === s.opportunity_id)
        if (!o) return null
        return (
          <div className="item" key={s.id}>
            <button className="line" onClick={() => pickOpp(o.id)}>
              <span><b>{o.title}</b><small>{users.find((u) => u.id === o.company_id)?.name}</small></span>
              <b className="num">{fmtBs(o.budget_cents)}</b>
            </button>
            <div className="actions"><Btn onClick={() => toggleSave(o.id)}>Quitar</Btn></div>
          </div>
        )
      })}
    </>
  )
}

function Recibidas() {
  const apps = useCollection('applications')
  const opps = useCollection('opportunities').filter((o) => o.company_id === CO)
  const groups = opps.map((o) => ({ o, n: apps.filter((a) => a.opportunity_id === o.id).length })).filter((g) => g.n > 0)
  if (!groups.length) return <Empty>Aún no recibiste postulaciones.</Empty>
  return <>{groups.map(({ o, n }) => <Candidatos key={o.id} opp={o} title={`${shortTitle(o.title, 30)} (${n})`} />)}</>
}

export default function Postulaciones() {
  const role = useUi((s) => s.role)
  const [tab, setTab] = useTab('postulaciones', 'enviadas')
  if (role === 'company') return <><Tabs items={[{ id: 'recibidas', label: 'Recibidas' }]} value="recibidas" onChange={() => {}} /><Recibidas /></>
  const t = tab === 'guardadas' ? 'guardadas' : 'enviadas'
  return (
    <>
      <Tabs items={[{ id: 'enviadas', label: 'Enviadas' }, { id: 'guardadas', label: 'Guardadas' }]} value={t} onChange={setTab} />
      {t === 'enviadas' ? <Enviadas /> : <Guardadas />}
    </>
  )
}
