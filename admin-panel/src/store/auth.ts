import { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthState {
  session: Session | null
  user: User | null
  isAdmin: boolean
  loading: boolean
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

// Wird in App.tsx als Provider bereitgestellt
export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth muss innerhalb von AuthProvider verwendet werden')
  return ctx
}

// Prüft via RPC ob der aktuelle User in admin_users steht.
// is_admin() ist SECURITY DEFINER und läuft als postgres — kein RLS-Problem.
async function checkIsAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin')
  if (error) return false
  return data === true
}

export function createAuthValue(
  session: Session | null,
  user: User | null,
  isAdmin: boolean,
  loading: boolean,
  signIn: AuthContextValue['signIn'],
  signOut: AuthContextValue['signOut'],
): AuthContextValue {
  return { session, user, isAdmin, loading, signIn, signOut }
}

// Hook für die Initialisierung — wird in AuthProvider (App.tsx) genutzt
export function useAuthInit() {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    isAdmin: false,
    loading: true,
  })

  useEffect(() => {
    // Initialen Session-State laden
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const isAdmin = session ? await checkIsAdmin() : false
      setState({ session, user: session?.user ?? null, isAdmin, loading: false })
    })

    // Auth-State-Änderungen beobachten (Login, Logout, Token-Refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const isAdmin = session ? await checkIsAdmin() : false
      setState({ session, user: session?.user ?? null, isAdmin, loading: false })
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return { error: null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return { state, signIn, signOut }
}
