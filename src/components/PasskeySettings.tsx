import { useCallback, useEffect, useState } from 'react'
import { KeyRound, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { isPasskeySupported } from '../lib/authRedirect'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

interface PasskeyItem {
  id: string
  friendly_name?: string
  created_at: string
  last_used_at?: string
}

export default function PasskeySettings() {
  const { registerPasskey } = useAuth()
  const [passkeys, setPasskeys] = useState<PasskeyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const supported = isPasskeySupported()

  const fetchPasskeys = useCallback(async () => {
    setLoading(true)

    const { data, error } = await supabase.auth.passkey.list()

    if (error) {
      console.error('Failed to list passkeys:', error)
      setPasskeys([])
    } else {
      setPasskeys(data ?? [])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    void fetchPasskeys()
  }, [fetchPasskeys])

  const handleAdd = async () => {
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
      toast.error(error.message)
      return
    }

    toast.success('Passkey removed')
    await fetchPasskeys()
  }

  if (!supported) {
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
      ) : (
        <p className="text-sm text-zinc-500 mb-4">
          No passkeys yet. Add one to sign in without a password.
        </p>
      )}

      <button
        type="button"
        onClick={() => void handleAdd()}
        disabled={busy}
        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-sm bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-50 w-full sm:w-auto"
      >
        <Plus size={16} />
        {busy ? 'Waiting for device…' : 'Add Passkey'}
      </button>
    </div>
  )
}