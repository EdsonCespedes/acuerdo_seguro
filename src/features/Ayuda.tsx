import { Play } from 'lucide-react'
import { Btn, Section, Tabs } from '../design-system/ui'
import { useTour } from '../store/tour'
import { aiReady } from '../lib/ai'
import { useTab } from './common'

const FAQ = [
  ['¿Qué es Acuerdo Seguro?', 'Conecta a jóvenes con habilidades digitales con negocios de Cochabamba para trabajos por proyecto.'],
  ['¿Retienen mi dinero?', 'No. Solo registra los pagos entre las partes. No es un banco.'],
  ['¿Cómo se acepta un acuerdo?', 'Ambas partes aceptan la misma versión. Si algo cambia, se crea una versión nueva.'],
  ['¿Cómo activo la IA del CV?', 'Pon tu clave de OpenRouter en el archivo .env y reinicia.'],
]

export default function Ayuda() {
  const [tab, setTab] = useTab('ayuda', 'inicio')
  const start = useTour((s) => s.start)
  return (
    <>
      <Tabs items={[{ id: 'inicio', label: 'Inicio' }, { id: 'preguntas', label: 'Preguntas' }]} value={tab} onChange={setTab} />
      {tab === 'inicio' ? (
        <>
          <p>Encuentra convocatorias, postúlate, acuerda el trabajo, entrégalo y cobra, todo en un solo lugar.</p>
          <p className="fine">IA del CV: {aiReady ? 'activa' : 'sin clave'}</p>
          <div className="actions"><Btn kind="primary" onClick={start}><Play size={16} /> Iniciar demo guiada</Btn></div>
        </>
      ) : (
        <Section title="Preguntas">{FAQ.map(([q, a]) => <div className="item" key={q}><b>{q}</b><p className="fine">{a}</p></div>)}</Section>
      )}
    </>
  )
}
