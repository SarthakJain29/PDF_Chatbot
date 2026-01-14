'use client'

import * as React from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'

import { get_firebase_auth } from '@/lib/firebase'
import { Card } from '@/components/ui/card'
import { FirebaseAuthUI } from '@/components/auth/firebase-ui'
import { RAG_USER_ID_STORAGE_KEY } from '@/constants/api'
import type { TAuthContext, TAuthGateProps } from '@/types/auth'

const AuthContext = React.createContext<TAuthContext | null>(null)

export const useAuth = () => {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error('Auth context is missing')
  }
  return context
}

export const AuthGate = ({ children }: TAuthGateProps) => {
  const [user, setUser] = React.useState<User | null>(null)
  const [is_loading, setIsLoading] = React.useState(true)
  const [auth, setAuth] = React.useState<ReturnType<typeof get_firebase_auth>>(null)

  React.useEffect(() => {
    const firebase_auth = get_firebase_auth()
    setAuth(firebase_auth)

    if (!firebase_auth) {
      setIsLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(firebase_auth, (next_user) => {
      setUser(next_user)
      setIsLoading(false)

      if (next_user?.uid) {
        localStorage.setItem(RAG_USER_ID_STORAGE_KEY, next_user.uid)
      } else {
        localStorage.removeItem(RAG_USER_ID_STORAGE_KEY)
      }
    })

    return () => unsubscribe()
  }, [])

  if (is_loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        Loading authentication...
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto flex min-h-[80vh] w-full max-w-md flex-col justify-center">
          <Card className="space-y-6 p-6 shadow-sm">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                RAG Chat
              </p>
              <h1 className="text-2xl font-semibold text-slate-900">
                Sign in to continue
              </h1>
              <p className="text-sm text-slate-500">
                Use your email to access your PDF chat workspace.
              </p>
            </div>
            <FirebaseAuthUI />
            <p className="text-xs text-slate-400">
              Email sign-in is enabled. You can add more providers later.
            </p>
          </Card>
        </div>
      </div>
    )
  }

  const handle_sign_out = () => auth?.signOut()

  return (
    <AuthContext.Provider value={{ user, sign_out: handle_sign_out }}>
      {children}
    </AuthContext.Provider>
  )
}
