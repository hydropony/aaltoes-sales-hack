import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

// Mirrors SQL.py STAGE_WIN_PROBABILITY
const STAGE_WIN_PROB = {
  interest_shown:       10,
  rfi_answered:         20,
  rfp_offer_given:      40,
  customer_test:        65,
  contract_negotiation: 80,
  won:                  100,
  lost:                 0,
}

const STAGE_LABELS = {
  interest_shown:       'Interest Shown',
  rfi_answered:         'RFI Answered',
  rfp_offer_given:      'RFP / Offer Given',
  customer_test:        'Customer Test',
  contract_negotiation: 'Contract Negotiation',
  won:                  'Won',
  lost:                 'Lost',
}

const STAGE_COLORS = {
  interest_shown:       'bg-gray-100 text-gray-700',
  rfi_answered:         'bg-blue-100 text-blue-700',
  rfp_offer_given:      'bg-indigo-100 text-indigo-700',
  customer_test:        'bg-purple-100 text-purple-700',
  contract_negotiation: 'bg-orange-100 text-orange-700',
  won:                  'bg-green-100 text-green-800',
  lost:                 'bg-red-100 text-red-700',
}

function effectiveWinProb(deal) {
  return deal.win_probability != null
    ? deal.win_probability
    : (STAGE_WIN_PROB[deal.stage] ?? 0)
}

function fmt(n) {
  return n.toLocaleString('en-EU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function quarterLabel(year, q) {
  return `Q${q} ${year}`
}

export default function FinanceDashboard() {
  const [deals, setDeals] = useState([])
  const [forecasts, setForecasts] = useState({})   // { deal_id: [rows] }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stageFilter, setStageFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()))

  useEffect(() => {
    async function load() {
      try {
        const allDeals = await api.getDeals()
        setDeals(allDeals)
        // Fetch forecast for every deal in parallel
        const entries = await Promise.all(
          allDeals.map(async (d) => {
            try {
              const rows = await api.getDealForecast(d.id)
              return [d.id, rows]
            } catch {
              return [d.id, []]
            }
          })
        )
        setForecasts(Object.fromEntries(entries))
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading dashboard…</div>
  if (error)   return <div className="p-8 text-sm text-destructive">{error}</div>

  // ── Weighted pipeline calculations ────────────────────────────────────────
  const openDeals = deals.filter((d) => d.stage !== 'lost')
  const activeDeals = deals.filter((d) => d.stage !== 'lost' && d.stage !== 'won')
  const wonDeals   = deals.filter((d) => d.stage === 'won')

  const totalPipeline  = openDeals.reduce((s, d) => s + d.total_device_value + d.total_service_value, 0)
  const weightedTotal  = openDeals.reduce((s, d) => {
    const prob = effectiveWinProb(d) / 100
    return s + (d.total_device_value + d.total_service_value) * prob
  }, 0)
  const wonValue = wonDeals.reduce((s, d) => s + d.total_device_value + d.total_service_value, 0)

  const filteredDeals = stageFilter === 'all'
    ? openDeals
    : openDeals.filter((d) => d.stage === stageFilter)

  const filteredWeighted = filteredDeals.reduce((s, d) => {
    const prob = effectiveWinProb(d) / 100
    return s + (d.total_device_value + d.total_service_value) * prob
  }, 0)

  // ── 3-year quarterly forecast ─────────────────────────────────────────────
  // Build a map of { "YYYY-Q": { device, service } } weighted by deal win_prob
  const quarterMap = {}

  deals.forEach((deal) => {
    const prob = effectiveWinProb(deal) / 100
    const rows = forecasts[deal.id] ?? []
    rows.forEach((row) => {
      const q = Math.ceil(row.month / 3)
      const key = `${row.year}-Q${q}`
      if (!quarterMap[key]) quarterMap[key] = { year: row.year, q, device: 0, service: 0 }
      quarterMap[key].device  += row.device_revenue  * prob
      quarterMap[key].service += row.service_revenue * prob
    })
  })

  // All years present in forecast data
  const forecastYears = [...new Set(Object.values(quarterMap).map((v) => String(v.year)))].sort()
  const displayYear = yearFilter
  const quarterRows = Object.values(quarterMap)
    .filter((v) => String(v.year) === displayYear)
    .sort((a, b) => a.q - b.q)

  const stageOptions = [...new Set(openDeals.map((d) => d.stage))]

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Finance Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Weighted pipeline &amp; 3-year forecast</p>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Pipeline" value={`€${fmt(totalPipeline)}`} sub="excl. lost deals" />
        <StatCard label="Weighted Pipeline" value={`€${fmt(weightedTotal)}`} sub="probability-adjusted" highlight />
        <StatCard label="Active Deals" value={String(activeDeals.length)} sub="not won or lost" />
        <StatCard label="Won Value" value={`€${fmt(wonValue)}`} sub="closed won" />
      </div>

      {/* ── Weighted pipeline table ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Weighted Pipeline</h2>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Stage</label>
            <select
              className="border rounded-md px-2 py-1 text-sm bg-background"
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
            >
              <option value="all">All open stages</option>
              {stageOptions.map((s) => (
                <option key={s} value={s}>{STAGE_LABELS[s] ?? s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Deal</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Stage</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Win %</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total Value</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Weighted Value</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredDeals.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    No deals for this filter.
                  </td>
                </tr>
              )}
              {filteredDeals.map((deal) => {
                const prob = effectiveWinProb(deal)
                const total = deal.total_device_value + deal.total_service_value
                const weighted = total * (prob / 100)
                return (
                  <tr key={deal.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{deal.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STAGE_COLORS[deal.stage] ?? 'bg-muted text-muted-foreground'}`}>
                        {STAGE_LABELS[deal.stage] ?? deal.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{prob}%</td>
                    <td className="px-4 py-3 text-right tabular-nums">€{fmt(total)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">€{fmt(weighted)}</td>
                  </tr>
                )
              })}
            </tbody>
            {filteredDeals.length > 0 && (
              <tfoot className="border-t bg-muted/30">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-sm font-semibold">Total</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold">
                    €{fmt(filteredDeals.reduce((s, d) => s + d.total_device_value + d.total_service_value, 0))}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-primary">
                    €{fmt(filteredWeighted)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {/* ── 3-year quarterly forecast ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold">3-Year Forecast</h2>
            <p className="text-xs text-muted-foreground">Aggregated forecast revenue, probability-weighted across all deals</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Year</label>
            <select
              className="border rounded-md px-2 py-1 text-sm bg-background"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
            >
              {forecastYears.length === 0
                ? <option value={String(new Date().getFullYear())}>{new Date().getFullYear()}</option>
                : forecastYears.map((y) => <option key={y} value={y}>{y}</option>)
              }
            </select>
          </div>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Quarter</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Weighted Device Rev</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Weighted Service Rev</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total Weighted Rev</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {quarterRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    No forecast data for {displayYear}. Forecast rows must be entered per deal.
                  </td>
                </tr>
              )}
              {quarterRows.map(({ year, q, device, service }) => (
                <tr key={`${year}-Q${q}`} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium tabular-nums">{quarterLabel(year, q)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">€{fmt(device)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">€{fmt(service)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold">€{fmt(device + service)}</td>
                </tr>
              ))}
            </tbody>
            {quarterRows.length > 0 && (
              <tfoot className="border-t bg-muted/30">
                <tr>
                  <td className="px-4 py-3 text-sm font-semibold">{displayYear} Total</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold">
                    €{fmt(quarterRows.reduce((s, r) => s + r.device, 0))}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold">
                    €{fmt(quarterRows.reduce((s, r) => s + r.service, 0))}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-primary">
                    €{fmt(quarterRows.reduce((s, r) => s + r.device + r.service, 0))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>
    </div>
  )
}

function StatCard({ label, value, sub, highlight = false }) {
  return (
    <div className={`rounded-lg border p-5 ${highlight ? 'border-primary/30 bg-primary/5' : 'bg-card'}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold mt-1 tabular-nums ${highlight ? 'text-primary' : ''}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}
