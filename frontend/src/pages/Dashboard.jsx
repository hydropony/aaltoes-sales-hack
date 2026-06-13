import { Button } from '@/components/ui/button'

const stats = [
  { label: 'Open Deals', value: '24' },
  { label: 'Pipeline Value', value: '€1.2M' },
  { label: 'Won This Month', value: '6' },
  { label: 'Open Cases', value: '11' },
]

export default function Dashboard() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 mb-8 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border bg-card p-5">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="text-3xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <p className="text-muted-foreground text-sm">No recent activity yet.</p>
      </div>
    </div>
  )
}
