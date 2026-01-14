'use client'

import * as React from 'react'
import { EmailAuthProvider } from 'firebase/auth'

import { get_firebase_auth } from '@/lib/firebase'
import {
  FIREBASE_UI_CONTAINER_ID,
  FIREBASE_UI_CSS_URL
} from '@/constants/firebase'

const load_firebaseui_css = () => {
  if (typeof document === 'undefined') {
    return
  }

  if (document.querySelector('link[data-firebaseui]')) {
    return
  }

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = FIREBASE_UI_CSS_URL
  link.setAttribute('data-firebaseui', 'true')
  document.head.appendChild(link)
}

export const FirebaseAuthUI = () => {
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let is_active = true
    let ui: any = null

    const initFirebaseUI = async () => {
      const auth = get_firebase_auth()
      if (!auth || !is_active) {
        if (!auth) {
          setError('Firebase config is missing')
        }
        return
      }

      load_firebaseui_css()
      const firebaseui_module = await import('firebaseui')
      const firebaseui = (firebaseui_module as any).default || firebaseui_module

      ui =
        firebaseui.auth.AuthUI.getInstance() ||
        new firebaseui.auth.AuthUI(auth)

      ui.reset()
      ui.start(`#${FIREBASE_UI_CONTAINER_ID}`, {
        signInFlow: 'popup',
        signInOptions: [EmailAuthProvider.PROVIDER_ID],
        credentialHelper: firebaseui.auth.CredentialHelper.NONE,
        callbacks: {
          signInSuccessWithAuthResult: () => false
        }
      })
    }

    initFirebaseUI().catch((error) => {
      setError(error instanceof Error ? error.message : 'Failed to load sign-in')
    })

    return () => {
      is_active = false
      if (ui) {
        ui.reset()
      }
    }
  }, [])

  return (
    <div className="space-y-3">
      {error ? (
        <p className="text-xs text-rose-500">{error}</p>
      ) : null}
      <div id={FIREBASE_UI_CONTAINER_ID} />
    </div>
  )
}
