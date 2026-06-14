import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

const initialForm = {
  name: '',
  sku: '',
  item_type: 'device',
  description: '',
  unit_price: '',
  currency: 'EUR',
  invoicing_model: '',
  term_years: '',
}

const invoicingLabels = {
  one_off: 'One-off',
  fixed_term: 'Fixed term',
  monthly_recurring: 'Monthly recurring',
}

function EditRow({ item, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: item.name,
    description: item.description ?? '',
    unit_price: item.unit_price,
    invoicing_model: item.invoicing_model ?? '',
    term_years: item.term_years ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        unit_price: Number(form.unit_price),
        invoicing_model: form.invoicing_model || null,
        term_years: form.term_years ? Number(form.term_years) : null,
      }
      const updated = await api.updateCatalogItem(item.id, payload)
      onSave(updated)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr className="border-b bg-muted/20">
      <td className="px-4 py-2" colSpan={6}>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Name</label>
            <input
              className="border rounded-md px-3 py-1.5 text-sm bg-background w-48"
              value={form.name}
              onChange={e => set('name', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Unit Price (€)</label>
            <input
              type="number" min="0" step="0.01"
              className="border rounded-md px-3 py-1.5 text-sm bg-background w-32"
              value={form.unit_price}
              onChange={e => set('unit_price', e.target.value)}
            />
          </div>
          {item.item_type === 'service' && (
            <>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Invoicing</label>
                <select
                  className="border rounded-md px-3 py-1.5 text-sm bg-background"
                  value={form.invoicing_model}
                  onChange={e => set('invoicing_model', e.target.value)}
                >
                  <option value="">Select…</option>
                  <option value="one_off">One-off</option>
                  <option value="fixed_term">Fixed term</option>
                  <option value="monthly_recurring">Monthly recurring</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Term (years)</label>
                <input
                  type="number" min="1"
                  className="border rounded-md px-3 py-1.5 text-sm bg-background w-24"
                  value={form.term_years}
                  onChange={e => set('term_years', e.target.value)}
                />
              </div>
            </>
          )}
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground block mb-1">Description</label>
            <input
              className="border rounded-md px-3 py-1.5 text-sm bg-background w-full"
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>
          <div className="flex gap-2 pb-0.5">
            <Button size="sm" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
          </div>
        </div>
        {error && <p className="text-destructive text-xs mt-2">{error}</p>}
      </td>
    </tr>
  )
}

export default function Catalog() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    api.getCatalog()
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const stats = useMemo(() => {
    const devices = items.filter((item) => item.item_type === 'device').length
    const services = items.filter((item) => item.item_type === 'service').length
    return [
      { label: 'Active Items', value: items.length },
      { label: 'Devices', value: devices },
      { label: 'Services', value: services },
    ]
  }, [items])

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === 'item_type' && value === 'device' ? { invoicing_model: '', term_years: '' } : {}),
    }))
  }

  async function handleCreate(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      name: form.name,
      sku: form.sku,
      item_type: form.item_type,
      description: form.description || null,
      unit_price: Number(form.unit_price),
      currency: form.currency,
      invoicing_model: form.item_type === 'service' ? form.invoicing_model || null : null,
      term_years: form.item_type === 'service' && form.term_years ? Number(form.term_years) : null,
    }

    try {
      const created = await api.createCatalogItem(payload)
      setItems((current) => [...current, created])
      setForm(initialForm)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleRetire(itemId) {
    setError('')
    try {
      await api.retireCatalogItem(itemId)
      setItems((current) => current.filter((item) => item.id !== itemId))
    } catch (err) {
      setError(err.message)
    }
  }

  function handleSaveEdit(updated) {
    setItems(current => current.map(item => item.id === updated.id ? updated : item))
    setEditingId(null)
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Catalog Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Finance-managed products, services, pricing, and offer line items.</p>
        </div>
      </div>

      <div className="grid gap-4 mb-6 md:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border bg-card p-5">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="text-3xl font-bold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {error && <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Item</th>
                <th className="text-left px-4 py-3 font-medium">SKU</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Price</th>
                <th className="text-left px-4 py-3 font-medium">Invoicing</th>
                <th className="text-left px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <>
                  <tr key={item.id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.description ?? 'No description'}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.sku}</td>
                    <td className="px-4 py-3 capitalize">{item.item_type}</td>
                    <td className="px-4 py-3">{item.currency} {item.unit_price.toLocaleString()}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.invoicing_model ? invoicingLabels[item.invoicing_model] : '—'}
                      {item.term_years ? ` · ${item.term_years}y` : ''}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button
                          variant="outline" size="sm"
                          onClick={() => setEditingId(editingId === item.id ? null : item.id)}
                        >
                          {editingId === item.id ? 'Cancel' : 'Edit'}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleRetire(item.id)}>Retire</Button>
                      </div>
                    </td>
                  </tr>
                  {editingId === item.id && (
                    <EditRow
                      key={`edit-${item.id}`}
                      item={item}
                      onSave={handleSaveEdit}
                      onCancel={() => setEditingId(null)}
                    />
                  )}
                </>
              ))}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No active catalog items.</td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading catalog...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <form onSubmit={handleCreate} className="rounded-lg border bg-card p-5 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Add item</h2>
            <p className="text-sm text-muted-foreground">Finance users can create new catalog entries.</p>
          </div>

          <label className="block text-sm">
            <span className="text-muted-foreground">Name</span>
            <input className="mt-1 w-full rounded-md border bg-background px-3 py-2" value={form.name} onChange={(event) => updateField('name', event.target.value)} required />
          </label>

          <label className="block text-sm">
            <span className="text-muted-foreground">SKU</span>
            <input className="mt-1 w-full rounded-md border bg-background px-3 py-2" value={form.sku} onChange={(event) => updateField('sku', event.target.value)} required />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-muted-foreground">Type</span>
              <select className="mt-1 w-full rounded-md border bg-background px-3 py-2" value={form.item_type} onChange={(event) => updateField('item_type', event.target.value)}>
                <option value="device">Device</option>
                <option value="service">Service</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Currency</span>
              <input className="mt-1 w-full rounded-md border bg-background px-3 py-2" value={form.currency} onChange={(event) => updateField('currency', event.target.value)} required />
            </label>
          </div>

          <label className="block text-sm">
            <span className="text-muted-foreground">Unit price</span>
            <input className="mt-1 w-full rounded-md border bg-background px-3 py-2" type="number" min="0" step="0.01" value={form.unit_price} onChange={(event) => updateField('unit_price', event.target.value)} required />
          </label>

          {form.item_type === 'service' && (
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="text-muted-foreground">Invoicing</span>
                <select className="mt-1 w-full rounded-md border bg-background px-3 py-2" value={form.invoicing_model} onChange={(event) => updateField('invoicing_model', event.target.value)}>
                  <option value="">Select...</option>
                  <option value="one_off">One-off</option>
                  <option value="fixed_term">Fixed term</option>
                  <option value="monthly_recurring">Monthly recurring</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-muted-foreground">Term years</span>
                <input className="mt-1 w-full rounded-md border bg-background px-3 py-2" type="number" min="1" value={form.term_years} onChange={(event) => updateField('term_years', event.target.value)} />
              </label>
            </div>
          )}

          <label className="block text-sm">
            <span className="text-muted-foreground">Description</span>
            <textarea className="mt-1 w-full rounded-md border bg-background px-3 py-2" rows={3} value={form.description} onChange={(event) => updateField('description', event.target.value)} />
          </label>

          <Button type="submit" className="w-full" disabled={saving}>{saving ? 'Adding...' : 'Add catalog item'}</Button>
        </form>
      </div>
    </div>
  )
}
