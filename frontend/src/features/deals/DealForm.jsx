import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { validStages, STAGE_API } from '@/lib/stages'

const emptyDeal = {
  account_id: '',
  name: '',
  channel: 'direct',
  stage: 'interest_shown',
  expected_close_date: '',
  is_pilot: false,
  parent_deal_id: null,
}

export default function DealForm({ accounts, deals, onClose, onSaved }) {
  const [form, setForm] = useState(emptyDeal)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  // Reset stage when channel changes
  useEffect(() => {
    const stages = validStages(form.channel)
    const stageValues = stages.map(s => STAGE_API[s])
    if (!stageValues.includes(form.stage)) {
      set('stage', stageValues[0])
    }
  }, [form.channel])

  const stageOptions = validStages(form.channel)

  // Parent deal options — won/active deals on the same account (only when not pilot)
  const parentOptions = !form.is_pilot && form.account_id
    ? (deals ?? []).filter(d =>
        d.account_id === Number(form.account_id) &&
        d.stage !== 'lost'
      )
    : []

  async function submit(e) {
    e.preventDefault()
    if (!form.account_id) { setError('Account is required.'); return }
    if (!form.name.trim()) { setError('Deal name is required.'); return }

    setSaving(true)
    try {
      const payload = {
        ...form,
        account_id: Number(form.account_id),
        expected_close_date: form.expected_close_date || null,
        parent_deal_id: form.parent_deal_id ? Number(form.parent_deal_id) : null,
      }
      await api.createDeal(payload)
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-card border rounded-xl shadow-lg w-full max-w-lg p-6">
        <h2 className="text-lg font-semibold mb-4">New Deal</h2>
        <form onSubmit={submit} className="flex flex-col gap-3">

          {/* Account picker */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Account *</label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              value={form.account_id}
              onChange={e => set('account_id', e.target.value)}
            >
              <option value="">Select account...</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          {/* Deal name */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Deal Name *</label>
            <input
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              value={form.name}
              onChange={e => set('name', e.target.value)}
            />
          </div>

          {/* Channel radio */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Channel</label>
            <div className="flex gap-4">
              {['direct', 'reseller'].map(ch => (
                <label key={ch} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="channel"
                    value={ch}
                    checked={form.channel === ch}
                    onChange={() => set('channel', ch)}
                  />
                  <span className="capitalize">{ch}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Stage picker */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Stage</label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              value={form.stage}
              onChange={e => set('stage', e.target.value)}
            >
              {stageOptions.map(label => (
                <option key={label} value={STAGE_API[label]}>{label}</option>
              ))}
            </select>
          </div>

          {/* Expected close date */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Expected Close Date</label>
            <input
              type="date"
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              value={form.expected_close_date}
              onChange={e => set('expected_close_date', e.target.value)}
            />
          </div>

          {/* Pilot checkbox */}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_pilot}
              onChange={e => {
                set('is_pilot', e.target.checked)
                if (e.target.checked) set('parent_deal_id', null)
              }}
            />
            Pilot deal
          </label>

          {/* Follow-on parent deal */}
          {!form.is_pilot && parentOptions.length > 0 && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Follow-on from (parent deal)</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={form.parent_deal_id ?? ''}
                onChange={e => set('parent_deal_id', e.target.value || null)}
              >
                <option value="">None</option>
                {parentOptions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}

          {error && <p className="text-destructive text-sm">{error}</p>}
          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Deal'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
