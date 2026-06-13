import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

const priorityColors = {
  high: 'bg-destructive/10 text-destructive',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-muted text-muted-foreground',
}

function daysSince(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export default function Cases() {
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.getCases().then(setCases).catch(console.error).finally(() => setLoading(false))
  }, [])

  const sorted = [...cases].sort((a, b) => {
    const p = { high: 0, medium: 1, low: 2 }
    return (p[a.priority] ?? 1) - (p[b.priority] ?? 1) || daysSince(a.created_at) - daysSince(b.created_at)
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Cases</h1>
        <Button>+ New Case</Button>
      </div>

      {loading && <p className="text-muted-foreground text-sm">Loading...</p>}

      {!loading && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Subject</th>
                <th className="text-left px-4 py-3 font-medium">Priority</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Age</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => (
                <tr key={c.id} onClick={() => navigate(`/cases/${c.id}`)} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer">
                  <td className="px-4 py-3 font-medium">{c.subject}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${priorityColors[c.priority] ?? ''}`}>
                      {c.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{c.status}</td>
                  <td className="px-4 py-3 text-muted-foreground">{daysSince(c.created_at)}d</td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No cases found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
