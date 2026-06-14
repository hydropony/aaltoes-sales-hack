import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'

const POLL_MS = 30_000

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)
  const [marking, setMarking] = useState(null)
  const panelRef = useRef(null)

  function load() {
    api.getNotifications()
      .then(setNotifications)
      .catch(() => {})   // silently swallow — badge just won't update
  }

  useEffect(() => {
    load()
    const id = setInterval(load, POLL_MS)
    return () => clearInterval(id)
  }, [])

  // Close panel on outside click
  useEffect(() => {
    if (!open) return
    function onClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  async function markRead(notification) {
    if (marking === notification.id) return
    setMarking(notification.id)
    try {
      await api.markNotificationRead(notification.id)
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id))
    } catch {
      // swallow — user can retry
    } finally {
      setMarking(null)
    }
  }

  async function markAllRead() {
    const unread = [...notifications]
    setNotifications([])
    setOpen(false)
    await Promise.allSettled(unread.map((n) => api.markNotificationRead(n.id)))
    // If any failed, re-fetch to restore them
    load()
  }

  const count = notifications.length

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        aria-label={`Notifications${count > 0 ? `, ${count} unread` : ''}`}
      >
        <span className="flex items-center gap-2">
          <BellIcon />
          Notifications
        </span>
        {count > 0 && (
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold tabular-nums">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 rounded-lg border bg-card shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {count > 0 ? `${count} unread` : 'All caught up'}
            </span>
            {count > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto">
            {count === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No unread notifications.</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => markRead(n)}
                  disabled={marking === n.id}
                  className="w-full text-left px-3 py-3 border-b last:border-0 hover:bg-muted/50 transition-colors disabled:opacity-50"
                >
                  <p className="text-xs font-medium text-foreground leading-snug">{n.title}</p>
                  {n.body && (
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">{n.body}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function BellIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}
