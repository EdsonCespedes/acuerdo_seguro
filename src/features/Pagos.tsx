import { upsert, useCollection } from '../lib/db'
import { useUi } from '../store/ui'
import { emit } from '../store/tour'
import { Btn, Row, Section, Tag, Tabs } from '../design-system/ui'
import { fmtBs, fmtDay, nowIso } from '../lib/util'
import { latest, isBilateral, effectiveState, canPay, reconcile, PayState } from '../lib/rules'
import { AgPicker, useAg, useTab } from './common'

const PAY_LABEL: Record<string, string> = { programado: 'Programado', pendiente: 'Pendiente', vencido: 'Vencido', reportado_pagador: 'Pago reportado', confirmado_receptor: 'Confirmado', verificado_proveedor: 'Verificado', en_controversia: 'En disputa' }

function Resumen() {
  const ag = useAg(); const v = latest(ag)
  const pays = useCollection('payments').filter((p) => p.agreement_id === ag.id)
  const rec = reconcile(v.total_cents, pays)
  const sumBy = (s: string) => pays.filter((p) => effectiveState(p) === s).reduce((a, p) => a + p.amount_cents, 0)
  return (
    <>
      <Row label="Total del acuerdo"><b className="num">{fmtBs(v.total_cents)}</b></Row>
      <Row label="Pagos suman el total">{rec.ok ? <Tag tone="ok">Sí</Tag> : <Tag tone="err">Diferencia {fmtBs(rec.diff)}</Tag>}</Row>
      <Row label="Confirmado"><span className="num">{fmtBs(sumBy('confirmado_receptor'))}</span></Row>
      <Row label="Reportado sin confirmar"><span className="num">{fmtBs(sumBy('reportado_pagador'))}</span></Row>
      <Row label="Por pagar"><span className="num">{fmtBs(sumBy('programado') + sumBy('pendiente'))}</span></Row>
      <Row label="Vencido"><span className="num">{fmtBs(sumBy('vencido'))}</span></Row>
    </>
  )
}

function Lista() {
  const ag = useAg(); const bil = isBilateral(latest(ag))
  const pays = useCollection('payments').filter((p) => p.agreement_id === ag.id)
  const role = useUi((s) => s.role); const toast = useUi((s) => s.toast)
  const move = (p: any, to: PayState) => {
    if (!bil) return toast('Primero ambas partes deben aceptar el acuerdo', 'warn')
    upsert('payments', { ...p, state: to, history: [...p.history, { from: p.state, to, by: role, at: nowIso() }] })
    toast(PAY_LABEL[to]); if (to === 'reportado_pagador') emit('pay')
  }
  return (
    <Section title="Pagos">
      {pays.map((p) => {
        const st = effectiveState(p)
        return (
          <div className="item" key={p.id}>
            <div className="item-top"><b>{p.kind} · <span className="num">{fmtBs(p.amount_cents)}</span></b><Tag tone={st === 'confirmado_receptor' ? 'ok' : st === 'vencido' || st === 'en_controversia' ? 'err' : st === 'reportado_pagador' ? 'warn' : 'neutral'}>{PAY_LABEL[st]}</Tag></div>
            <small className="fine">Vence {fmtDay(p.due)}</small>
            <div className="actions">
              {canPay(role, st, 'reportado_pagador') && <Btn data-t="pay" onClick={() => move(p, 'reportado_pagador')}>Reportar pago</Btn>}
              {canPay(role, st, 'confirmado_receptor') && <Btn kind="primary" onClick={() => move(p, 'confirmado_receptor')}>Confirmar recibido</Btn>}
              {canPay(role, st, 'en_controversia') && <Btn kind="danger" onClick={() => move(p, 'en_controversia')}>Abrir disputa</Btn>}
            </div>
          </div>
        )
      })}
    </Section>
  )
}

export default function Pagos() {
  const [tab, setTab] = useTab('pagos', 'resumen')
  return (
    <>
      <AgPicker />
      <Tabs items={[{ id: 'resumen', label: 'Resumen' }, { id: 'pagos', label: 'Pagos' }]} value={tab} onChange={setTab} />
      {tab === 'resumen' ? <Resumen /> : <Lista />}
    </>
  )
}
