import { Camera, Home, LineChart, List } from 'lucide-react'
import type { TabId } from '../types/navigation'
import { BOTTOM_TABS, TAB_LABELS } from '../types/navigation'

interface BottomTabBarProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

const TAB_ICONS: Record<(typeof BOTTOM_TABS)[number], typeof Home> = {
  home: Home,
  trends: LineChart,
  log: List,
  photos: Camera,
}

export default function BottomTabBar({ activeTab, onTabChange }: BottomTabBarProps) {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-zinc-900/95 backdrop-blur-md border-t border-zinc-800"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Main navigation"
    >
      <div className="max-w-5xl mx-auto flex items-stretch">
        {BOTTOM_TABS.map((id) => {
          const Icon = TAB_ICONS[id]
          const isActive = activeTab === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 px-1 transition-colors ${
                isActive ? 'text-cyan-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={22} strokeWidth={isActive ? 2.25 : 1.75} />
              <span
                className={`text-[10px] sm:text-xs font-medium ${
                  isActive ? 'text-cyan-400' : ''
                }`}
              >
                {TAB_LABELS[id]}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
