import { ReactNode, useEffect, useState } from 'react'
import { motion, AnimatePresence, useDragControls } from 'motion/react'
import { X } from 'lucide-react'

export const ease = [0.22, 1, 0.36, 1] as const
export const dur = { fast: 0.16, base: 0.28, slow: 0.5 }

export function useIsDesktop() {
  const q = '(min-width: 900px)'
  const [d, setD] = useState(() => window.matchMedia(q).matches)
  useEffect(() => { const m = window.matchMedia(q); const f = () => setD(m.matches); m.addEventListener('change', f); return () => m.removeEventListener('change', f) }, [])
  return d
}

export function Btn({ kind = 'ghost', children, ...p }: { kind?: 'primary' | 'ghost' | 'danger' | 'quiet' } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <motion.button whileTap={{ scale: 0.97 }} transition={{ duration: dur.fast }} className={'btn btn-' + kind} {...(p as any)}>{children}</motion.button>
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return <div className="row"><span className="row-k">{label}</span><span className="row-v">{children}</span></div>
}
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="sec"><h3>{title}</h3>{children}</section>
}
export function Tag({ tone = 'neutral', children }: { tone?: 'neutral' | 'ok' | 'warn' | 'err' | 'cyan' | 'demo'; children: ReactNode }) {
  return <span className={'tag tag-' + tone}>{children}</span>
}
export function Empty({ children }: { children: ReactNode }) { return <p className="empty">{children}</p> }

export function Tabs({ items, value, onChange }: { items: { id: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="tabs" role="tablist">
      {items.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} className={value === t.id ? 'on' : ''} onClick={() => onChange(t.id)}>
          {t.label}
          {value === t.id && <motion.i layoutId="tabline" className="tabline" transition={{ duration: dur.base, ease }} />}
        </button>
      ))}
    </div>
  )
}

export function Sheet({ open, onClose, title, kicker, children }: { open: boolean; onClose: () => void; title: string; kicker?: string; children: ReactNode }) {
  const desk = useIsDesktop()
  const controls = useDragControls()
  const off = desk ? { x: '104%' } : { y: '104%' }
  return (
    <AnimatePresence>
      {open && (
        <motion.aside key="sheet" className="sheet" role="dialog" aria-label={title}
          initial={off} animate={{ x: 0, y: 0 }} exit={off}
          transition={{ type: 'spring', stiffness: 300, damping: 34 }}
          drag={desk ? false : 'y'} dragControls={controls} dragListener={false}
          dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.7 }}
          onDragEnd={(_, i) => { if (i.offset.y > 110 || i.velocity.y > 600) onClose() }}>
          <header className="sheet-head" onPointerDown={(e) => !desk && controls.start(e)}>
            {!desk && <i className="grab" />}
            <div><small>{kicker}</small><h2>{title}</h2></div>
            <button className="icon-btn" aria-label="Cerrar" onClick={onClose}><X size={20} /></button>
          </header>
          <motion.div className="sheet-body" key={title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: dur.base, ease, delay: 0.08 }}>
            {children}
          </motion.div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
