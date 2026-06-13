import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

const TABS = ['Overview', 'Contacts', 'Deals', 'Cases', 'Timeline', 'Notes']

const emptyContact = { first_name: '', last_name: '', email: '', phone: '', job_title: '', is_primary: false }

function AddContactModal({ accountId, onClose, onSaved }) {
  const [form, setForm] = useState(emptyContact)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function submit(e) {
    e.preventDefault()
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('First and last name are required.')
      return
    }
    setSaving(true)
    try {
      await api.createContact(accountId, form)
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
        <h2 className="text-lg font-semibold mb-4">Add Contact</h2>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">First name *</label>
              <input className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.first_name} onChange={(e) => set('first_name', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Last name *</label>
              <input className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.last_name} onChange={(e) => set('last_name', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Job title</label>
            <input className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.job_title} onChange={(e) => set('job_title', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Email</label>
            <input type="email" className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
            <input className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.is_primary} onChange={(e) => set('is_primary', e.target.checked)} />
            Primary contact
          </label>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Add Contact'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AccountDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState('Overview')
  const [account, setAccount] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [noteBody, setNoteBody] = useState('')
  const [showAddContact, setShowAddContact] = useState(false)

  useEffect(() => {
    api.getAccount(id).then(setAccount).catch(console.error).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    setData(null)
    const fetchers = {
      Contacts: () => api.getAccountContacts(id),
      Deals: () => api.getAccountDeals(id),
      Cases: () => api.getAccountCases(id),
      Timeline: () => api.getAccountTimeline(id),
      Notes: () => api.getAccountNotes(id),
    }
    if (fetchers[tab]) fetchers[tab]().then(setData).catch(console.error)
  }, [tab, id])

  async function submitNote() {
    if (!noteBody.trim()) return
    await api.createAccountNote(id, { body: noteBody, note_type: 'general' })
    setNoteBody('')
    api.getAccountNotes(id).then(setData)
  }

  if (loading) return <p className="text-muted-foreground text-sm p-8">Loading...</p>
  if (!account) return <p className="text-destructive text-sm p-8">Account not found.</p>

  return (
    <div>
      <button onClick={() => navigate('/accounts')} className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1">
        ← Accounts
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{account.name}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {[account.industry, account.region, account.country].filter(Boolean).join(' · ')}
          {' · '}
          <span className="capitalize">{account.status}</span>
        </p>
      </div>

      <div className="flex gap-1 border-b mb-6">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="grid grid-cols-2 gap-4">
          {[
            ['Industry', account.industry],
            ['Region', account.region],
            ['Country', account.country],
            ['Channel', account.channel],
            ['Status', account.status],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className="font-medium capitalize">{value ?? '—'}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'Contacts' && (
        <div>
          <div className="flex justify-between mb-4">
            <h2 className="font-semibold">Contacts</h2>
            <Button size="sm" onClick={() => setShowAddContact(true)}>+ Add Contact</Button>
          </div>
          {showAddContact && (
            <AddContactModal
              accountId={id}
              onClose={() => setShowAddContact(false)}
              onSaved={() => api.getAccountContacts(id).then(setData)}
            />
          )}
          <div className="rounded-lg border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium">Job Title</th>
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-left px-4 py-3 font-medium">Phone</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{c.first_name} {c.last_name} {c.is_primary && <span className="text-xs text-muted-foreground">(primary)</span>}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.job_title ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.email ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.phone ?? '—'}</td>
                  </tr>
                ))}
                {!data && <tr><td colSpan={4} className="px-4 py-4 text-center text-muted-foreground">Loading...</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Deals' && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Stage</th>
                <th className="text-left px-4 py-3 font-medium">Channel</th>
                <th className="text-left px-4 py-3 font-medium">Close Date</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((d) => (
                <tr key={d.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{d.name}</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{d.stage}</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{d.channel}</td>
                  <td className="px-4 py-3 text-muted-foreground">{d.expected_close_date ?? '—'}</td>
                </tr>
              ))}
              {data?.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No deals.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Cases' && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Subject</th>
                <th className="text-left px-4 py-3 font-medium">Priority</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/cases/${c.id}`)}>
                  <td className="px-4 py-3 font-medium">{c.subject}</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{c.priority}</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{c.status}</td>
                </tr>
              ))}
              {data?.length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">No cases.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Timeline' && (
        <div className="flex flex-col gap-3">
          {(data ?? []).map((e) => (
            <div key={e.id} className="flex gap-3 text-sm">
              <span className="text-muted-foreground whitespace-nowrap">{new Date(e.created_at).toLocaleDateString()}</span>
              <span>{e.description}</span>
            </div>
          ))}
          {data?.length === 0 && <p className="text-muted-foreground text-sm">No activity yet.</p>}
        </div>
      )}

      {tab === 'Notes' && (
        <div>
          <div className="flex gap-2 mb-6">
            <input
              className="flex-1 border rounded-md px-3 py-2 text-sm bg-background"
              placeholder="Add a note..."
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
            />
            <Button onClick={submitNote}>Add</Button>
          </div>
          <div className="flex flex-col gap-3">
            {(data ?? []).map((n) => (
              <div key={n.id} className="rounded-lg border bg-card p-4 text-sm">
                <p className="text-muted-foreground text-xs mb-1">{new Date(n.created_at).toLocaleString()}</p>
                <p>{n.body}</p>
              </div>
            ))}
            {data?.length === 0 && <p className="text-muted-foreground text-sm">No notes yet.</p>}
          </div>
        </div>
      )}
    </div>
  )
}
