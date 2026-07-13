import {
  LayoutDashboard,
  ListChecks,
  Loader2,
  MessagesSquare,
  Send,
  Settings,
  UserRound,
  Users,
  Wrench,
} from 'lucide-react'
import { Navigate, NavLink, Outlet } from 'react-router-dom'
import { DeviceSwitcher } from '@/components/layout/device-switcher'
import { Logo } from '@/components/layout/logo'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { WsBadge } from '@/components/layout/ws-badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PasskeyDialog } from '@/features/session/passkey-dialog'
import { cn } from '@/lib/utils'
import { useConnection } from '@/stores/connection'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/send', label: 'Send', icon: Send },
  { to: '/messages', label: 'Message actions', icon: ListChecks },
  { to: '/groups', label: 'Groups', icon: Users },
  { to: '/chats', label: 'Chats', icon: MessagesSquare },
  { to: '/account', label: 'Account', icon: UserRound },
  { to: '/misc', label: 'Misc', icon: Wrench },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function AppShell() {
  const status = useConnection((state) => state.status)

  if (status === 'booting') {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (status !== 'connected') {
    return <Navigate to="/connect" replace />
  }

  return (
    <div className="flex min-h-svh">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-14 items-center border-b px-4">
          <Logo />
        </div>
        <ScrollArea className="flex-1 px-2 py-3">
          <nav className="flex flex-col gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
                  )
                }
              >
                <Icon className="size-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </ScrollArea>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-2 border-b px-4">
          <div className="flex items-center gap-2 md:hidden">
            <Logo />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <DeviceSwitcher />
            <WsBadge />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
      <PasskeyDialog />
    </div>
  )
}
