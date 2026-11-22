import { describe, it, expect, vi, beforeEach } from 'vitest'

const ask = vi.fn()
vi.mock('../src/lib/ai', () => ({ aiReady: true, askAi: (...a: any[]) => ask(...a) }))

import { all, resetData } from '../src/lib/db'
import { usePre, runPreselection, syncShortlist } from '../src/store/pre'
import { recalify, shortlist, PRE_DEFAULT } from '../src/lib/preselect'

const opp = () => {
  const apps = all('applications')
  const id = [...new Set(apps.map((a) => a.opportunity_id))].find((o) => apps.filter((a) => a.opportunity_id === o && a.status !== 'aceptada').length >= 2)!
  return all('opportunities').find((o) => o.id === id)!
}

beforeEach(() => { resetData(); usePre.setState({ runs: {}, busy: {}, filters: {} }); ask.mockReset() })

describe('Preseleccionar con IA (flujo)', () => {
  it('la IA puntúa, queda el ranking y la preselección se guarda en las postulaciones', async () => {
    const o = opp()
    const mine = all('applications').filter((a) => a.opportunity_id === o.id)
    ask.mockImplementation(async (_s: string, prompt: string) => mine.map((a, i) => `${a.worker_id}|${90 - i * 10}|Razón ${i}`).join('\n'))
    await runPreselection(o.id)
    const run = usePre.getState().runs[o.id]
    expect(run.source).toBe('ia'); expect(usePre.getState().busy[o.id]).toBe(false)
    expect(ask.mock.calls[0][1]).toContain(o.title)
    const users = all('users').filter((u) => u.role === 'worker')
    const rows = recalify(o, run, users, all('applications'), usePre.getState().filters[o.id] ?? PRE_DEFAULT, 'Cochabamba')
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1].score).toBeGreaterThanOrEqual(rows[i].score)
    const ids = shortlist(rows).map((r) => r.user.id)
    syncShortlist(o.id, ids)
    for (const a of all('applications').filter((x) => x.opportunity_id === o.id)) {
      if (ids.includes(a.worker_id) && mine.find((m) => m.id === a.id)!.status !== 'aceptada') expect(['preseleccionada', 'aceptada']).toContain(a.status)
    }
    syncShortlist(o.id, [])
    expect(all('applications').filter((a) => a.opportunity_id === o.id && a.ai).length).toBe(0)
  })
  it('si la IA falla, usa el análisis básico', async () => {
    const o = opp(); ask.mockRejectedValue(new Error('500'))
    await runPreselection(o.id)
    expect(usePre.getState().runs[o.id].source).toBe('local')
  })
  it('si la IA responde sin el formato pedido, usa el análisis básico', async () => {
    const o = opp(); ask.mockResolvedValue('Los mejores son todos buenos.')
    await runPreselection(o.id)
    expect(usePre.getState().runs[o.id].source).toBe('local')
  })
})
