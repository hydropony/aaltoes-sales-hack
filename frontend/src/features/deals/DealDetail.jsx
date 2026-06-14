import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { STAGE_LABEL, nextStages } from '@/lib/stages'
import { isStale, isOverdue } from '@/lib/badges'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function emptyForecastRow(year, month) {
  return { year, month, device_units: 0, device_unit_price: 0, device_revenue: 0, service_revenue: 0 }
}

function buildGrid(existingRows) {
  const now = new Date()
  const grid = []
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const year = d.getFullYear()
    const month = d.getMonth() + 1
    const existing = existingRows.find(r => r.year === year && r.month === month)
    if (existing) {
      const units = existing.device_units ?? 0
      const rev = existing.device_revenue ?? 0
      const unitPrice = units > 0 ? Math.round((rev / units) * 100) / 100 : 0
      grid.push({
        year, month,
        device_units: units,
        device_unit_price: unitPrice,
        device_revenue: rev,
        service_revenue: existing.service_revenue ?? 0,
      })
    } else {
      grid.push(emptyForecastRow(year, month))
    }
  }
  return grid
}

export default function DealDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [deal, setDeal] = useState(null)
  const [account, setAccount] = useState(null)
  const [loading, setLoading] = useState(true)

  // Forecast
  const [forecast, setForecast] = useState([])
  const [savingForecast, setSavingForecast] = useState(false)

  // Offers
  const [offers, setOffers] = useState([])

  // Notes
  const [notes, setNotes] = useState([])
  const [noteBody, setNoteBody] = useState('')
  const [noteType, setNoteType] = useState('general')

  // Stage advance
  const [showStageMenu, setShowStageMenu] = useState(false)
  const [advancingStage, setAdvancingStage] = useState(false)

  // Lost reason
  const [lostReason, setLostReason] = useState('')
  const [showLostModal, setShowLostModal] = useState(false)
  const [pendingLostStage, setPendingLostStage] = useState(null)

  function loadDeal() {
    api.getDeal(id)
      .then(d => {
        setDeal(d)
        return api.getAccount(d.account_id)
      })
      .then(setAccount)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  function loadForecast() {
    api.getDealForecast(id).then(rows => setForecast(buildGrid(rows))).catch(console.error)
  }

  function loadOffers() {
    api.getOffers().then(all => setOffers(all.filter(o => o.deal_id === Number(id)))).catch(console.error)
  }

  function loadNotes() {
    api.getDealNotes(id).then(setNotes).catch(console.error)
  }

  useEffect(() => {
    loadDeal()
    loadForecast()
    loadOffers()
    loadNotes()
  }, [id])

  async function advanceStage(stage) {
    if (stage === 'lost') {
      setPendingLostStage(stage)
      setShowLostModal(true)
      setShowStageMenu(false)
      return
    }
    setAdvancingStage(true)
    try {
      const updated = await api.updateDealStage(id, { stage })
      setDeal(updated)
    } catch (e) { console.error(e) }
    setAdvancingStage(false)
    setShowStageMenu(false)
  }

  async function confirmLost() {
    setAdvancingStage(true)
    try {
      const updated = await api.updateDealStage(id, { stage: 'lost', lost_reason: lostReason || null })
      setDeal(updated)
    } catch (e) { console.error(e) }
    setAdvancingStage(false)
    setShowLostModal(false)
    setLostReason('')
  }

  function updateForecastRow(index, field, value) {
    setForecast(prev => {
      const next = [...prev]
      const row = { ...next[index], [field]: Number(value) || 0 }
      // Auto-calc device revenue
      row.device_revenue = Math.round(row.device_units * row.device_unit_price * 100) / 100
      next[index] = row
      return next
    })
  }

  async function saveForecast() {
    setSavingForecast(true)
    try {
      const rows = forecast.map(r => ({
        year: r.year,
        month: r.month,
        device_units: r.device_units,
        device_revenue: r.device_revenue,
        service_revenue: r.service_revenue,
      }))
      await api.saveDealForecast(id, rows)
      loadDeal()  // refresh totals
      loadForecast()
    } catch (e) { console.error(e) }
    setSavingForecast(false)
  }

  async function submitNote() {
    if (!noteBody.trim()) return
    await api.addDealNote(id, { body: noteBody, note_type: noteType })
    setNoteBody('')
    setNoteType('general')
    loadNotes()
  }

  if (loading) return <p className="text-muted-foreground text-sm p-8">Loading...</p>
  if (!deal) return <p className="text-destructive text-sm p-8">Deal not found.</p>

  const available = deal ? nextStages(deal.channel, deal.stage) : []
  const totalOpportunity = (deal.total_device_value ?? 0) + (deal.total_service_value ?? 0)
  const forecastTotals = forecast.reduce((acc, r) => ({
    device_units: acc.device_units + r.device_units,
    device_revenue: acc.device_revenue + r.device_revenue,
    service_revenue: acc.service_revenue + r.service_revenue,
  }), { device_units: 0, device_revenue: 0, service_revenue: 0 })

  const statusColors = {
    draft: 'bg-muted text-muted-foreground',
    pending_sm: 'bg-blue-100 text-blue-800',
    pending_finance: 'bg-blue-100 text-blue-800',
    locked: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  }

  return (
    <div>
      <button onClick={() => navigate(-1)} className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1">
        ← Back
      </button>

      {/* ── Header ── */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{deal.name}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {account?.name ?? '—'} ·{' '}
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                deal.channel === 'direct' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
              }`}>
                {deal.channel === 'direct' ? 'Direct' : 'Reseller'}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isStale(deal) && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Stale</span>}
            {isOverdue(deal) && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Overdue</span>}
          </div>
        </div>

        {/* Stage + Advance */}
        <div className="flex items-center gap-3 mt-3">
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary">
            {STAGE_LABEL[deal.stage] ?? deal.stage}
          </span>
          {available.length > 0 && (
            <div className="relative">
              <Button size="sm" variant="outline" onClick={() => setShowStageMenu(v => !v)} disabled={advancingStage}>
                Advance Stage ▾
              </Button>
              {showStageMenu && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-card border rounded-lg shadow-lg z-10">
                  {available.map(s => (
                    <button
                      key={s}
                      onClick={() => advanceStage(s)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 first:rounded-t-lg last:rounded-b-lg"
                    >
                      {STAGE_LABEL[s] ?? s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Device Value (3yr)</p>
            <p className="text-lg font-bold">€{(deal.total_device_value ?? 0).toLocaleString()}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Service Value (3yr)</p>
            <p className="text-lg font-bold">€{(deal.total_service_value ?? 0).toLocaleString()}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Opportunity</p>
            <p className="text-lg font-bold">€{totalOpportunity.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Expected Close</p>
            <p className="text-lg font-bold">{deal.expected_close_date ?? '—'}</p>
          </div>
        </div>
      </div>

      {/* Lost reason modal */}
      {showLostModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-card border rounded-xl shadow-lg w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold mb-3">Mark as Lost</h2>
            <label className="text-xs text-muted-foreground mb-1 block">Reason (optional)</label>
            <textarea
              className="w-full border rounded-md px-3 py-2 text-sm bg-background mb-3"
              rows={3}
              value={lostReason}
              onChange={e => setLostReason(e.target.value)}
              placeholder="Why was this deal lost?"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowLostModal(false); setLostReason('') }}>Cancel</Button>
              <Button onClick={confirmLost} disabled={advancingStage}>
                {advancingStage ? 'Saving...' : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── 12-month Forecast Grid ── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">12-Month Forecast</h2>
          <Button size="sm" onClick={saveForecast} disabled={savingForecast}>
            {savingForecast ? 'Saving...' : 'Save Forecast'}
          </Button>
        </div>
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Month</th>
                <th className="text-right px-4 py-3 font-medium">Device Units</th>
                <th className="text-right px-4 py-3 font-medium">Unit Price (€)</th>
                <th className="text-right px-4 py-3 font-medium">Device Revenue (€)</th>
                <th className="text-right px-4 py-3 font-medium">Service Revenue (€)</th>
              </tr>
            </thead>
            <tbody>
              {forecast.map((row, i) => (
                <tr key={`${row.year}-${row.month}`} className="border-b last:border-0">
                  <td className="px-4 py-2 text-muted-foreground">{MONTHS[row.month - 1]} {row.year}</td>
                  <td className="px-4 py-2">
                    <input
                      type="number" min="0"
                      className="w-24 text-right border rounded px-2 py-1 text-sm bg-background ml-auto block"
                      value={row.device_units}
                      onChange={e => updateForecastRow(i, 'device_units', e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number" min="0" step="0.01"
                      className="w-24 text-right border rounded px-2 py-1 text-sm bg-background ml-auto block"
                      value={row.device_unit_price}
                      onChange={e => updateForecastRow(i, 'device_unit_price', e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums font-medium">
                    €{row.device_revenue.toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number" min="0" step="0.01"
                      className="w-24 text-right border rounded px-2 py-1 text-sm bg-background ml-auto block"
                      value={row.service_revenue}
                      onChange={e => updateForecastRow(i, 'service_revenue', e.target.value)}
                    />
                  </td>
                </tr>
              ))}
              {/* Totals row */}
              <tr className="bg-muted/30 font-semibold">
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-right tabular-nums">{forecastTotals.device_units}</td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 text-right tabular-nums">€{forecastTotals.device_revenue.toLocaleString()}</td>
                <td className="px-4 py-3 text-right tabular-nums">€{forecastTotals.service_revenue.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Offers Section ── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Offers</h2>
          <Button size="sm" onClick={() => navigate(`/offers/new?deal_id=${id}&account_id=${deal.account_id}`)}>
            + New Offer
          </Button>
        </div>
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Version</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Device Total</th>
                <th className="text-right px-4 py-3 font-medium">Service Total</th>
                <th className="text-left px-4 py-3 font-medium">Created</th>
                <th className="text-left px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {offers.map(o => (
                <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">v{o.version}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[o.status] ?? 'bg-muted text-muted-foreground'}`}>
                      {o.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">€{(o.subtotal ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right tabular-nums">€{(o.total_value ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/offers/${o.id}`)}>View</Button>
                  </td>
                </tr>
              ))}
              {offers.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No offers for this deal.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Notes Thread ── */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Notes</h2>
        <div className="flex gap-2 mb-4">
          <textarea
            className="flex-1 border rounded-md px-3 py-2 text-sm bg-background resize-none"
            rows={2}
            placeholder="Add a note..."
            value={noteBody}
            onChange={e => setNoteBody(e.target.value)}
          />
          <div className="flex flex-col gap-2">
            <select
              className="border rounded-md px-3 py-2 text-sm bg-background"
              value={noteType}
              onChange={e => setNoteType(e.target.value)}
            >
              <option value="general">General</option>
              <option value="internal">Internal</option>
            </select>
            <Button onClick={submitNote}>Post</Button>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {notes.map(n => (
            <div key={n.id} className="rounded-lg border bg-card p-4 text-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-muted-foreground text-xs">{new Date(n.created_at).toLocaleString()}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                  n.note_type === 'internal' ? 'bg-yellow-100 text-yellow-800' : 'bg-muted text-muted-foreground'
                }`}>{n.note_type}</span>
              </div>
              <p>{n.body}</p>
            </div>
          ))}
          {notes.length === 0 && <p className="text-muted-foreground text-sm">No notes yet.</p>}
        </div>
      </div>
    </div>
  )
}
