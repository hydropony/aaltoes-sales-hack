import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

const statusConfig = {
  draft:           { label: 'Draft',                    color: 'bg-muted text-muted-foreground' },
  pending_sm:      { label: 'Awaiting SM',              color: 'bg-blue-100 text-blue-800' },
  pending_finance: { label: 'Awaiting Finance',         color: 'bg-blue-100 text-blue-800' },
  locked:          { label: 'Approved',                 color: 'bg-green-100 text-green-800' },
  rejected:        { label: 'Rejected',                 color: 'bg-red-100 text-red-800' },
}

export default function Offers() {
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.getOffers().then(setOffers).catch(console.error).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Offers</h1>
        <Button onClick={() => navigate('/offers/new')}>+ New Offer</Button>
      </div>

      {loading && <p className="text-muted-foreground text-sm">Loading...</p>}

      {!loading && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Account</th>
                <th className="text-left px-4 py-3 font-medium">Deal</th>
                <th className="text-left px-4 py-3 font-medium">Version</th>
                <th className="text-right px-4 py-3 font-medium">Total</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {offers.map((o) => {
                const cfg = statusConfig[o.status] ?? { label: o.status, color: 'bg-muted text-muted-foreground' }
                return (
                  <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/offers/${o.id}`)}>
                    <td className="px-4 py-3 font-medium text-foreground">{o.account_name ?? `Account #${o.account_id}`}</td>
                    <td className="px-4 py-3 text-muted-foreground">{o.deal_name ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">v{o.version}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">€{o.total_value.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/offers/${o.id}`) }}>
                        View
                      </Button>
                    </td>
                  </tr>
                )
              })}
              {offers.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No offers yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
