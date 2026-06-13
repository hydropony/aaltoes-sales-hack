import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout({ currentUser, onSignOut }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar currentUser={currentUser} onSignOut={onSignOut} />
      <main className="flex-1 p-8 bg-background">
        <Outlet />
      </main>
    </div>
  )
}
