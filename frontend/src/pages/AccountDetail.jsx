import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { useCurrentUser } from '@/lib/UserContext'

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

// ── Timeline helpers ──────────────────────────────────────────────────────────

const EVENT_STYLES = {
  deal_created:        { color: 'bg-blue-100 text-blue-800',   label: 'Created' },
  deal_stage_changed:  { color: 'bg-blue-100 text-blue-800',   label: 'Stage changed' },
  deal_won:            { color: 'bg-green-100 text-green-800',  label: 'Won' },
  deal_lost:           { color: 'bg-red-100 text-red-800',      label: 'Lost' },
  case_opened:         { color: 'bg-yellow-100 text-yellow-800',label: 'Opened' },
  case_escalated:      { color: 'bg-orange-100 text-orange-800',label: 'Escalated' },
  case_in_progress:    { color: 'bg-blue-100 text-blue-800',    label: 'In progress' },
  case_resolved:       { color: 'bg-green-100 text-green-800',  label: 'Resolved' },
  case_closed:         { color: 'bg-muted text-muted-foreground', label: 'Closed' },
  offer_submitted:     { color: 'bg-blue-100 text-blue-800',   label: 'Submitted' },
  offer_approved:      { color: 'bg-green-100 text-green-800',  label: 'Approved' },
  offer_locked:        { color: 'bg-green-100 text-green-800',  label: 'Locked' },
  offer_rejected:      { color: 'bg-red-100 text-red-800',      label: 'Rejected' },
  offer_created:       { color: 'bg-muted text-muted-foreground', label: 'Draft' },
  note_added:          { color: 'bg-muted text-muted-foreground', label: 'Note' },
  contact_added:       { color: 'bg-muted text-muted-foreground', label: 'Contact' },
}

function fmtDateTime(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    + ' · '
    + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function EventRow({ event }) {
  const style = EVENT_STYLES[event.event_type] ?? { color: 'bg-muted text-muted-foreground', label: event.event_type }
  return (
    <div className="flex gap-3 items-start py-2.5 border-b last:border-0">
      <span className="text-xs text-muted-foreground whitespace-nowrap mt-0.5 w-40 shrink-0">
        {fmtDateTime(event.created_at)}
      </span>
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${style.color}`}>
        {style.label}
      </span>
      <span className="text-sm text-foreground">{event.summary}</span>
    </div>
  )
}

function TimelineByCase({ events, entityNames }) {
  const caseEvents = events.filter(e => e.entity_type === 'case')
  const otherEvents = events.filter(e => e.entity_type !== 'case')

  const groups = {}
  for (const e of caseEvents) {
    if (!groups[e.entity_id]) groups[e.entity_id] = []
    groups[e.entity_id].push(e)
  }

  const sortedGroups = Object.entries(groups).sort(
    ([, a], [, b]) => new Date(b[0].created_at) - new Date(a[0].created_at)
  )

  return (
    <div className="flex flex-col gap-4">
      {sortedGroups.map(([entityId, evts]) => (
        <div key={entityId} className="rounded-lg border bg-card overflow-hidden">
          <div className="px-4 py-2 bg-muted/40 border-b">
            <span className="text-sm font-semibold text-foreground">
              {entityNames[`case-${entityId}`] ?? `Case #${entityId}`}
            </span>
          </div>
          <div className="px-4">
            {evts.map(e => <EventRow key={e.id} event={e} />)}
          </div>
        </div>
      ))}
      {otherEvents.length > 0 && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-4 py-2 bg-muted/40 border-b">
            <span className="text-sm font-semibold text-foreground">Other activity</span>
          </div>
          <div className="px-4">
            {otherEvents.map(e => <EventRow key={e.id} event={e} />)}
          </div>
        </div>
      )}
      {events.length === 0 && <p className="text-muted-foreground text-sm">No activity yet.</p>}
    </div>
  )
}

function TimelineByDeal({ events, entityNames }) {
  const dealEvents = events.filter(e => e.entity_type === 'deal' || e.entity_type === 'offer')
  const otherEvents = events.filter(e => e.entity_type !== 'deal' && e.entity_type !== 'offer')

  const groups = {}
  for (const e of dealEvents) {
    const key = `deal-${e.entity_id}`
    if (!groups[key]) groups[key] = []
    groups[key].push(e)
  }

  const sortedGroups = Object.entries(groups).sort(
    ([, a], [, b]) => new Date(b[0].created_at) - new Date(a[0].created_at)
  )

  return (
    <div className="flex flex-col gap-4">
      {sortedGroups.map(([key, evts]) => (
        <div key={key} className="rounded-lg border bg-card overflow-hidden">
          <div className="px-4 py-2 bg-muted/40 border-b">
            <span className="text-sm font-semibold text-foreground">
              {entityNames[key] ?? `Deal #${evts[0].entity_id}`}
            </span>
          </div>
          <div className="px-4">
            {evts.map(e => <EventRow key={e.id} event={e} />)}
          </div>
        </div>
      ))}
      {otherEvents.length > 0 && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-4 py-2 bg-muted/40 border-b">
            <span className="text-sm font-semibold text-foreground">Other activity</span>
          </div>
          <div className="px-4">
            {otherEvents.map(e => <EventRow key={e.id} event={e} />)}
          </div>
        </div>
      )}
      {events.length === 0 && <p className="text-muted-foreground text-sm">No activity yet.</p>}
    </div>
  )
}

function TimelineFlat({ events }) {
  if (events.length === 0) return <p className="text-muted-foreground text-sm">No activity yet.</p>
  return (
    <div className="rounded-lg border bg-card overflow-hidden px-4">
      {events.map(e => <EventRow key={e.id} event={e} />)}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AccountDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const currentUser = useCurrentUser()
  const [tab, setTab] = useState('Overview')
  const [account, setAccount] = useState(null)
  const [data, setData] = useState(null)
  const [entityNames, setEntityNames] = useState({})   // { "deal-1": "Nokia HQ...", "case-2": "MDM failure..." }
  const [loading, setLoading] = useState(true)
  const [noteBody, setNoteBody] = useState('')
  const [noteType, setNoteType] = useState('general')
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
      Notes: () => api.getAccountNotes(id),
    }
    if (fetchers[tab]) {
      fetchers[tab]().then(setData).catch(console.error)
    } else if (tab === 'Timeline') {
      Promise.all([
        api.getAccountTimeline(id),
        api.getAccountDeals(id),
        api.getAccountCases(id),
      ]).then(([timeline, deals, cases]) => {
        setData(timeline)
        const names = {}
        for (const d of deals) names[`deal-${d.id}`] = d.name
        for (const c of cases) names[`case-${c.id}`] = c.subject
        setEntityNames(names)
      }).catch(console.error)
    }
  }, [tab, id])

  async function submitNote() {
    if (!noteBody.trim()) return
    await api.createAccountNote(id, { body: noteBody, note_type: noteType })
    setNoteBody('')
    setNoteType('general')
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
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              {currentUser?.role === 'tam' ? 'Activity grouped by case' :
               currentUser?.role === 'sm'  ? 'Activity grouped by deal' :
               'Activity'}
            </h2>
          </div>
          {!data && <p className="text-muted-foreground text-sm">Loading...</p>}
          {data && currentUser?.role === 'tam' && <TimelineByCase events={data} entityNames={entityNames} />}
          {data && currentUser?.role === 'sm'  && <TimelineByDeal events={data} entityNames={entityNames} />}
          {data && currentUser?.role !== 'tam' && currentUser?.role !== 'sm' && <TimelineFlat events={data} />}
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
            <select
              className="border rounded-md px-3 py-2 text-sm bg-background"
              value={noteType}
              onChange={(e) => setNoteType(e.target.value)}
            >
              <option value="general">General</option>
              <option value="internal">Internal</option>
              <option value="working">Working</option>
            </select>
            <Button onClick={submitNote}>Add</Button>
          </div>
          <div className="flex flex-col gap-3">
            {(data ?? []).map((n) => (
              <div key={n.id} className="rounded-lg border bg-card p-4 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-muted-foreground text-xs">{new Date(n.created_at).toLocaleString()}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                    n.note_type === 'working' ? 'bg-blue-100 text-blue-800' :
                    n.note_type === 'internal' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-muted text-muted-foreground'
                  }`}>{n.note_type}</span>
                </div>
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
