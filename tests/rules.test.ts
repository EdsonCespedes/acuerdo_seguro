import { describe, it, expect } from 'vitest'
import { semaforo, newVersion, acceptVersion, isBilateral, latest, canPay, reconcile, balance } from '../src/lib/rules'
import agreements from '../src/data/agreements.json'
import payments from '../src/data/payments.json'

const A: any = agreements.find((a) => a.id === 'agr_1')
const B: any = agreements.find((a) => a.id === 'agr_2')

describe('acuerdos', () => {
  it('agr_1: Bs 650 = 200 + 450', () => {
    const v = latest(A); expect(v.total_cents).toBe(65000); expect(balance(v)).toBe(45000)
    expect(reconcile(v.total_cents, payments.filter((p) => p.agreement_id === 'agr_1')).ok).toBe(true)
  })
  it('agr_2: Bs 500 = 150 + 350', () => {
    const v = latest(B); expect(v.total_cents).toBe(50000); expect(balance(v)).toBe(35000)
    expect(reconcile(v.total_cents, payments.filter((p) => p.agreement_id === 'agr_2')).ok).toBe(true)
  })
})
describe('semáforo', () => {
  it('agr_1 verde, agr_2 amarillo', () => { expect(semaforo(latest(A)).level).toBe('verde'); expect(semaforo(latest(B)).level).toBe('amarillo') })
  it('rojo si falta alcance', () => { expect(semaforo({ ...latest(A), scope: '' }).level).toBe('rojo') })
})
describe('versiones', () => {
  it('una versión nueva no toca la anterior y borra aceptaciones', () => {
    const a1 = acceptVersion(A, 1, 'company')
    const a2 = newVersion(a1, { total_cents: 70000 }, '2026-11-10T00:00:00Z')
    expect(a2.versions[0].total_cents).toBe(65000); expect(a2.versions[0].acceptedBy).toEqual(['company'])
    expect(latest(a2).v).toBe(2); expect(latest(a2).acceptedBy).toEqual([])
  })
  it('no se acepta una versión antigua', () => {
    const a2 = newVersion(A, { days: 20 }, 'x'); expect(() => acceptVersion(a2, 1, 'worker')).toThrow()
  })
  it('aceptación de ambas partes', () => {
    const a = acceptVersion(acceptVersion(A, 1, 'company'), 1, 'worker'); expect(isBilateral(latest(a))).toBe(true)
  })
})
describe('pagos', () => {
  it('solo el receptor confirma', () => {
    expect(canPay('company', 'reportado_pagador', 'confirmado_receptor')).toBe(false)
    expect(canPay('worker', 'reportado_pagador', 'confirmado_receptor')).toBe(true)
  })
  it('nadie marca verificado sin proveedor', () => {
    expect(canPay('worker', 'confirmado_receptor', 'verificado_proveedor')).toBe(false)
  })
})
