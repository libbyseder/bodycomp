import { useCallback, useEffect, useState } from 'react'
import { KeyRound, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatPasskeyError, PASSKEY_SETUP_STEPS } from '../lib/passkey'
import { useAuth } from '../contexts/AuthContext'
import { usePasskeyAvailability } from '../hooks/usePasskeyAvailability'
import toast from 'react-hot-toast'

interface PasskeyItem {
  id: string
  friendly_name?: string
  created_at: string
  last_used_at?: string
}

export default function PasskeySettings() {
  const { registerPasskey } = useAuth()
  const { browserSupported, secureContext, serverEnabled, ready, loading: availabilityLoading } =
    usePasskeyAvailability()
  const [passkeys, setPasskeys] = useState<PasskeyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const fetchPasskeys = useCallback(async () => {
    if (!ready) {
      setPasskeys([])
      setLoading(false)
      return
    }

    setLoading(true)

    const { data, error } = await supabase.auth.passkey.list()

    if (error) {
      console.error('Failed to list passkeys:', error)
      toast.error(formatPasskeyError(error), { duration: 6000 })
      setPasskeys([])
    } else {
      setPasskeys(data ?? [])
    }

    setLoading(false)
  }, [ready])

  useEffect(() => {
    void fetchPasskeys()
  }, [fetchPasskeys])

  const handleAdd = async () => {
    if (!ready) {
      toast.error('Passkeys are not available yet. See setup steps below.', { duration: 6000 })
      return
    }

    setBusy(true)
    const { error } = await registerPasskey()
    setBusy(false)

    if (!error) {
      await fetchPasskeys()
    }
  }

  const handleDelete = async (passkeyId: string, name?: string) => {
    const label = name || 'this passkey'
    if (!confirm(`Remove ${label}? You can add it again later from this device.`)) {
      return
    }

    setBusy(true)
    const { error } = await supabase.auth.passkey.delete({ passkeyId })
    setBusy(false)

    if (error) {
      toast.error(formatPasskeyError(error), { duration: 6000 })
      return
    }

    toast.success('Passkey removed')
    await fetchPasskeys()
  }

  if (!secureContext) {
    return (
      <p className="text-sm text-zinc-500">
        Passkeys require a secure connection (HTTPS). Open the app at{' '}
        <span className="text-zinc-300">https://bodycomp-goals.vercel.app</span>.
      </p>
    )
  }

  if (!browserSupported) {
    return (
      <p className="text-sm text-zinc-500">
        Passkeys are not supported in this browser.
      </p>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-zinc-800 text-violet-400">
          <KeyRound size={20} />
        </div>
        <div>
          <p className="font-medium text-white">Passkeys</p>
          <p className="text-sm text-zinc-400 mt-0.5">
            Sign in with Face ID, Touch ID, or your device PIN
          </p>
        </div>
      </div>

      {!availabilityLoading && serverEnabled === false && (
        <div className="mb-4 rounded-2xl border border-amber-600/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-100/90">
          <p className="font-medium text-amber-200 mb-2">Passkeys not enabled in Supabase</p>
          <ol className="list-decimal list-inside space-y-1 text-xs text-amber-100/80">
            {PASSKEY_SETUP_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500 mb-4">Loading passkeys…</p>
      ) : passkeys.length > 0 ? (
        <ul className="space-y-2 mb-4">
          {passkeys.map((passkey) => (
            <li
              key={passkey.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-zinc-800/60 border border-zinc-700/80 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {passkey.friendly_name || 'Passkey'}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Added {new Date(passkey.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleDelete(passkey.id, passkey.friendly_name)}
                disabled={busy}
                className="shrink-0 p-2 text-zinc-400 hover:text-red-400 transition-colors disabled:opacity-50"
                aria-label={`Remove ${passkey.friendly_name || 'passkey'}`}
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      ) : ready ? (
        <p className="text-sm text-zinc-500 mb-4">
          No passkeys yet. Add one to sign in without a password.
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => void handleAdd()}
        disabled={busy || !ready}
        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-sm bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-50 w-full sm:w-auto"
      >
        <Plus size={16} />
        {busy ? 'Waiting for device…' : 'Add Passkey'}
      </button>
    </div>
  )
}