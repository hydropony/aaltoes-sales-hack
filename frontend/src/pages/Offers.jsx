import { Button } from '@/components/ui/button'
import { useState } from 'react'

const mockOffers = [
  { id: 1, deal: 'Acme Corp — Enterprise', status: 'Draft', created: '2026-06-10', value: 120000 },
  { id: 2, deal: 'SecureBank — Pilot', status: 'Sent', created: '2026-06-08', value: 20000 },
]

const statusColors = {
  Draft: 'bg-muted text-muted-foreground',
  Sent: 'bg-primary/10 text-primary',
  Accepted: 'bg-green-100 text-green-800',
}

export default function Offers() {
  const [offers] = useState(mockOffers)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Offers</h1>
        <Button>+ Generate Offer</Button>
      </div>
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Deal</th>
              <th className="text-left px-4 py-3 font-medium">Value</th>
              <th className="text-left px-4 py-3 font-medium">Created</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((o) => (
              <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{o.deal}</td>
                <td className="px-4 py-3">€{o.value.toLocaleString()}</td>
                <td className="px-4 py-3 text-muted-foreground">{o.created}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[o.status]}`}>
                    {o.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Button variant="outline" size="sm">View</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
