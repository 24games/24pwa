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

interface ABCampaign {
  id: string
  name: string
  status: string
  variant_a_title: string
  variant_a_body: string
  variant_a_url: string | null
  variant_a_percentage: number
  variant_b_title: string
  variant_b_body: string
  variant_b_url: string | null
  variant_b_percentage: number
  variant_a_sent: number
  variant_a_clicked: number
  variant_b_sent: number
  variant_b_clicked: number
  created_at: string
  sent_at: string | null
}

interface AutomationFlow {
  id: string
  name: string
  status: string
  trigger_delay_hours: number
  title: string
  body: string
  url: string | null
  created_at: string
}

type TabType = 'push' | 'ab' | 'automation'

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [activeTab, setActiveTab] = useState<TabType>('push')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null)
  const [storedPassword, setStoredPassword] = useState('')
  
  // A/B Testing states
  const [abCampaigns, setAbCampaigns] = useState<ABCampaign[]>([])
  const [abName, setAbName] = useState('')
  const [abVariantATitle, setAbVariantATitle] = useState('')
  const [abVariantABody, setAbVariantABody] = useState('')
  const [abVariantAUrl, setAbVariantAUrl] = useState('')
  const [abVariantAPercentage, setAbVariantAPercentage] = useState(50)
  const [abVariantBTitle, setAbVariantBTitle] = useState('')
  const [abVariantBBody, setAbVariantBBody] = useState('')
  const [abVariantBUrl, setAbVariantBUrl] = useState('')
  
  // Automation states
  const [automationFlows, setAutomationFlows] = useState<AutomationFlow[]>([])
  const [flowName, setFlowName] = useState('')
  const [flowDelayHours, setFlowDelayHours] = useState(24)
  const [flowTitle, setFlowTitle] = useState('')
  const [flowBody, setFlowBody] = useState('')
  const [flowUrl, setFlowUrl] = useState('')

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
      const [notifRes, subsRes, abRes, autoRes] = await Promise.all([
        fetch('/api/notifications'),
        fetch('/api/subscribers', {
          headers: { 'x-admin-password': pwd }
        }),
        fetch('/api/ab-campaign'),
        fetch('/api/automation')
      ])

      if (notifRes.ok) {
        const { notifications } = await notifRes.json()
        setNotifications(notifications || [])
      }

      if (subsRes.ok) {
        const { count } = await subsRes.json()
        setSubscriberCount(count)
      }

      if (abRes.ok) {
        const { campaigns } = await abRes.json()
        setAbCampaigns(campaigns || [])
      }

      if (autoRes.ok) {
        const { flows } = await autoRes.json()
        setAutomationFlows(flows || [])
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

  const handleCreateABCampaign = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/ab-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: storedPassword,
          action: 'create',
          name: abName,
          variant_a_title: abVariantATitle,
          variant_a_body: abVariantABody,
          variant_a_url: abVariantAUrl || null,
          variant_a_percentage: abVariantAPercentage,
          variant_b_title: abVariantBTitle,
          variant_b_body: abVariantBBody,
          variant_b_url: abVariantBUrl || null,
          variant_b_percentage: 100 - abVariantAPercentage
        })
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Campanha A/B criada com sucesso!' })
        setAbName('')
        setAbVariantATitle('')
        setAbVariantABody('')
        setAbVariantAUrl('')
        setAbVariantBTitle('')
        setAbVariantBBody('')
        setAbVariantBUrl('')
        setAbVariantAPercentage(50)
        fetchData(storedPassword)
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.error || 'Erro ao criar campanha' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro de conexão' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendABCampaign = async (campaignId: string) => {
    setIsLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/ab-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: storedPassword,
          action: 'send',
          campaign_id: campaignId
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: `Campanha enviada! A: ${data.variant_a_sent}, B: ${data.variant_b_sent}` 
        })
        fetchData(storedPassword)
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao enviar campanha' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro de conexão' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateFlow = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: storedPassword,
          action: 'create',
          name: flowName,
          trigger_delay_hours: flowDelayHours,
          title: flowTitle,
          body: flowBody,
          url: flowUrl || null
        })
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Fluxo criado com sucesso!' })
        setFlowName('')
        setFlowDelayHours(24)
        setFlowTitle('')
        setFlowBody('')
        setFlowUrl('')
        fetchData(storedPassword)
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.error || 'Erro ao criar fluxo' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro de conexão' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleFlow = async (flowId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active'
    
    try {
      const response = await fetch('/api/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: storedPassword,
          action: 'toggle',
          flow_id: flowId,
          status: newStatus
        })
      })

      if (response.ok) {
        fetchData(storedPassword)
      }
    } catch (error) {
      console.error('Error toggling flow:', error)
    }
  }

  const handleDeleteFlow = async (flowId: string) => {
    if (!confirm('Tem certeza que deseja excluir este fluxo?')) return

    try {
      const response = await fetch('/api/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: storedPassword,
          action: 'delete',
          flow_id: flowId
        })
      })

      if (response.ok) {
        fetchData(storedPassword)
      }
    } catch (error) {
      console.error('Error deleting flow:', error)
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

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('push')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'push' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Push Simples
          </button>
          <button
            onClick={() => setActiveTab('ab')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'ab' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Teste A/B
          </button>
          <button
            onClick={() => setActiveTab('automation')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'automation' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Automação
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

        {message && (
          <div className={`p-4 rounded-lg mb-6 ${
            message.type === 'success' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        {/* Tab: Push Simples */}
        {activeTab === 'push' && (
          <>
            <div className="bg-gray-800 rounded-xl p-6 mb-8">
              <h2 className="text-xl font-bold text-white mb-4">Enviar Notificação</h2>

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
          </>
        )}

        {/* Tab: Teste A/B */}
        {activeTab === 'ab' && (
          <>
            <div className="bg-gray-800 rounded-xl p-6 mb-8">
              <h2 className="text-xl font-bold text-white mb-4">Criar Campanha A/B</h2>

              <form onSubmit={handleCreateABCampaign}>
                <div className="mb-4">
                  <label className="block text-gray-400 text-sm mb-2">Nome da Campanha *</label>
                  <input
                    type="text"
                    value={abName}
                    onChange={(e) => setAbName(e.target.value)}
                    placeholder="Ex: Teste de título promocional"
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-gray-400 text-sm mb-2">
                    Distribuição: Variante A ({abVariantAPercentage}%) / Variante B ({100 - abVariantAPercentage}%)
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={abVariantAPercentage}
                    onChange={(e) => setAbVariantAPercentage(Number(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <h3 className="text-green-400 font-medium mb-3">Variante A ({abVariantAPercentage}%)</h3>
                    <div className="mb-3">
                      <label className="block text-gray-400 text-xs mb-1">Título *</label>
                      <input
                        type="text"
                        value={abVariantATitle}
                        onChange={(e) => setAbVariantATitle(e.target.value)}
                        placeholder="Título da variante A"
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="block text-gray-400 text-xs mb-1">Mensagem *</label>
                      <textarea
                        value={abVariantABody}
                        onChange={(e) => setAbVariantABody(e.target.value)}
                        placeholder="Mensagem da variante A"
                        rows={2}
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-xs mb-1">URL (opcional)</label>
                      <input
                        type="text"
                        value={abVariantAUrl}
                        onChange={(e) => setAbVariantAUrl(e.target.value)}
                        placeholder="URL da variante A"
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>

                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <h3 className="text-blue-400 font-medium mb-3">Variante B ({100 - abVariantAPercentage}%)</h3>
                    <div className="mb-3">
                      <label className="block text-gray-400 text-xs mb-1">Título *</label>
                      <input
                        type="text"
                        value={abVariantBTitle}
                        onChange={(e) => setAbVariantBTitle(e.target.value)}
                        placeholder="Título da variante B"
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="block text-gray-400 text-xs mb-1">Mensagem *</label>
                      <textarea
                        value={abVariantBBody}
                        onChange={(e) => setAbVariantBBody(e.target.value)}
                        placeholder="Mensagem da variante B"
                        rows={2}
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-xs mb-1">URL (opcional)</label>
                      <input
                        type="text"
                        value={abVariantBUrl}
                        onChange={(e) => setAbVariantBUrl(e.target.value)}
                        placeholder="URL da variante B"
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-medium transition-colors"
                >
                  {isLoading ? 'Criando...' : 'Criar Campanha A/B'}
                </button>
              </form>
            </div>

            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Campanhas A/B</h2>
　　 　 　 　 {abCampaigns.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Nenhuma campanha A/B criada ainda</p>
              ) : (
                <div className="space-y-4">
                  {abCampaigns.map((campaign) => (
                    <div key={campaign.id} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-medium text-white">{campaign.name}</h3>
                          <span className={`text-xs px-2 py-1 rounded ${
                            campaign.status === 'draft' ? 'bg-yellow-900/50 text-yellow-400' :
                            campaign.status === 'completed' ? 'bg-green-900/50 text-green-400' :
                            'bg-gray-600 text-gray-300'
                          }`}>
                            {campaign.status === 'draft' ? 'Rascunho' : 
                             campaign.status === 'completed' ? 'Enviada' : campaign.status}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(campaign.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div className="bg-gray-800 rounded p-3">
                          <p className="text-green-400 text-xs font-medium mb-1">Variante A ({campaign.variant_a_percentage}%)</p>
                          <p className="text-white text-sm font-medium">{campaign.variant_a_title}</p>
                          <p className="text-gray-400 text-xs">{campaign.variant_a_body}</p>
                          {campaign.status === 'completed' && (
                            <p className="text-green-400 text-xs mt-2">✓ {campaign.variant_a_sent} enviados</p>
                          )}
                        </div>
                        <div className="bg-gray-800 rounded p-3">
                          <p className="text-blue-400 text-xs font-medium mb-1">Variante B ({campaign.variant_b_percentage}%)</p>
                          <p className="text-white text-sm font-medium">{campaign.variant_b_title}</p>
                          <p className="text-gray-400 text-xs">{campaign.variant_b_body}</p>
                          {campaign.status === 'completed' && (
                            <p className="text-blue-400 text-xs mt-2">✓ {campaign.variant_b_sent} enviados</p>
                          )}
                        </div>
                      </div>

                      {campaign.status === 'draft' && (
                        <button
                          onClick={() => handleSendABCampaign(campaign.id)}
                          disabled={isLoading}
                          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          {isLoading ? 'Enviando...' : 'Enviar Campanha'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Tab: Automação */}
        {activeTab === 'automation' && (
          <>
            <div className="bg-gray-800 rounded-xl p-6 mb-8">
              <h2 className="text-xl font-bold text-white mb-4">Criar Fluxo Automatizado</h2>
              <p className="text-gray-400 text-sm mb-4">
                Envie notificações automaticamente baseado no tempo desde que o usuário se inscreveu.
              </p>

              <form onSubmit={handleCreateFlow}>
                <div className="mb-4">
                  <label className="block text-gray-400 text-sm mb-2">Nome do Fluxo *</label>
                  <input
                    type="text"
                    value={flowName}
                    onChange={(e) => setFlowName(e.target.value)}
                    placeholder="Ex: Boas-vindas 24h"
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-gray-400 text-sm mb-2">Enviar após (horas) *</label>
                  <input
                    type="number"
                    min="1"
                    value={flowDelayHours}
                    onChange={(e) => setFlowDelayHours(Number(e.target.value))}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                  <p className="text-gray-500 text-xs mt-1">
                    Horas após o usuário permitir notificações
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-gray-400 text-sm mb-2">Título *</label>
                  <input
                    type="text"
                    value={flowTitle}
                    onChange={(e) => setFlowTitle(e.target.value)}
                    placeholder="Ex: Não esqueça do seu bônus!"
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-gray-400 text-sm mb-2">Mensagem *</label>
                  <textarea
                    value={flowBody}
                    onChange={(e) => setFlowBody(e.target.value)}
                    placeholder="Ex: Você ainda tem um bônus de boas-vindas esperando!"
                    rows={3}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                    required
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-gray-400 text-sm mb-2">URL (opcional)</label>
                  <input
                    type="text"
                    value={flowUrl}
                    onChange={(e) => setFlowUrl(e.target.value)}
                    placeholder="Ex: https://24games.cl/bonus"
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-medium transition-colors"
                >
                  {isLoading ? 'Criando...' : 'Criar Fluxo'}
                </button>
              </form>
            </div>

            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Fluxos Automatizados</h2>
　　 　 　 　 {automationFlows.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Nenhum fluxo criado ainda</p>
              ) : (
                <div className="space-y-4">
                  {automationFlows.map((flow) => (
                    <div key={flow.id} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium text-white">{flow.name}</h3>
                          <p className="text-gray-400 text-xs">
                            Enviar após {flow.trigger_delay_hours}h do registro
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          flow.status === 'active' ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'
                        }`}>
                          {flow.status === 'active' ? 'Ativo' : 'Pausado'}
                        </span>
                      </div>
                      
                      <div className="bg-gray-800 rounded p-3 mb-3">
                        <p className="text-white text-sm font-medium">{flow.title}</p>
                        <p className="text-gray-400 text-xs">{flow.body}</p>
                        {flow.url && (
                          <p className="text-green-400 text-xs mt-1 truncate">{flow.url}</p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleFlow(flow.id, flow.status)}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                            flow.status === 'active' 
                              ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                        >
                          {flow.status === 'active' ? 'Pausar' : 'Ativar'}
                        </button>
                        <button
                          onClick={() => handleDeleteFlow(flow.id)}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
