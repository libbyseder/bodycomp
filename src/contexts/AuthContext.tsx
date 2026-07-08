import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { signInWithProvider } from '../lib/oauthSignIn'
import { formatPasskeyError } from '../lib/passkey'
import type { Session, User } from '@supabase/supabase-js'
import toast from 'react-hot-toast'

interface AuthContextType {
  user: User | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signInWithGoogle: () => Promise<{ error: any }>
  signInWithApple: () => Promise<{ error: any }>
  signInWithPasskey: () => Promise<{ error: any; session: Session | null }>
  registerPasskey: () => Promise<{ error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      toast.error(error.message)
      return { error }
    }

    if (data.session) {
      toast.success('Account created! Add a passkey in Settings for faster sign-in.')
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        toast.success('Account created! Please sign in.')
      } else {
        toast.success('Account created! Add a passkey in Settings for faster sign-in.')
      }
    }

    return { error: null }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Welcome back!')
    }

    return { error }
  }

  const signInWithGoogle = async () => {
    const { error } = await signInWithProvider('google')

    if (error) {
      toast.error(error.message)
      return { error }
    }

    return { error: null }
  }

  const signInWithApple = async () => {
    const { error } = await signInWithProvider('apple')

    if (error) {
      toast.error(error.message)
      return { error }
    }

    return { error: null }
  }

  const signInWithPasskey = async () => {
    const { data, error } = await supabase.auth.signInWithPasskey()

    if (error) {
      const message = formatPasskeyError(error)
      if (!message.includes('cancelled')) {
        toast.error(message, { duration: 6000 })
      }
      return { error, session: null }
    }

    const session = data?.session ?? null
    if (!session) {
      const message = 'Passkey sign-in completed but no session was created.'
      toast.error(message)
      return { error: new Error(message), session: null }
    }

    toast.success(`Welcome back${data.user?.email ? `, ${data.user.email}` : ''}!`)
    return { error: null, session }
  }

  const registerPasskey = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      const message = 'Sign in first before adding a passkey.'
      toast.error(message)
      return { error: new Error(message) }
    }

    const { data, error } = await supabase.auth.registerPasskey()

    if (error) {
      const message = formatPasskeyError(error)
      if (!message.includes('cancelled')) {
        toast.error(message, { duration: 6000 })
      }
      return { error }
    }

    if (data) {
      toast.success(`Passkey added${data.friendly_name ? ` (${data.friendly_name})` : ''}`)
    }

    return { error: null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    toast.success('Signed out successfully')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signInWithApple,
        signInWithPasskey,
        registerPasskey,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}