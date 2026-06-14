import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { STAGE_LABEL } from '@/lib/stages'
import { isStale, isOverdue } from '@/lib/badges'

// Stage category buckets — mirrors STAGE_WIN_PROBABILITY thresholds from SQL.py
const COMMITTED  = new Set(['contract_negotiation', 'won'])
const AT_RISK    = new Set(['customer_test', 'rfp_offer_given'])
// everything else = Pipeline (interest_shown, rfi_answered)

function categoryOf(stage) {
  if (COMMITTED.has(stage))  return 'committed'
  if (AT_RISK.has(stage))    return 'at_risk'
  return 'pipeline'
}

const CATEGORY_LABEL = { committed: 'Committed', at_risk: 'At-risk', pipeline: 'Pipeline' }
const CATEGORY_COLOR = {
  committed: 'bg-green-100 text-green-800',
  at_risk:   'bg-orange-100 text-orange-800',
  pipeline:  'bg-blue-100 text-blue-800',
}

function fmt(n) {
  return n.toLocaleString('en-EU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function quarterOf(year, month) {
  return Math.ceil(month / 3)
}

function quarterLabel(year, q) { return `Q${q} ${year}` }

// Returns array of 4 quarters starting from current quarter
function nextQuarters(now = new Date()) {
  const quarters = []
  let y = now.getFullYear()
  let q = quarterOf(y, now.getMonth() + 1)
  for (let i = 0; i < 4; i++) {
    quarters.push({ year: y, q })
    q++
    if (q > 4) { q = 1; y++ }
  }
  return quarters
}

export default function SMDashboard() {
  const navigate = useNavigate()
  const [deals, setDeals]       = useState([])
  const [users, setUsers]       = useState([])
  const [forecasts, setForecasts] = useState({})
  const [loading, setLoading]   = useState(true)
  const [stageFilter, setStageFilter] = useState('all')

  useEffect(() => {
    async function load() {
      try {
        const [allDeals, allUsers] = await Promise.all([api.getDeals(), api.getUsers()])
        setDeals(allDeals)
        setUsers(allUsers)
        const entries = await Promise.all(
          allDeals.map(async (d) => {
            try { return [d.id, await api.getDealForecast(d.id)] }
            catch { return [d.id, []] }
          })
        )
        setForecasts(Object.fromEntries(entries))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading dashboard…</div>

  function userName(id) {
    return users.find((u) => u.id === id)?.full_name ?? `Rep #${id}`
  }

  const openDeals     = deals.filter((d) => d.stage !== 'lost')
  const activeDeals   = deals.filter((d) => d.stage !== 'won' && d.stage !== 'lost')
  const overdueDeals  = activeDeals.filter(isOverdue)
  const staleDeals    = activeDeals.filter(isStale)
  const wonDeals      = deals.filter((d) => d.stage === 'won')

  const totalPipeline  = openDeals.reduce((s, d) => s + d.total_device_value + d.total_service_value, 0)
  const wonValue       = wonDeals.reduce((s, d) => s + d.total_device_value + d.total_service_value, 0)
  const committedValue = openDeals
    .filter((d) => COMMITTED.has(d.stage))
    .reduce((s, d) => s + d.total_device_value + d.total_service_value, 0)

  // ── Pipeline table filter ─────────────────────────────────────────────────
  const stageOptions = [...new Set(openDeals.map((d) => d.stage))]
  const displayDeals = stageFilter === 'all'
    ? activeDeals
    : activeDeals.filter((d) => d.stage === stageFilter)

  // ── Quarterly forecast ────────────────────────────────────────────────────
  const quarters = nextQuarters()

  function quarterSum(year, q, categoryFilter) {
    let device = 0, service = 0
    deals.forEach((deal) => {
      if (categoryFilter && categoryOf(deal.stage) !== categoryFilter) return
      ;(forecasts[deal.id] ?? []).forEach((row) => {
        if (row.year === year && quarterOf(year, row.month) === q) {
          device  += row.device_revenue
          service += row.service_revenue
        }
      })
    })
    return { device, service, total: device + service }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Manager Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Full team pipeline overview</p>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Pipeline"  value={`€${fmt(totalPipeline)}`}    sub="excl. lost" />
        <StatCard label="Committed"       value={`€${fmt(committedValue)}`}    sub="negotiation + won" highlight />
        <StatCard label="Overdue Deals"   value={String(overdueDeals.length)}  sub="past close date" warn={overdueDeals.length > 0} />
        <StatCard label="Won Value"       value={`€${fmt(wonValue)}`}          sub="closed won" />
      </div>

      {/* ── Stale deals alert ── */}
      {staleDeals.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="font-semibold">{staleDeals.length} stale deal{staleDeals.length > 1 ? 's' : ''}</span>
          {' '}— no activity in 14+ days:{' '}
          {staleDeals.map((d) => d.name).join(', ')}
        </div>
      )}

      {/* ── Team pipeline table ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Team Pipeline</h2>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Stage</label>
            <select
              className="border rounded-md px-2 py-1 text-sm bg-background"
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
            >
              <option value="all">All active</option>
              {stageOptions.map((s) => (
                <option key={s} value={s}>{STAGE_LABEL[s] ?? s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Deal</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rep</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Stage</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Close Date</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total Value</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {displayDeals.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No deals for this filter.</td>
                </tr>
              )}
              {displayDeals.map((deal) => {
                const total = deal.total_device_value + deal.total_service_value
                const cat   = categoryOf(deal.stage)
                const stale = isStale(deal)
                const overdue = isOverdue(deal)
                return (
                  <tr
                    key={deal.id}
                    onClick={() => navigate(`/deals/${deal.id}`)}
                    className={`hover:bg-muted/30 transition-colors cursor-pointer ${overdue ? 'bg-red-50/40' : ''}`}
                  >
                    <td className="px-4 py-3 font-medium">{deal.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{userName(deal.owner_id)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                        {STAGE_LABEL[deal.stage] ?? deal.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLOR[cat]}`}>
                        {CATEGORY_LABEL[cat]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">
                      {deal.expected_close_date ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">€{fmt(total)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {stale   && <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">Stale</span>}
                        {overdue && <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Overdue</span>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {displayDeals.length > 0 && (
              <tfoot className="border-t bg-muted/30">
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-sm font-semibold">Total</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold">
                    €{fmt(displayDeals.reduce((s, d) => s + d.total_device_value + d.total_service_value, 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {/* ── Quarterly forecast ── */}
      <section>
        <h2 className="text-lg font-semibold mb-1">Quarterly Forecast</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Revenue from deal forecast rows, split by stage category. Current quarter + next 3.
        </p>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Quarter</th>
                <th className="text-right px-4 py-3 font-medium text-green-700">Committed</th>
                <th className="text-right px-4 py-3 font-medium text-orange-700">At-risk</th>
                <th className="text-right px-4 py-3 font-medium text-blue-700">Pipeline</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {quarters.map(({ year, q }) => {
                const com = quarterSum(year, q, 'committed')
                const risk = quarterSum(year, q, 'at_risk')
                const pipe = quarterSum(year, q, 'pipeline')
                const total = com.total + risk.total + pipe.total
                return (
                  <tr key={`${year}-Q${q}`} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium tabular-nums">{quarterLabel(year, q)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-green-700">
                      {com.total > 0 ? `€${fmt(com.total)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-orange-700">
                      {risk.total > 0 ? `€${fmt(risk.total)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-blue-700">
                      {pipe.total > 0 ? `€${fmt(pipe.total)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">
                      {total > 0 ? `€${fmt(total)}` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function StatCard({ label, value, sub, highlight = false, warn = false }) {
  const border = warn ? 'border-red-200 bg-red-50/40' : highlight ? 'border-primary/30 bg-primary/5' : 'bg-card'
  const valColor = warn ? 'text-red-600' : highlight ? 'text-primary' : ''
  return (
    <div className={`rounded-lg border p-5 ${border}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold mt-1 tabular-nums ${valColor}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}
