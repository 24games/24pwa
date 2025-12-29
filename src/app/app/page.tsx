'use client'

import { useEffect, useState } from 'react'

export default function AppPage() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000)
    return () => clearTimeout(timer)
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
        src="https://24games.cl"
        className="w-full h-full border-0"
        allow="fullscreen; autoplay; encrypted-media; payment"
        allowFullScreen
        onLoad={() => setIsLoading(false)}
      />
    </div>
  )
}
