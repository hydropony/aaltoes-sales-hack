import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { STAGE_LABEL, STAGE_ORDER } from '@/lib/stages'
import { isStale, isOverdue } from '@/lib/badges'

export default function Pipeline() {
  const [deals, setDeals] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // Filters
  const [channelFilter, setChannelFilter] = useState('all')
  const [stageFilter, setStageFilter] = useState('all')
  const [staleOnly, setStaleOnly] = useState(false)

  useEffect(() => {
    Promise.all([api.getDeals(), api.getAccounts()])
      .then(([d, a]) => { setDeals(d); setAccounts(a) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  function accountName(accountId) {
    return accounts.find(a => a.id === accountId)?.name ?? '—'
  }

  // Apply filters
  let filtered = deals
  if (channelFilter !== 'all') filtered = filtered.filter(d => d.channel === channelFilter)
  if (stageFilter !== 'all') filtered = filtered.filter(d => d.stage === stageFilter)
  if (staleOnly) filtered = filtered.filter(d => isStale(d))

  // Stages for kanban columns — exclude won/lost by default? No, include all per spec.
  const columns = STAGE_ORDER.filter(stage => {
    if (stageFilter !== 'all') return stage === stageFilter
    return true
  })

  if (loading) return <p className="text-muted-foreground text-sm">Loading pipeline...</p>

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Pipeline</h1>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Channel</label>
          <select
            className="border rounded-md px-3 py-2 text-sm bg-background"
            value={channelFilter}
            onChange={e => setChannelFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="direct">Direct</option>
            <option value="reseller">Reseller</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Stage</label>
          <select
            className="border rounded-md px-3 py-2 text-sm bg-background"
            value={stageFilter}
            onChange={e => setStageFilter(e.target.value)}
          >
            <option value="all">All</option>
            {STAGE_ORDER.map(s => (
              <option key={s} value={s}>{STAGE_LABEL[s]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">&nbsp;</label>
          <label className="flex items-center gap-2 text-sm cursor-pointer border rounded-md px-3 py-2 bg-background">
            <input
              type="checkbox"
              checked={staleOnly}
              onChange={e => setStaleOnly(e.target.checked)}
            />
            Stale only
          </label>
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {columns.map(stage => {
          const stageDeals = filtered.filter(d => d.stage === stage)
          return (
            <div key={stage} className="min-w-[220px] flex-shrink-0 bg-muted/40 rounded-lg p-3">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {STAGE_LABEL[stage] ?? stage}
                </p>
                <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                  {stageDeals.length}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {stageDeals.map(deal => {
                  const total = (deal.total_device_value ?? 0) + (deal.total_service_value ?? 0)
                  return (
                    <div
                      key={deal.id}
                      onClick={() => navigate(`/deals/${deal.id}`)}
                      className="bg-card border rounded-md p-3 cursor-pointer hover:shadow-sm transition-shadow"
                    >
                      <p className="text-sm font-medium leading-tight mb-1">{deal.name}</p>
                      <p className="text-xs text-muted-foreground mb-2">{accountName(deal.account_id)}</p>
                      <p className="text-sm font-bold mb-2">€{total.toLocaleString()}</p>
                      <div className="flex flex-wrap gap-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          deal.channel === 'direct' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {deal.channel === 'direct' ? 'Direct' : 'Reseller'}
                        </span>
                        {isStale(deal) && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">Stale</span>
                        )}
                        {isOverdue(deal) && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-800 font-medium">Overdue</span>
                        )}
                      </div>
                    </div>
                  )
                })}
                {stageDeals.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Empty</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
