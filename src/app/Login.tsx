import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, LogIn, UserPlus } from 'lucide-react'
import { useAuth } from '../store/auth'

type Kind = 'worker' | 'company'
export default function Login() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [kind, setKind] = useState<Kind>('worker')
  const [who, setWho] = useState(''); const [pass, setPass] = useState(''); const [show, setShow] = useState(false)
  const [f, setF] = useState({ name: '', email: '', headline: '', skills: '', rubro: '', description: '' })
  const [gender, setGender] = useState<'' | 'mujer' | 'varón'>('')
  const [err, setErr] = useState('')
  const set = (k: string, v: string) => setF((x) => ({ ...x, [k]: v }))
  const submit = (e: FormEvent) => {
    e.preventDefault()
    setErr((mode === 'in' ? login(who, pass) : register({ kind, ...f, gender, password: pass })) ?? '')
  }
  const swap = (m: 'in' | 'up') => { setMode(m); setErr(''); setPass('') }
  return (
    <main className="login">
      <div className="login-card">
        <div className="login-brand"><i className="as-mark">A.S.</i><b>Acuerdo Seguro</b><small>Trabajos por proyecto, con acuerdo claro.</small></div>
        <div className="seg login-seg" role="group" aria-label="Acceso">
          <button type="button" className={mode === 'in' ? 'on' : ''} aria-pressed={mode === 'in'} onClick={() => swap('in')}>Entrar</button>
          <button type="button" className={mode === 'up' ? 'on' : ''} aria-pressed={mode === 'up'} onClick={() => swap('up')}>Crear cuenta</button>
        </div>
        <form onSubmit={submit} noValidate>
          {mode === 'up' && (
            <div className="seg login-seg" role="group" aria-label="Tipo de cuenta">
              <button type="button" className={kind === 'worker' ? 'on' : ''} aria-pressed={kind === 'worker'} onClick={() => setKind('worker')}>Persona</button>
              <button type="button" className={kind === 'company' ? 'on' : ''} aria-pressed={kind === 'company'} onClick={() => setKind('company')}>Empresa</button>
            </div>
          )}
          {mode === 'up' && <label className="fld">{kind === 'company' ? 'Nombre del negocio' : 'Nombre completo'}<input value={f.name} onChange={(e) => set('name', e.target.value)} autoComplete="name" /></label>}
          {mode === 'in'
            ? <label className="fld">Usuario o correo<input value={who} onChange={(e) => setWho(e.target.value)} autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} /></label>
            : <label className="fld">Correo<input type="email" inputMode="email" value={f.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" autoCapitalize="none" /></label>}
          <label className="fld">Contraseña
            <span className="pass">
              <input type={show ? 'text' : 'password'} value={pass} onChange={(e) => setPass(e.target.value)} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} />
              <button type="button" className="icon-btn sm" aria-label={show ? 'Ocultar contraseña' : 'Ver contraseña'} onClick={() => setShow(!show)}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </span>
          </label>
          {mode === 'up' && kind === 'worker' && (<>
            <label className="fld">A qué te dedicas<input value={f.headline} maxLength={70} onChange={(e) => set('headline', e.target.value)} placeholder="Ej. Diseño y video para negocios" /></label>
            <label className="fld">Habilidades (separadas por coma)<input value={f.skills} onChange={(e) => set('skills', e.target.value)} placeholder="Diseño para redes, Canva" /></label>
            <div className="fld">Género (opcional)
              <div className="seg login-seg" role="group" aria-label="Género">
                {([['mujer', 'Mujer'], ['varón', 'Varón'], ['', 'No indicar']] as const).map(([id, label]) => <button key={id} type="button" className={gender === id ? 'on' : ''} aria-pressed={gender === id} onClick={() => setGender(id)}>{label}</button>)}
              </div>
            </div>
          </>)}
          {mode === 'up' && kind === 'company' && (<>
            <label className="fld">Rubro<input value={f.rubro} onChange={(e) => set('rubro', e.target.value)} placeholder="Ej. Gastronomía" /></label>
            <label className="fld">Descripción (opcional)<input value={f.description} maxLength={90} onChange={(e) => set('description', e.target.value)} /></label>
          </>)}
          {err && <p className="err" role="alert">{err}</p>}
          <button type="submit" className="btn btn-primary login-go">{mode === 'in' ? <><LogIn size={16} /> Entrar</> : <><UserPlus size={16} /> Crear cuenta</>}</button>
        </form>
      </div>
    </main>
  )
}
