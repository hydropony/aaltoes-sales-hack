import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

const statusConfig = {
  draft:           { label: 'Draft',                     color: 'bg-muted text-muted-foreground',  banner: 'bg-muted/50 border-muted' },
  pending_sm:      { label: 'Awaiting SM Approval',      color: 'bg-blue-100 text-blue-800',       banner: 'bg-blue-50 border-blue-200' },
  pending_finance: { label: 'Awaiting Finance Approval',  color: 'bg-blue-100 text-blue-800',       banner: 'bg-blue-50 border-blue-200' },
  locked:          { label: 'Approved & Locked',          color: 'bg-green-100 text-green-800',     banner: 'bg-green-50 border-green-200' },
  rejected:        { label: 'Rejected',                   color: 'bg-red-100 text-red-800',         banner: 'bg-red-50 border-red-200' },
}

export default function OfferDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [offer, setOffer] = useState(null)
  const [lines, setLines] = useState([])
  const [catalog, setCatalog] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    Promise.all([
      api.getOffer(id),
      api.getOfferLines(id),
      api.getCatalog(),
    ])
      .then(([o, l, c]) => { setOffer(o); setLines(l); setCatalog(c) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  function catalogName(catalogItemId) {
    return catalog.find(c => c.id === catalogItemId)?.name ?? `Item #${catalogItemId}`
  }

  async function createNewVersion() {
    if (!offer) return
    setCreating(true)
    try {
      // Create a new offer with same deal/account
      const newOffer = await api.createOffer({
        account_id: offer.account_id,
        deal_id: offer.deal_id,
        currency: offer.currency,
      })

      // Copy lines from current offer
      for (const line of lines) {
        await api.addOfferLine(newOffer.id, {
          catalog_item_id: line.catalog_item_id,
          quantity: line.quantity,
          discount_pct: line.discount_pct,
        })
      }

      navigate(`/offers/${newOffer.id}`)
    } catch (e) {
      console.error(e)
    } finally {
      setCreating(false)
    }
  }

  if (loading) return <p className="text-muted-foreground text-sm p-8">Loading...</p>
  if (!offer) return <p className="text-destructive text-sm p-8">Offer not found.</p>

  const cfg = statusConfig[offer.status] ?? statusConfig.draft

  return (
    <div>
      <button onClick={() => navigate(-1)} className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1">
        ← Back
      </button>

      {/* Status banner */}
      <div className={`rounded-lg border p-4 mb-6 ${cfg.banner}`}>
        <div className="flex items-center justify-between">
          <div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${cfg.color}`}>{cfg.label}</span>
            <span className="text-sm text-muted-foreground ml-3">Offer v{offer.version}</span>
          </div>
          {(offer.status === 'locked' || offer.status === 'rejected') && (
            <Button size="sm" onClick={createNewVersion} disabled={creating}>
              {creating ? 'Creating...' : 'Create New Version'}
            </Button>
          )}
        </div>

        {/* Timestamps */}
        {offer.status === 'pending_sm' && (
          <p className="text-xs text-muted-foreground mt-2">Submitted {new Date(offer.created_at).toLocaleString()}</p>
        )}
        {offer.status === 'pending_finance' && offer.sm_approved_at && (
          <p className="text-xs text-muted-foreground mt-2">SM approved {new Date(offer.sm_approved_at).toLocaleString()}</p>
        )}
        {offer.status === 'locked' && offer.finance_approved_at && (
          <p className="text-xs text-muted-foreground mt-2">Approved {new Date(offer.finance_approved_at).toLocaleString()}</p>
        )}
      </div>

      {/* Rejection reason */}
      {offer.status === 'rejected' && offer.rejection_reason && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 mb-6">
          <p className="text-sm font-medium text-red-800 mb-1">Rejection Reason</p>
          <p className="text-sm text-red-700">{offer.rejection_reason}</p>
        </div>
      )}

      {/* Line items */}
      <h2 className="text-lg font-semibold mb-3">Line Items</h2>
      <div className="rounded-lg border bg-card overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Item</th>
              <th className="text-right px-4 py-3 font-medium">Qty</th>
              <th className="text-right px-4 py-3 font-medium">Unit Price (€)</th>
              <th className="text-right px-4 py-3 font-medium">Discount %</th>
              <th className="text-right px-4 py-3 font-medium">Line Total (€)</th>
            </tr>
          </thead>
          <tbody>
            {lines.map(line => (
              <tr key={line.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{catalogName(line.catalog_item_id)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{line.quantity}</td>
                <td className="px-4 py-3 text-right tabular-nums">€{line.unit_price.toLocaleString()}</td>
                <td className="px-4 py-3 text-right tabular-nums">{line.discount_pct}%</td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">€{line.line_total.toLocaleString()}</td>
              </tr>
            ))}
            {lines.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No line items.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="rounded-lg border bg-card p-6 mb-6">
        <div className="flex flex-col gap-2 text-sm max-w-xs ml-auto">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">€{offer.subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Discount ({offer.discount_pct}%)</span>
            <span className="tabular-nums text-red-600">−€{offer.discount_amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-semibold text-base border-t pt-2">
            <span>Total</span>
            <span className="tabular-nums">€{offer.total_value.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Discount justification */}
      {offer.discount_justification && (
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Discount Justification</p>
          <p className="text-sm">{offer.discount_justification}</p>
        </div>
      )}
    </div>
  )
}
