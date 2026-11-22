import { useState } from 'react'
import { motion } from 'motion/react'
import { Send } from 'lucide-react'
import { upsert, useCollection } from '../lib/db'
import { useUi } from '../store/ui'
import { emit } from '../store/tour'
import { Empty, ease, dur } from '../design-system/ui'
import { fmtDateTime, nowIso, uid } from '../lib/util'
import { AgPicker, useAg, useAgNames } from './common'

export default function Mensajes() {
  const ag = useAg(); const names = useAgNames(); const [t, setT] = useState('')
  const msgs = useCollection('messages').filter((m) => m.agreement_id === ag?.id).sort((a, b) => a.at.localeCompare(b.at))
  const role = useUi((s) => s.role)
  if (!ag) return <Empty>Aún no tienes acuerdos.</Empty>
  const send = () => {
    if (!t.trim()) return
    upsert('messages', { id: uid('msg'), agreement_id: ag.id, from: role, text: t.trim(), at: nowIso() }); setT(''); emit('msg')
  }
  return (
    <>
      <AgPicker />
      <div className="chat">
        {msgs.map((m) => (
          <motion.div key={m.id} className={'bubble ' + (m.from === role ? 'me' : '')} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: dur.base, ease }}>
            <small>{m.from === role ? 'Tú' : names.other(ag)} · {fmtDateTime(m.at)}</small>{m.text}
          </motion.div>
        ))}
        {!msgs.length && <Empty>Sin mensajes.</Empty>}
      </div>
      <div className="compose">
        <input data-t="msg" value={t} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Escribe un mensaje" aria-label="Mensaje" />
        <button className="icon-btn send" aria-label="Enviar" onClick={send}><Send size={18} /></button>
      </div>
    </>
  )
}
