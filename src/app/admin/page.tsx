'use client'

import { useState, useEffect } from 'react'

interface Notification {
  id: string
  title: string
  body: string
  url: string | null
  total_subscribers: number
  total_sent: number
  total_failed: number
  sent_at: string
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null)
  const [storedPassword, setStoredPassword] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('admin-password')
    if (saved) {
      setStoredPassword(saved)
      setIsAuthenticated(true)
      fetchData(saved)
    }
  }, [])

  const fetchData = async (pwd: string) => {
    try {
      const [notifRes, subsRes] = await Promise.all([
        fetch('/api/notifications'),
        fetch('/api/subscribers', {
          headers: { 'x-admin-password': pwd }
        })
      ])

      if (notifRes.ok) {
        const { notifications } = await notifRes.json()
        setNotifications(notifications || [])
      }

      if (subsRes.ok) {
        const { count } = await subsRes.json()
        setSubscriberCount(count)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    localStorage.setItem('admin-password', password)
    setStoredPassword(password)
    setIsAuthenticated(true)
    fetchData(password)
  }

  const handleLogout = () => {
    localStorage.removeItem('admin-password')
    setIsAuthenticated(false)
    setStoredPassword('')
    setPassword('')
  }

  const handleSendPush = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body,
          url: url || null,
          password: storedPassword
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `Enviado com sucesso! ${data.total_sent}/${data.total_subscribers} receberam.`
        })
        setTitle('')
        setBody('')
        setUrl('')
        fetchData(storedPassword)
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Erro ao enviar notificação'
        })
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Erro de conexão'
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <img src="/logo.webp" alt="24Games" className="w-16 h-16 mx-auto rounded-xl mb-4" />
            <h1 className="text-2xl font-bold text-white">Admin 24Games</h1>
            <p className="text-gray-400 text-sm">Push Notifications</p>
          </div>
          
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha"
              className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors"
            >
              Entrar
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <img src="/logo.webp" alt="24Games" className="w-12 h-12 rounded-xl" />
            <div>
              <h1 className="text-2xl font-bold text-white">Admin 24Games</h1>
              <p className="text-gray-400 text-sm">Push Notifications</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-white transition-colors"
          >
            Sair
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-800 rounded-xl p-6">
            <p className="text-gray-400 text-sm">Subscribers</p>
            <p className="text-3xl font-bold text-white">
              {subscriberCount !== null ? subscriberCount : '-'}
            </p>
          </div>
          <div className="bg-gray-800 rounded-xl p-6">
            <p className="text-gray-400 text-sm">Notificações Enviadas</p>
            <p className="text-3xl font-bold text-white">{notifications.length}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-6">
            <p className="text-gray-400 text-sm">Última Notificação</p>
            <p className="text-lg font-bold text-white">
              {notifications[0]?.sent_at 
                ? new Date(notifications[0].sent_at).toLocaleDateString('pt-BR')
                : '-'}
            </p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Enviar Notificação</h2>
          
          {message && (
            <div className={`p-4 rounded-lg mb-4 ${
              message.type === 'success' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSendPush}>
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">Título *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Nova promoção!"
                className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">Mensagem *</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Ex: Aproveite 50% de bônus no seu próximo depósito!"
                rows={3}
                className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-gray-400 text-sm mb-2">URL (opcional)</label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Ex: https://24games.cl/promocoes"
                className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-gray-500 text-xs mt-1">
                URL para onde o usuário será redirecionado ao clicar na notificação
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                  Enviando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                  </svg>
                  Enviar para todos ({subscriberCount || 0} subscribers)
                </>
              )}
            </button>
          </form>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Histórico de Notificações</h2>
          
          {notifications.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Nenhuma notificação enviada ainda</p>
          ) : (
            <div className="space-y-4">
              {notifications.map((notif) => (
                <div key={notif.id} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-white">{notif.title}</h3>
                    <span className="text-xs text-gray-400">
                      {new Date(notif.sent_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm mb-2">{notif.body}</p>
                  {notif.url && (
                    <p className="text-green-400 text-xs mb-2 truncate">{notif.url}</p>
                  )}
                  <div className="flex gap-4 text-xs text-gray-400">
                    <span>✓ {notif.total_sent} enviados</span>
                    {notif.total_failed > 0 && (
                      <span className="text-red-400">✗ {notif.total_failed} falhas</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
