'use client'

import { useEffect, useState } from 'react'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export default function AppPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [iframeUrl, setIframeUrl] = useState('https://24games.cl')

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000)
    
    const requestNotificationPermission = async () => {
      console.log('[Push] Checking notification support...')
      
      if (!('Notification' in window)) {
        console.log('[Push] Notifications not supported')
        return
      }
      
      if (!('serviceWorker' in navigator)) {
        console.log('[Push] Service Worker not supported')
        return
      }

      console.log('[Push] Current permission:', Notification.permission)

      if (Notification.permission === 'granted') {
        console.log('[Push] Already granted, subscribing...')
        await subscribeUser()
        return
      }

      if (Notification.permission === 'default') {
        console.log('[Push] Requesting permission...')
        try {
          const permission = await Notification.requestPermission()
          console.log('[Push] Permission result:', permission)
          if (permission === 'granted') {
            await subscribeUser()
          }
        } catch (err) {
          console.error('[Push] Error requesting permission:', err)
        }
      } else {
        console.log('[Push] Permission was denied previously')
      }
    }

    const subscribeUser = async () => {
      try {
        console.log('[Push] Fetching VAPID key...')
        const response = await fetch('/api/vapid-key')
        const data = await response.json()
        console.log('[Push] VAPID response:', data)
        
        if (!data.publicKey) {
          console.error('[Push] VAPID public key not available')
          return
        }

        console.log('[Push] Waiting for service worker...')
        const registration = await navigator.serviceWorker.ready
        console.log('[Push] Service worker ready')
        
        let subscription = await registration.pushManager.getSubscription()
        console.log('[Push] Existing subscription:', subscription)
        
        if (!subscription) {
          console.log('[Push] Creating new subscription...')
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(data.publicKey)
          })
          console.log('[Push] New subscription created')
        }

        console.log('[Push] Saving subscription to server...')
        const saveResponse = await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription)
        })
        const saveResult = await saveResponse.json()
        console.log('[Push] Save result:', saveResult)
      } catch (error) {
        console.error('[Push] Error subscribing:', error)
      }
    }

    requestNotificationPermission()

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NAVIGATE' && event.data?.url) {
        if (event.data.url.startsWith('http')) {
          setIframeUrl(event.data.url)
        } else {
          setIframeUrl(`https://24games.cl${event.data.url}`)
        }
      }
    }

    navigator.serviceWorker?.addEventListener('message', handleMessage)

    return () => {
      clearTimeout(timer)
      navigator.serviceWorker?.removeEventListener('message', handleMessage)
    }
  }, [])

  return (
    <div className="fixed inset-0 w-full h-full bg-gray-900">
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white z-10">
          <div className="text-center p-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl overflow-hidden">
              <img src="/logo.webp" alt="24Games" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-2xl font-bold mb-2">24Games</h1>
            <p className="text-gray-400 mb-4">Cargando...</p>
            <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto"></div>
          </div>
        </div>
      )}
      <iframe
        src={iframeUrl}
        className="w-full h-full border-0"
        allow="fullscreen; autoplay; encrypted-media; payment"
        allowFullScreen
        onLoad={() => setIsLoading(false)}
      />
    </div>
  )
}
