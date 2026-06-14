import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { STAGE_LABEL } from '@/lib/stages'
import { isStale, isOverdue } from '@/lib/badges'
import DealForm from './DealForm'

export default function RepDashboard() {
  const [accounts, setAccounts] = useState([])
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const navigate = useNavigate()

  function load() {
    Promise.all([api.getAccounts(), api.getDeals()])
      .then(([a, d]) => { setAccounts(a); setDeals(d) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const activeDeals = deals.filter(d => d.stage !== 'won' && d.stage !== 'lost')

  function dealsForAccount(accountId) {
    return deals.filter(d => d.account_id === accountId && d.stage !== 'won' && d.stage !== 'lost')
  }

  function highestStage(accountDeals) {
    if (!accountDeals.length) return null
    const order = ['interest_shown', 'rfi_answered', 'rfp_offer_given', 'customer_test', 'contract_negotiation', 'won']
    let best = accountDeals[0]
    for (const d of accountDeals) {
      if (order.indexOf(d.stage) > order.indexOf(best.stage)) best = d
    }
    return best.stage
  }

  if (loading) return <p className="text-muted-foreground text-sm">Loading dashboard...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Rep Dashboard</h1>
        <Button onClick={() => setShowCreate(true)}>+ New Deal</Button>
      </div>

      {showCreate && (
        <DealForm
          accounts={accounts}
          deals={deals}
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); load() }}
        />
      )}

      {/* Accounts section */}
      <h2 className="text-lg font-semibold mb-3">Accounts</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {accounts.map(a => {
          const ad = dealsForAccount(a.id)
          const hs = highestStage(ad)
          return (
            <div
              key={a.id}
              onClick={() => navigate(`/accounts/${a.id}`)}
              className="rounded-lg border bg-card p-4 cursor-pointer hover:shadow-sm transition-shadow"
            >
              <p className="font-medium text-sm">{a.name}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-muted-foreground">{ad.length} open deal{ad.length !== 1 ? 's' : ''}</span>
                {hs && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    {STAGE_LABEL[hs] ?? hs}
                  </span>
                )}
              </div>
            </div>
          )
        })}
        {accounts.length === 0 && <p className="text-muted-foreground text-sm col-span-3">No accounts found.</p>}
      </div>

      {/* Active deals section */}
      <h2 className="text-lg font-semibold mb-3">Active Deals</h2>
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Account</th>
              <th className="text-left px-4 py-3 font-medium">Deal</th>
              <th className="text-left px-4 py-3 font-medium">Channel</th>
              <th className="text-left px-4 py-3 font-medium">Stage</th>
              <th className="text-left px-4 py-3 font-medium">Close Date</th>
              <th className="text-right px-4 py-3 font-medium">Device (€)</th>
              <th className="text-right px-4 py-3 font-medium">Service (€)</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {activeDeals.map(d => {
              const account = accounts.find(a => a.id === d.account_id)
              return (
                <tr
                  key={d.id}
                  onClick={() => navigate(`/deals/${d.id}`)}
                  className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                >
                  <td className="px-4 py-3 text-muted-foreground">{account?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-medium">{d.name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.channel === 'direct' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                      {d.channel === 'direct' ? 'Direct' : 'Reseller'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {STAGE_LABEL[d.stage] ?? d.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{d.expected_close_date ?? '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">€{(d.total_device_value ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right tabular-nums">€{(d.total_service_value ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {isStale(d) && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Stale</span>}
                      {isOverdue(d) && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Overdue</span>}
                    </div>
                  </td>
                </tr>
              )
            })}
            {activeDeals.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No active deals.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
