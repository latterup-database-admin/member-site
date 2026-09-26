import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  Bell,
  BookOpen,
  CalendarDays,
  CreditCard,
  HandHeart,
  Home,
  Menu,
  Search,
  Settings,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: Home },
  { to: '/classes', label: 'Classes', icon: BookOpen },
  { to: '/registration', label: 'Registration', icon: CalendarDays },
  { to: '/contributions', label: 'Contributions', icon: HandHeart },
  { to: '/payments', label: 'Payments', icon: CreditCard },
  { to: '/directory', label: 'Directory', icon: Users },
  { to: '/account', label: 'Account', icon: Settings },
]

function NavItems({ closeMenu }) {
  return navItems.map(({ to, label, icon: Icon }) => (
    <NavLink
      key={to}
      to={to}
      onClick={closeMenu}
      className={({ isActive }) => [
        'focus-ring flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition',
        isActive
          ? 'bg-brand-navy text-white shadow-sm'
          : 'text-brand-navy hover:bg-brand-sky/20',
      ].join(' ')}
    >
      <Icon size={18} aria-hidden="true" />
      {label}
    </NavLink>
  ))
}

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { portalContext, signOut } = useAuth()
  const person = portalContext?.person
  const name = person?.preferred_name || person?.first_name || 'Member'

  return (
    <div className="min-h-screen bg-stone-50 text-brand-taupe">
      <header className="sticky top-0 z-30 border-b border-brand-sand/40 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-4 sm:px-6">
          <button
            className="focus-ring rounded-lg p-2 text-brand-navy lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu />
          </button>

          <NavLink to="/dashboard" className="brand-title text-xl text-brand-navy sm:text-2xl">
            LATTER <span className="text-brand-sky">UP</span>
          </NavLink>

          <div className="ml-auto hidden max-w-md flex-1 items-center rounded-lg border border-brand-sand/50 bg-stone-50 px-3 md:flex">
            <Search size={17} className="text-brand-taupe/70" />
            <input
              type="search"
              placeholder="Search portal"
              className="w-full bg-transparent px-3 py-2 text-sm text-brand-navy outline-none placeholder:text-brand-taupe/60"
            />
          </div>

          <button className="focus-ring ml-auto rounded-lg p-2 text-brand-navy md:ml-0" aria-label="Notifications">
            <Bell size={20} />
          </button>

          <div className="hidden items-center gap-2 sm:flex">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-sky/25 text-brand-navy">
              <UserRound size={18} />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold text-brand-navy">{name}</p>
              <button onClick={signOut} className="focus-ring text-xs font-semibold text-brand-taupe hover:text-brand-navy">
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px]">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 border-r border-brand-sand/35 bg-white p-4 lg:block">
          <nav className="space-y-1">
            <NavItems />
          </nav>
          <div className="mt-8 rounded-xl border border-brand-sand/45 bg-brand-sand/10 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-junior">Need help?</p>
            <p className="mt-1 text-sm font-semibold text-brand-navy">Member Support</p>
            <p className="mt-1 text-xs leading-relaxed text-brand-taupe">Portal support and FAQs will live here.</p>
          </div>
        </aside>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-brand-navy/40" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />
          <aside className="relative h-full w-[min(86vw,320px)] bg-white p-4 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <span className="brand-title text-xl text-brand-navy">LATTER <span className="text-brand-sky">UP</span></span>
              <button className="focus-ring rounded-lg p-2 text-brand-navy" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
                <X />
              </button>
            </div>
            <nav className="space-y-1">
              <NavItems closeMenu={() => setMobileOpen(false)} />
            </nav>
          </aside>
        </div>
      )}
    </div>
  )
}
