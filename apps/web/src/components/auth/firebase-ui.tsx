'use client'

import * as React from 'react'
import { EmailAuthProvider } from 'firebase/auth'

import { get_firebase_auth } from '@/lib/firebase'

const UI_CONTAINER_ID = 'firebaseui-auth-container'
const FIREBASE_UI_CSS =
  'https://www.gstatic.com/firebasejs/ui/6.1.0/firebase-ui-auth.css'
const FIREBASE_UI_JS =
  'https://www.gstatic.com/firebasejs/ui/6.1.0/firebase-ui-auth.js'

const load_firebaseui_css = () => {
  if (typeof document === 'undefined') {
    return
  }

  if (document.querySelector('link[data-firebaseui]')) {
    return
  }

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = FIREBASE_UI_CSS
  link.setAttribute('data-firebaseui', 'true')
  document.head.appendChild(link)
}

const load_firebaseui_script = () =>
  new Promise<any>((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window is not available'))
      return
    }

    const existing = (window as any).firebaseui
    if (existing) {
      resolve(existing)
      return
    }

    const script = document.createElement('script')
    script.src = FIREBASE_UI_JS
    script.async = true
    script.onload = () => resolve((window as any).firebaseui)
    script.onerror = () =>
      reject(new Error('Failed to load Firebase UI script'))
    document.head.appendChild(script)
  })

export const FirebaseAuthUI = () => {
  React.useEffect(() => {
    let is_active = true
    let ui: any = null

    const initFirebaseUI = async () => {
      const auth = get_firebase_auth()
      if (!auth || !is_active) {
        return
      }

      load_firebaseui_css()
      const firebaseui = await load_firebaseui_script()

      ui =
        firebaseui.auth.AuthUI.getInstance() ||
        new firebaseui.auth.AuthUI(auth)

      ui.start(`#${UI_CONTAINER_ID}`, {
        signInFlow: 'popup',
        signInOptions: [EmailAuthProvider.PROVIDER_ID],
        credentialHelper: firebaseui.auth.CredentialHelper.NONE,
        callbacks: {
          signInSuccessWithAuthResult: () => false
        }
      })
    }

    initFirebaseUI().catch((error) => {
      console.error('Failed to initialize Firebase UI:', error)
    })

    return () => {
      is_active = false
      if (ui) {
        ui.reset()
      }
    }
  }, [])

  return <div id={UI_CONTAINER_ID} />
}
