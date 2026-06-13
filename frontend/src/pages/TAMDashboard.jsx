import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'

const priorityColors = {
  high: 'bg-destructive/10 text-destructive',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-muted text-muted-foreground',
}

const priorityOrder = { high: 0, medium: 1, low: 2 }

function daysSince(dateStr) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

export default function TAMDashboard() {
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const userId = Number(localStorage.getItem('user_id') || '1')

  useEffect(() => {
    api.getCases()
      .then((all) => {
        const mine = all.filter((c) => c.tam_id === userId)
        const sorted = mine.sort((a, b) => {
          if (a.status === 'resolved' && b.status !== 'resolved') return 1
          if (b.status === 'resolved' && a.status !== 'resolved') return -1
          const pd = (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1)
          if (pd !== 0) return pd
          return daysSince(b.created_at) - daysSince(a.created_at)
        })
        setCases(sorted)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [userId])

  const open = cases.filter((c) => c.status !== 'resolved')
  const resolved = cases.filter((c) => c.status === 'resolved')

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">TAM Dashboard</h1>
      <p className="text-muted-foreground text-sm mb-6">Your assigned cases, sorted by priority and age.</p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Open Cases</p>
          <p className="text-3xl font-bold">{open.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Escalated</p>
          <p className="text-3xl font-bold">{open.filter((c) => c.is_escalated).length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Resolved</p>
          <p className="text-3xl font-bold">{resolved.length}</p>
        </div>
      </div>

      {loading && <p className="text-muted-foreground text-sm">Loading...</p>}

      {!loading && cases.length === 0 && (
        <p className="text-muted-foreground text-sm">No cases assigned to you.</p>
      )}

      {!loading && cases.length > 0 && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Subject</th>
                <th className="text-left px-4 py-3 font-medium">Priority</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Age</th>
                <th className="text-left px-4 py-3 font-medium">Escalated</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/cases/${c.id}`)}
                  className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                >
                  <td className="px-4 py-3 font-medium">{c.subject}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${priorityColors[c.priority] ?? ''}`}>
                      {c.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{c.status}</td>
                  <td className="px-4 py-3 text-muted-foreground">{daysSince(c.created_at)}d</td>
                  <td className="px-4 py-3">
                    {c.is_escalated ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">Yes</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
