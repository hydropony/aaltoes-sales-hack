import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/accounts', label: 'Accounts' },
  { to: '/deals', label: 'Deal Pipeline' },
  { to: '/cases', label: 'Cases' },
  { to: '/tam', label: 'TAM Dashboard' },
  { to: '/offers', label: 'Offers' },
]

export default function Sidebar({ currentUser, onSignOut }) {
  return (
    <aside className="w-56 min-h-screen bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="px-6 py-5 border-b border-sidebar-border">
        <span className="font-semibold text-lg text-sidebar-foreground">HMD Secure CRM</span>
      </div>
      <nav className="flex flex-col gap-1 p-3 flex-1">
        {links.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-sidebar-border p-4 space-y-2">
        <div className="text-sm text-sidebar-foreground">
          <div className="font-medium">{currentUser?.full_name ?? 'No user selected'}</div>
          <div className="text-xs text-muted-foreground capitalize">{currentUser?.role ?? 'signed out'}</div>
        </div>
        {currentUser && (
          <button
            type="button"
            onClick={onSignOut}
            className="w-full px-3 py-2 rounded-md text-sm font-medium bg-sidebar-accent text-sidebar-accent-foreground hover:opacity-90 transition-colors"
          >
            Sign out
          </button>
        )}
      </div>
    </aside>
  )
}
