import { useState } from 'react'
import { LogOut, Menu, X } from 'lucide-react'
import ImportCSV from './ImportCSV'
import WithingsSync from './WithingsSync'

interface DashboardHeaderProps {
  refetch: () => Promise<void>
  onProfile: () => void
  onSignOut: () => void
}

export default function DashboardHeader({ refetch, onProfile, onSignOut }: DashboardHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = () => setMenuOpen(false)

  const navButtonClass =
    'flex items-center justify-center gap-x-2 px-4 py-2.5 rounded-2xl text-sm transition-colors w-full lg:w-auto'

  return (
    <header className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-x-2 sm:gap-x-3 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 bg-emerald-500 rounded-2xl flex items-center justify-center">
            <span className="text-white text-xl sm:text-2xl">🏋️</span>
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-xl sm:text-2xl lg:text-3xl tracking-tighter block truncate">
              RecompTrack
            </span>
            <span className="text-emerald-400 text-[10px] sm:text-xs block -mt-0.5 sm:-mt-1.5">
              FFMI + BODY RECOMP
            </span>
          </div>
        </div>

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
          <a
            href="/api/withings/auth"
            className={`${navButtonClass} bg-blue-600 hover:bg-blue-700`}
          >
            Connect Withings
          </a>
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
          <a
            href="/api/withings/auth"
            onClick={closeMenu}
            className={`${navButtonClass} bg-blue-600 hover:bg-blue-700`}
          >
            Connect Withings
          </a>
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