import { NavLink } from 'react-router-dom'

const NAV_BY_ROLE = {
  rep: [
    { to: '/rep',      label: 'My Dashboard' },
    { to: '/accounts', label: 'Accounts' },
    { to: '/pipeline', label: 'Pipeline' },
    { to: '/offers',   label: 'Offers' },
    { to: '/cases',    label: 'Cases' },
  ],
  tam: [
    { to: '/tam',      label: 'My Dashboard' },
    { to: '/accounts', label: 'Accounts' },
    { to: '/cases',    label: 'Cases' },
  ],
  sm: [
    { to: '/',         label: 'Dashboard' },
    { to: '/accounts', label: 'Accounts' },
    { to: '/pipeline', label: 'Pipeline' },
    { to: '/offers',   label: 'Offers' },
    { to: '/cases',    label: 'Cases' },
    { to: '/deals',    label: 'Deals' },
  ],
  finance: [
    { to: '/',         label: 'Dashboard' },
    { to: '/offers',   label: 'Offers' },
    { to: '/catalog',  label: 'Catalog' },
  ],
}

export default function Sidebar({ currentUser, onSignOut }) {
  const links = NAV_BY_ROLE[currentUser?.role] ?? []

  return (
    <aside className="w-56 flex-none min-h-screen bg-sidebar border-r border-sidebar-border flex flex-col">
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
