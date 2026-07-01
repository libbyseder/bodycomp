import { useState } from 'react'
import { LogOut, Menu, X } from 'lucide-react'
import BodyTrendBrand from './BodyTrendBrand'
import ImportCSV from './ImportCSV'
import WithingsSync from './WithingsSync'
import ConnectWithingsButton from './ConnectWithingsButton'

interface DashboardHeaderProps {
  refetch: () => Promise<void>
  onProfile: () => void
  onSignOut: () => void
  withingsConnected: boolean
  withingsLoading?: boolean
}

export default function DashboardHeader({
  refetch,
  onProfile,
  onSignOut,
  withingsConnected,
  withingsLoading = false,
}: DashboardHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = () => setMenuOpen(false)

  const navButtonClass =
    'flex items-center justify-center gap-x-2 px-4 py-2.5 rounded-2xl text-sm transition-colors w-full lg:w-auto'

  return (
    <header className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between gap-3">
        <BodyTrendBrand compact />

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="lg:hidden p-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 transition-colors shrink-0"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <nav className="hidden lg:flex items-center gap-x-2 flex-wrap justify-end">
          <ImportCSV refetch={refetch} />
          <ConnectWithingsButton
            connected={withingsConnected}
            loading={withingsLoading}
            className={navButtonClass}
          />
          <WithingsSync refetch={refetch} />
          <button onClick={onProfile} className={`${navButtonClass} bg-zinc-800 hover:bg-zinc-700`}>
            Profile
          </button>
          <button onClick={onSignOut} className={`${navButtonClass} bg-zinc-800 hover:bg-zinc-700`}>
            <LogOut size={16} /> Sign Out
          </button>
        </nav>
      </div>

      {menuOpen && (
        <nav className="lg:hidden mt-4 p-4 bg-zinc-900 border border-zinc-700 rounded-2xl flex flex-col gap-2">
          <ImportCSV refetch={refetch} />
          <ConnectWithingsButton
            connected={withingsConnected}
            loading={withingsLoading}
            className={navButtonClass}
            onNavigate={closeMenu}
          />
          <WithingsSync refetch={refetch} fullWidth />
          <button
            onClick={() => { closeMenu(); onProfile() }}
            className={`${navButtonClass} bg-zinc-800 hover:bg-zinc-700`}
          >
            Profile
          </button>
          <button
            onClick={() => { closeMenu(); onSignOut() }}
            className={`${navButtonClass} bg-zinc-800 hover:bg-zinc-700`}
          >
            <LogOut size={16} /> Sign Out
          </button>
        </nav>
      )}
    </header>
  )
}