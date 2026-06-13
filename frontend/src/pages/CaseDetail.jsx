import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

const priorityColors = {
  high: 'bg-destructive/10 text-destructive',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-muted text-muted-foreground',
}

export default function CaseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [caseData, setCaseData] = useState(null)
  const [notes, setNotes] = useState([])
  const [noteBody, setNoteBody] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.getCase(id), api.getCaseNotes(id)])
      .then(([c, n]) => { setCaseData(c); setNotes(n) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  async function submitNote() {
    if (!noteBody.trim()) return
    await api.createCaseNote(id, { body: noteBody, note_type: 'general' })
    setNoteBody('')
    api.getCaseNotes(id).then(setNotes)
  }

  async function updateStatus(status) {
    const updated = await api.updateCase(id, { status })
    setCaseData(updated)
  }

  if (loading) return <p className="text-muted-foreground text-sm p-8">Loading...</p>
  if (!caseData) return <p className="text-destructive text-sm p-8">Case not found.</p>

  return (
    <div>
      <button onClick={() => navigate('/cases')} className="text-sm text-muted-foreground hover:text-foreground mb-4">
        ← Cases
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{caseData.subject}</h1>
          <p className="text-muted-foreground text-sm mt-1">{caseData.description}</p>
        </div>
        <div className="flex gap-2">
          {caseData.status !== 'resolved' && (
            <Button variant="outline" size="sm" onClick={() => updateStatus('resolved')}>Mark Resolved</Button>
          )}
          {caseData.status === 'open' && (
            <Button size="sm" onClick={() => updateStatus('in_progress')}>Start Progress</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Priority</p>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${priorityColors[caseData.priority] ?? ''}`}>
            {caseData.priority}
          </span>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Status</p>
          <p className="font-medium capitalize">{caseData.status}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Escalated</p>
          <p className="font-medium">{caseData.is_escalated ? 'Yes' : 'No'}</p>
        </div>
      </div>

      <div>
        <h2 className="font-semibold mb-4">Notes</h2>
        <div className="flex gap-2 mb-4">
          <input
            className="flex-1 border rounded-md px-3 py-2 text-sm bg-background"
            placeholder="Add a note..."
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
          />
          <Button onClick={submitNote}>Add</Button>
        </div>
        <div className="flex flex-col gap-3">
          {notes.map((n) => (
            <div key={n.id} className="rounded-lg border bg-card p-4 text-sm">
              <p className="text-muted-foreground text-xs mb-1">{new Date(n.created_at).toLocaleString()}</p>
              <p>{n.body}</p>
            </div>
          ))}
          {notes.length === 0 && <p className="text-muted-foreground text-sm">No notes yet.</p>}
        </div>
      </div>
    </div>
  )
}
