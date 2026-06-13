import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

const emptyCase = { account_id: '', subject: '', description: '', priority: 'medium', service_id: '', customer_contact_id: '' }

function CreateCaseModal({ onClose, onSaved }) {
  const [form, setForm] = useState(emptyCase)
  const [accounts, setAccounts] = useState([])
  const [contacts, setContacts] = useState([])
  const [services, setServices] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getAccounts().then(setAccounts).catch(console.error)
    api.getCatalog().then((items) => setServices(items.filter((i) => i.item_type === 'service'))).catch(console.error)
  }, [])

  useEffect(() => {
    setContacts([])
    set('customer_contact_id', '')
    if (form.account_id) {
      api.getAccountContacts(form.account_id).then(setContacts).catch(console.error)
    }
  }, [form.account_id])

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function submit(e) {
    e.preventDefault()
    if (!form.account_id || !form.subject.trim()) {
      setError('Account and subject are required.')
      return
    }
    setSaving(true)
    try {
      await api.createCase({
        ...form,
        account_id: Number(form.account_id),
        service_id: form.service_id ? Number(form.service_id) : null,
        customer_contact_id: form.customer_contact_id ? Number(form.customer_contact_id) : null,
      })
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
        <h2 className="text-lg font-semibold mb-4">Create Case</h2>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Account *</label>
            <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.account_id} onChange={(e) => set('account_id', e.target.value)}>
              <option value="">Select account...</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Contact</label>
            <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.customer_contact_id} onChange={(e) => set('customer_contact_id', e.target.value)} disabled={!form.account_id}>
              <option value="">{form.account_id ? 'Select contact...' : 'Select account first'}</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Subject *</label>
            <input className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.subject} onChange={(e) => set('subject', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Description</label>
            <textarea className="w-full border rounded-md px-3 py-2 text-sm bg-background" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
            <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Service</label>
            <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.service_id} onChange={(e) => set('service_id', e.target.value)}>
              <option value="">None</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Create Case'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

const priorityColors = {
  high: 'bg-destructive/10 text-destructive',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-muted text-muted-foreground',
}

function daysSince(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export default function Cases() {
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const navigate = useNavigate()

  function loadCases() {
    api.getCases().then(setCases).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => {
    loadCases()
  }, [])

  const sorted = [...cases].sort((a, b) => {
    const p = { high: 0, medium: 1, low: 2 }
    return (p[a.priority] ?? 1) - (p[b.priority] ?? 1) || daysSince(a.created_at) - daysSince(b.created_at)
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Cases</h1>
        <Button onClick={() => setShowCreate(true)}>+ New Case</Button>
      </div>

      {showCreate && (
        <CreateCaseModal onClose={() => setShowCreate(false)} onSaved={loadCases} />
      )}

      {loading && <p className="text-muted-foreground text-sm">Loading...</p>}

      {!loading && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Subject</th>
                <th className="text-left px-4 py-3 font-medium">Priority</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Age</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => (
                <tr key={c.id} onClick={() => navigate(`/cases/${c.id}`)} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer">
                  <td className="px-4 py-3 font-medium">{c.subject}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${priorityColors[c.priority] ?? ''}`}>
                      {c.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{c.status}</td>
                  <td className="px-4 py-3 text-muted-foreground">{daysSince(c.created_at)}d</td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No cases found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
