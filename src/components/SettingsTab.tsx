import type { ReactNode } from 'react'
import { User, LogOut, Trash2, Link2 } from 'lucide-react'
import ImportCSV from './ImportCSV'
import ConnectWithingsButton from './ConnectWithingsButton'
import WithingsSync from './WithingsSync'
import PasskeySettings from './PasskeySettings'
import GoalJourneySettings from './GoalJourneySettings'
import type { Measurement, Profile } from '../types'

interface SettingsTabProps {
  profile: Profile | null
  measurements: Measurement[]
  refetch: () => Promise<void>
  refetchProfile: () => void | Promise<void>
  refetchWithings?: () => void | Promise<void>
  onProfile: () => void
  onSignOut: () => void
  onDeleteAll: () => void
  withingsConnected: boolean
  withingsLoading?: boolean
}

function SettingsSection({
  title,
  children,
  allowOverflow = false,
}: {
  title: string
  children: ReactNode
  allowOverflow?: boolean
}) {
  return (
    <section className="mb-8">
      <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3 px-1">
        {title}
      </h2>
      <div
        className={`bg-zinc-900 border border-zinc-700 rounded-2xl sm:rounded-3xl divide-y divide-zinc-800 ${
          allowOverflow ? 'overflow-visible' : 'overflow-hidden'
        }`}
      >
        {children}
      </div>
    </section>
  )
}

function SettingsRow({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`p-4 sm:p-5 ${className}`}>{children}</div>
  )
}

export default function SettingsTab({
  profile,
  measurements,
  refetch,
  refetchProfile,
  refetchWithings,
  onProfile,
  onSignOut,
  onDeleteAll,
  withingsConnected,
  withingsLoading = false,
}: SettingsTabProps) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-zinc-400 mt-1 text-sm sm:text-base">
          Profile, integrations, and account
        </p>
      </div>

      <SettingsSection title="Profile">
        <SettingsRow>
          <button
            type="button"
            onClick={onProfile}
            className="w-full flex items-center gap-3 text-left hover:opacity-90 transition-opacity"
          >
            <div className="p-2.5 rounded-xl bg-zinc-800 text-cyan-400">
              <User size={20} />
            </div>
            <div>
              <p className="font-medium text-white">Profile &amp; Goals</p>
              <p className="text-sm text-zinc-400 mt-0.5">Name, height, targets &amp; goal start date</p>
            </div>
          </button>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Goal Journey">
        <GoalJourneySettings
          profile={profile}
          measurements={measurements}
          onEditProfile={onProfile}
          onUpdate={refetchProfile}
        />
      </SettingsSection>

      <SettingsSection title="Connected Devices" allowOverflow>
        <SettingsRow>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-zinc-800 text-blue-400">
              <Link2 size={20} />
            </div>
            <div>
              <p className="font-medium text-white">Withings</p>
              <p className="text-sm text-zinc-400 mt-0.5">
                {withingsConnected
                  ? 'Scale connected — sync to import measurements'
                  : 'Connect your Withings scale to auto-import'}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <ConnectWithingsButton
              connected={withingsConnected}
              loading={withingsLoading}
              onConnectionChange={refetchWithings}
              className="w-full"
            />
            {withingsConnected && (
              <WithingsSync
                refetch={refetch}
                onAuthFailure={refetchWithings}
                fullWidth
              />
            )}
          </div>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Data">
        <SettingsRow>
          <p className="text-sm text-zinc-400 mb-3">Import historical measurements from a CSV file.</p>
          <ImportCSV refetch={refetch} className="sm:w-auto" />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Sign-in & Security">
        <SettingsRow>
          <PasskeySettings />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Account">
        <SettingsRow>
          <button
            type="button"
            onClick={onSignOut}
            className="w-full flex items-center gap-3 text-left text-zinc-200 hover:text-white transition-colors"
          >
            <LogOut size={18} className="text-zinc-400" />
            Sign Out
          </button>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Danger Zone">
        <SettingsRow>
          <p className="text-sm text-zinc-400 mb-3">
            Permanently delete all measurements. Withings sync history will also reset.
          </p>
          <button
            type="button"
            onClick={onDeleteAll}
            className="flex items-center justify-center gap-x-2 px-4 py-2.5 bg-red-600/90 hover:bg-red-600 text-white rounded-2xl text-sm transition-colors w-full sm:w-auto"
          >
            <Trash2 size={16} /> Delete All Measurements
          </button>
        </SettingsRow>
      </SettingsSection>
    </div>
  )
}