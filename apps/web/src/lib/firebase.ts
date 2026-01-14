import type { FirebaseApp } from 'firebase/app'
import type { Auth } from 'firebase/auth'
import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

let firebase_app: FirebaseApp | null = null
let firebase_auth: Auth | null = null

const get_firebase_config = () => {
  const api_key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || ''

  if (!api_key) {
    return null
  }

  return {
    apiKey: api_key,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || ''
  }
}

const get_firebase_app = (): FirebaseApp | null => {
  if (typeof window === 'undefined') {
    return null
  }

  if (!firebase_app) {
    const config = get_firebase_config()
    if (!config) {
      return null
    }

    firebase_app = getApps().length ? getApp() : initializeApp(config)
  }

  return firebase_app
}

export const get_firebase_auth = (): Auth | null => {
  const app = get_firebase_app()
  if (!app) {
    return null
  }

  if (!firebase_auth) {
    firebase_auth = getAuth(app)
  }

  return firebase_auth
}
