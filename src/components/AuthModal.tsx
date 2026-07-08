import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { isPasskeySupported } from '../lib/authRedirect'
import { X } from 'lucide-react'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  )
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | 'passkey' | null>(null)
  const {
    signIn,
    signUp,
    signInWithGoogle,
    signInWithApple,
    signInWithPasskey,
  } = useAuth()

  const passkeySupported = isPasskeySupported()

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    setLoading(true)

    const result =
      mode === 'login'
        ? await signIn(email, password)
        : await signUp(email, password)

    setLoading(false)

    if (!result?.error) {
      setEmail('')
      setPassword('')
      onClose()
    }
  }

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setOauthLoading(provider)

    const result =
      provider === 'google'
        ? await signInWithGoogle()
        : await signInWithApple()

    setOauthLoading(null)

    if (!result?.error) {
      onClose()
    }
  }

  const handlePasskey = async () => {
    setOauthLoading('passkey')

    const result = await signInWithPasskey()

    setOauthLoading(null)

    if (!result?.error) {
      onClose()
    }
  }

  const busy = loading || oauthLoading !== null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-3xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-zinc-700">
          <div className="min-w-0 pr-4">
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="text-zinc-400 text-sm mt-1">
              {mode === 'login'
                ? 'Sign in to access your data'
                : 'Start tracking your body composition'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => void handleOAuth('google')}
              disabled={busy}
              className="flex items-center justify-center gap-2.5 w-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-700 text-white font-medium py-3 rounded-2xl transition-colors"
            >
              <GoogleIcon />
              {oauthLoading === 'google' ? 'Redirecting…' : 'Google'}
            </button>
            <button
              type="button"
              onClick={() => void handleOAuth('apple')}
              disabled={busy}
              className="flex items-center justify-center gap-2.5 w-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-700 text-white font-medium py-3 rounded-2xl transition-colors"
            >
              <AppleIcon />
              {oauthLoading === 'apple' ? 'Redirecting…' : 'Apple'}
            </button>
          </div>

          {mode === 'login' && passkeySupported && (
            <button
              type="button"
              onClick={() => void handlePasskey()}
              disabled={busy}
              className="flex items-center justify-center gap-2.5 w-full bg-violet-600/90 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-2xl transition-colors"
            >
              <KeyRound size={18} />
              {oauthLoading === 'passkey' ? 'Waiting for device…' : 'Sign in with Passkey'}
            </button>
          )}

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-zinc-700" />
            <span className="text-xs text-zinc-500 uppercase tracking-wide">or</span>
            <div className="flex-1 h-px bg-zinc-700" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-800 disabled:cursor-not-allowed transition-colors text-white font-medium py-3.5 rounded-2xl"
            >
              {loading
                ? 'Please wait...'
                : mode === 'login'
                  ? 'Sign In with Email'
                  : 'Create Account with Email'}
            </button>
          </form>

          {mode === 'signup' && passkeySupported && (
            <p className="text-xs text-zinc-500 text-center leading-relaxed">
              After creating your account, add a passkey in Settings for passwordless sign-in.
            </p>
          )}
        </div>

        <div className="px-6 pb-6 text-center">
          <button
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            {mode === 'login'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}