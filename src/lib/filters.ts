import { get } from './db'
import { norm } from './util'

export const oppMatches = (o: any, q: string, branch: string | null) => {
  if (branch && o.branch !== branch) return false
  const s = norm(q.trim())
  if (!s) return true
  const company = get('users', o.company_id)?.name ?? ''
  return norm([o.title, o.specialty, company, ...(o.skills || []), ...(o.deliverables || [])].join(' ')).includes(s)
}
