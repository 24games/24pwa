import webpush from 'web-push'

export function getVapidKeys() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY

  if (!publicKey || !privateKey) {
    const keys = webpush.generateVAPIDKeys()
    console.log('=== VAPID KEYS GENERATED ===')
    console.log('Add these to your .env.local file:')
    console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`)
    console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`)
    console.log('============================')
    return keys
  }

  return { publicKey, privateKey }
}

export function configureWebPush() {
  const { publicKey, privateKey } = getVapidKeys()
  
  webpush.setVapidDetails(
    'mailto:dev@24games.cl',
    publicKey,
    privateKey
  )

  return { publicKey, privateKey }
}
