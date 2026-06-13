import { Button } from '@/components/ui/button'
import { useState } from 'react'

const stages = ['Prospecting', 'Qualified', 'Proposal', 'Negotiation', 'Won']

const mockDeals = [
  { id: 1, name: 'Acme Corp — Enterprise', value: 120000, stage: 'Proposal', type: 'Direct', forecast: 12 },
  { id: 2, name: 'Nordic Telecom — SMB Bundle', value: 45000, stage: 'Qualified', type: 'Reseller', forecast: 8 },
  { id: 3, name: 'SecureBank — Pilot', value: 20000, stage: 'Negotiation', type: 'Direct', forecast: 3 },
]

export default function Deals() {
  const [deals] = useState(mockDeals)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Deal Pipeline</h1>
        <Button>+ New Deal</Button>
      </div>
      <div className="grid grid-cols-5 gap-3">
        {stages.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage === stage)
          return (
            <div key={stage} className="bg-muted/40 rounded-lg p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">{stage}</p>
              <div className="flex flex-col gap-2">
                {stageDeals.map((deal) => (
                  <div key={deal.id} className="bg-card border rounded-md p-3 cursor-pointer hover:shadow-sm transition-shadow">
                    <p className="text-sm font-medium leading-tight mb-2">{deal.name}</p>
                    <p className="text-base font-bold">€{deal.value.toLocaleString()}</p>
                    <div className="flex gap-1 mt-2">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{deal.type}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{deal.forecast}mo</span>
                    </div>
                  </div>
                ))}
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
