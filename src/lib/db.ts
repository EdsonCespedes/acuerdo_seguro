import { create } from 'zustand'

const files = import.meta.glob('../data/*.json', { eager: true, import: 'default' }) as Record<string, any[]>
const base: Record<string, any[]> = {}
for (const [p, v] of Object.entries(files)) base[p.split('/').pop()!.replace('.json', '')] = v

let overlay: Record<string, Record<string, any>> = {}

export const useDbRev = create<{ rev: number }>(() => ({ rev: 0 }))
const bump = () => useDbRev.setState((s) => ({ rev: s.rev + 1 }))

export function all(c: string): any[] {
  const b = base[c] ?? []
  const o = overlay[c] ?? {}
  const ids = new Set(b.map((r) => r.id))
  const merged = b.map((r) => o[r.id] ?? r)
  for (const r of Object.values(o)) if (!ids.has((r as any).id)) merged.push(r)
  return merged.filter((r) => !r.__deleted)
}
export const get = (c: string, id: string) => all(c).find((r) => r.id === id)
export function upsert(c: string, rec: any) { (overlay[c] ||= {})[rec.id] = rec; bump(); return rec }
export function remove(c: string, id: string) { (overlay[c] ||= {})[id] = { id, __deleted: true }; bump() }
export function resetData() { overlay = {}; bump() }
export function useCollection(c: string): any[] { useDbRev((s) => s.rev); return all(c) }
export function useRecord(c: string, id?: string) { useDbRev((s) => s.rev); return id ? get(c, id) : undefined }
