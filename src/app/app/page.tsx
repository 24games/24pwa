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
      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        return
      }

      if (Notification.permission === 'granted') {
        await subscribeUser()
        return
      }

      if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission()
        if (permission === 'granted') {
          await subscribeUser()
        }
      }
    }

    const subscribeUser = async () => {
      try {
        const response = await fetch('/api/vapid-key')
        const { publicKey } = await response.json()
        
        if (!publicKey) {
          console.error('VAPID public key not available')
          return
        }

        const registration = await navigator.serviceWorker.ready
        
        let subscription = await registration.pushManager.getSubscription()
        
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey)
          })
        }

        await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription)
        })
      } catch (error) {
        console.error('Error subscribing to push:', error)
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
