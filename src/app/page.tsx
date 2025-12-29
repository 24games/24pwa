'use client'

import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function Home() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [countdown, setCountdown] = useState(10)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || ''
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    
    if (isIOS) {
      window.location.href = 'https://24games.cl'
      return
    }
    
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone === true
    
    if (isStandalone) {
      window.location.replace('/app')
      return
    }
    
    setIsLoading(false)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setDeferredPrompt(null)
      }
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      const isAndroid = /Android/.test(navigator.userAgent)
      
      if (isIOS) {
        alert('Para instalar:\n1. Toque no ícone de compartilhar (quadrado com seta)\n2. Selecione "Adicionar à Tela de Início"')
      } else if (isAndroid) {
        alert('Para instalar:\n1. Toque no menu (3 pontos)\n2. Selecione "Instalar aplicativo" ou "Adicionar à tela inicial"')
      } else {
        alert('Para instalar:\n1. Clique no menu do navegador\n2. Selecione "Instalar aplicativo"')
      }
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '24Games',
          text: 'Instala 24Games',
          url: window.location.href,
        })
      } catch (err) {
        console.log('Error sharing:', err)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg bg-gray-900">
            <img 
              src="/logo.webp" 
              alt="24Games" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-medium text-gray-900">24Games</h1>
              <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
              </svg>
            </div>
            <p className="text-sm text-gray-600">24Games.cl</p>
            <div className="flex items-center gap-1 mt-1">
              <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
              </svg>
              <span className="text-xs text-green-600">Verified by Play Protect</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex justify-between border-y border-gray-200 py-4 mb-6">
          <div className="text-center flex-1">
            <div className="flex items-center justify-center gap-1">
              <span className="font-medium text-gray-900">4.8</span>
              <svg className="w-4 h-4 text-gray-900" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
              </svg>
            </div>
            <p className="text-xs text-gray-500">275 reseñas</p>
          </div>
          <div className="text-center flex-1 border-x border-gray-200">
            <div className="font-medium text-gray-900">1M+</div>
            <p className="text-xs text-gray-500">Descargas</p>
          </div>
          <div className="text-center flex-1">
            <div className="flex justify-center mb-1">
              <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <p className="text-xs text-gray-500 leading-tight">Selección de<br/>nuestros expertos</p>
          </div>
          <div className="text-center flex-1 border-l border-gray-200">
            <div className="font-medium text-gray-900 border border-gray-400 rounded px-1 inline-block text-sm">18+</div>
            <p className="text-xs text-gray-500 leading-tight">Para mayores<br/>de 18 años</p>
          </div>
        </div>

        {/* App Preview */}
        <div className="flex items-center justify-center gap-6 mb-8 py-4">
          <div className="bg-gray-100 rounded-xl p-4 shadow-lg">
            <img 
              src="/logo.webp" 
              alt="24Games App" 
              className="w-24 h-24 rounded-xl mb-2"
            />
            <p className="text-sm text-gray-700 text-center font-medium">24Games</p>
          </div>
        </div>

        {/* Install Button */}
        <button
          onClick={handleInstall}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-lg font-medium text-lg transition-colors mb-6"
        >
          <div className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            <span>Instalación rápida</span>
          </div>
          <p className="text-sm opacity-90">Descargar {countdown}s</p>
        </button>

        {/* Bottom Actions */}
        <div className="flex justify-center gap-12">
          <button 
            onClick={handleShare}
            className="flex items-center gap-2 text-green-700 hover:text-green-800"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
            </svg>
            <span>Compartir</span>
          </button>
          <button className="flex items-center gap-2 text-green-700 hover:text-green-800">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 10H2v2h12v-2zm0-4H2v2h12V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM2 16h8v-2H2v2z"/>
            </svg>
            <span>Añadir a la lista de deseos</span>
          </button>
        </div>
      </div>
    </main>
  )
}
