import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

export default function OfferBuilder() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const dealId = searchParams.get('deal_id')
  const accountId = searchParams.get('account_id')

  const [catalog, setCatalog] = useState([])
  const [lines, setLines] = useState([])
  const [search, setSearch] = useState('')
  const [justification, setJustification] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getCatalog().then(setCatalog).catch(console.error)
  }, [])

  const filtered = catalog.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.sku.toLowerCase().includes(search.toLowerCase())
  )

  function addItem(item) {
    // Don't add duplicates
    if (lines.find(l => l.catalog_item_id === item.id)) return
    setLines(prev => [...prev, {
      catalog_item_id: item.id,
      name: item.name,
      unit_price: item.unit_price,
      quantity: 1,
      discount_pct: 0,
    }])
    setSearch('')
  }

  function updateLine(index, field, value) {
    setLines(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: Number(value) || 0 }
      return next
    })
  }

  function removeLine(index) {
    setLines(prev => prev.filter((_, i) => i !== index))
  }

  function lineTotal(line) {
    return Math.round(line.unit_price * line.quantity * (1 - line.discount_pct / 100) * 100) / 100
  }

  const subtotal = lines.reduce((sum, l) => sum + lineTotal(l), 0)
  const hasDiscount = lines.some(l => l.discount_pct > 0)
  const maxDiscountPct = lines.length > 0
    ? Math.max(...lines.map(l => l.discount_pct))
    : 0

  async function submit() {
    if (lines.length === 0) {
      setError('Add at least one line item.')
      return
    }
    if (hasDiscount && !justification.trim()) {
      setError('Justification is required when a discount is applied.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      // 1. Create offer
      const offer = await api.createOffer({
        account_id: Number(accountId),
        deal_id: dealId ? Number(dealId) : null,
        currency: 'EUR',
      })

      // 2. Add lines
      for (const line of lines) {
        await api.addOfferLine(offer.id, {
          catalog_item_id: line.catalog_item_id,
          quantity: line.quantity,
          discount_pct: line.discount_pct,
        })
      }

      // 3. Submit
      await api.submitOffer(offer.id, {
        discount_pct: maxDiscountPct,
        discount_justification: justification || null,
      })

      navigate(`/offers/${offer.id}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <button onClick={() => navigate(-1)} className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1">
        ← Back
      </button>
      <h1 className="text-2xl font-semibold mb-6">New Offer</h1>

      {/* Catalog search */}
      <div className="mb-6">
        <label className="text-xs text-muted-foreground mb-1 block">Search Catalog</label>
        <div className="relative">
          <input
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            placeholder="Search by name or SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && filtered.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
              {filtered.map(item => (
                <button
                  key={item.id}
                  onClick={() => addItem(item)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-muted/50 flex justify-between"
                >
                  <span>{item.name} <span className="text-muted-foreground">({item.sku})</span></span>
                  <span className="text-muted-foreground">€{item.unit_price.toLocaleString()}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Line items table */}
      <div className="rounded-lg border bg-card overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Item</th>
              <th className="text-right px-4 py-3 font-medium">Unit Price (€)</th>
              <th className="text-right px-4 py-3 font-medium">Qty</th>
              <th className="text-right px-4 py-3 font-medium">Discount %</th>
              <th className="text-right px-4 py-3 font-medium">Line Total (€)</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={line.catalog_item_id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{line.name}</td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">€{line.unit_price.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <input
                    type="number" min="1"
                    className="w-20 text-right border rounded px-2 py-1 text-sm bg-background ml-auto block"
                    value={line.quantity}
                    onChange={e => updateLine(i, 'quantity', e.target.value)}
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number" min="0" max="100" step="0.1"
                    className="w-20 text-right border rounded px-2 py-1 text-sm bg-background ml-auto block"
                    value={line.discount_pct}
                    onChange={e => updateLine(i, 'discount_pct', e.target.value)}
                  />
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">€{lineTotal(line).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => removeLine(i)}
                    className="text-muted-foreground hover:text-destructive text-sm"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {lines.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Search the catalog above to add items.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Subtotal */}
      <div className="flex justify-end mb-6">
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Subtotal</p>
          <p className="text-xl font-bold">€{subtotal.toLocaleString()}</p>
        </div>
      </div>

      {/* Justification */}
      {hasDiscount && (
        <div className="mb-6">
          <label className="text-xs text-muted-foreground mb-1 block">
            Discount Justification *
          </label>
          <textarea
            className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none"
            rows={3}
            placeholder="Explain why the discount is justified..."
            value={justification}
            onChange={e => setJustification(e.target.value)}
          />
        </div>
      )}

      {error && <p className="text-destructive text-sm mb-4">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
        <Button onClick={submit} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Offer'}
        </Button>
      </div>
    </div>
  )
}
