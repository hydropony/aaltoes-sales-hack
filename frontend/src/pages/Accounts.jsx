import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

const emptyAccount = { name: '', industry: '', country: '', region: '', channel: 'direct', status: 'prospect' }

function CreateAccountModal({ onClose, onSaved }) {
  const [form, setForm] = useState(emptyAccount)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required.'); return }
    setSaving(true)
    try {
      await api.createAccount(form)
      onSaved()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-card border rounded-xl shadow-lg w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">New Account</h2>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Name *</label>
            <input className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Industry</label>
              <input className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.industry} onChange={(e) => set('industry', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Country</label>
              <input className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.country} onChange={(e) => set('country', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Region</label>
            <input className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.region} onChange={(e) => set('region', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Channel</label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.channel} onChange={(e) => set('channel', e.target.value)}>
                <option value="direct">Direct</option>
                <option value="reseller">Reseller</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Status</label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="prospect">Prospect</option>
                <option value="active">Active</option>
                <option value="churned">Churned</option>
              </select>
            </div>
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Create Account'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Accounts() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const navigate = useNavigate()

  function loadAccounts() {
    api.getAccounts().then(setAccounts).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }

  useEffect(() => { loadAccounts() }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Accounts</h1>
        <Button onClick={() => setShowCreate(true)}>+ New Account</Button>
      </div>

      {showCreate && <CreateAccountModal onClose={() => setShowCreate(false)} onSaved={loadAccounts} />}

      {loading && <p className="text-muted-foreground text-sm">Loading...</p>}
      {error && <p className="text-destructive text-sm">Error: {error}</p>}

      {!loading && !error && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Industry</th>
                <th className="text-left px-4 py-3 font-medium">Region</th>
                <th className="text-left px-4 py-3 font-medium">Channel</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => navigate(`/accounts/${a.id}`)}
                  className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                >
                  <td className="px-4 py-3 font-medium">{a.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.industry ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.region ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{a.channel ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-medium capitalize">
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
              {accounts.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No accounts found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
