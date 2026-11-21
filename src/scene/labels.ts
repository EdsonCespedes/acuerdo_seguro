import { create } from 'zustand'
export const useLabels = create<{ ids: Set<string>; full: Set<string> }>(() => ({ ids: new Set(), full: new Set() }))
export const rank = new Map<string, number>()
export const reach = new Map<string, number>()
