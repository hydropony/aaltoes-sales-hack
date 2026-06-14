import { useEffect, useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserContext } from '@/lib/UserContext'
import { api } from '@/lib/api'

const STATUS_CFG = {
  draft:           { label: 'Draft',                    cls: 'bg-muted text-muted-foreground' },
  pending_sm:      { label: 'Awaiting SM',              cls: 'bg-blue-100 text-blue-800' },
  pending_finance: { label: 'Awaiting Finance',         cls: 'bg-blue-100 text-blue-800' },
  locked:          { label: 'Approved & Locked',        cls: 'bg-green-100 text-green-800' },
  rejected:        { label: 'Rejected',                 cls: 'bg-red-100 text-red-800' },
}

function needsMyAction(offer, role) {
  return (role === 'sm' && offer.status === 'pending_sm') ||
         (role === 'finance' && offer.status === 'pending_finance')
}

export default function Offers() {
  const currentUser = useContext(UserContext)
  const navigate = useNavigate()
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getOffers()
      .then(setOffers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading offers…</div>
  if (error)   return <div className="p-8 text-sm text-destructive">{error}</div>

  const role = currentUser?.role
  const pendingAction = offers.filter((o) => needsMyAction(o, role))
  const rest = offers.filter((o) => !needsMyAction(o, role))

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Offers</h1>
          <p className="text-sm text-muted-foreground mt-1">{offers.length} offer{offers.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Approval queue banner for SM / Finance */}
      {pendingAction.length > 0 && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-800 mb-3">
            {pendingAction.length} offer{pendingAction.length > 1 ? 's' : ''} awaiting your approval
          </p>
          <OfferTable offers={pendingAction} role={role} onOpen={(id) => navigate(`/offers/${id}`)} highlight />
        </div>
      )}

      {/* All other offers */}
      <OfferTable offers={rest} role={role} onOpen={(id) => navigate(`/offers/${id}`)} />
    </div>
  )
}

function OfferTable({ offers, role, onOpen, highlight = false }) {
  if (offers.length === 0) return (
    <div className="rounded-lg border text-sm text-muted-foreground text-center py-8">No offers.</div>
  )

  return (
    <div className={`rounded-lg border overflow-hidden ${highlight ? 'border-blue-200' : ''}`}>
      <table className="w-full text-sm">
        <thead className={`${highlight ? 'bg-blue-100/60' : 'bg-muted/50'}`}>
          <tr>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Offer</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Version</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {offers.map((o) => {
            const cfg = STATUS_CFG[o.status] ?? { label: o.status, cls: 'bg-muted text-muted-foreground' }
            const actionNeeded = needsMyAction(o, role)
            return (
              <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">
                  Offer #{o.id}
                  {actionNeeded && (
                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-600 text-white">
                      ACTION
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">v{o.version}</td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">
                  €{o.total_value.toLocaleString('en-EU', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${cfg.cls}`}>
                    {cfg.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onOpen(o.id)}
                    className="text-xs px-3 py-1 rounded border hover:bg-muted transition-colors"
                  >
                    {actionNeeded ? 'Review →' : 'View'}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
