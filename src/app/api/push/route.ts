import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { supabaseAdmin } from '@/lib/supabase'
import { configureWebPush } from '@/lib/vapid'

export async function POST(request: NextRequest) {
  try {
    const { title, body, url, password } = await request.json()

    if (!title || !body) {
      return NextResponse.json(
        { error: 'Title and body are required' },
        { status: 400 }
      )
    }

    const adminPassword = process.env.ADMIN_PASSWORD || '24games2024'
    if (password !== adminPassword) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    configureWebPush()

    const { data: subscribers, error: fetchError } = await supabaseAdmin
      .from('push_subscribers')
      .select('*')

    if (fetchError) {
      console.error('Error fetching subscribers:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch subscribers' },
        { status: 500 }
      )
    }

    if (!subscribers || subscribers.length === 0) {
      return NextResponse.json(
        { error: 'No subscribers found' },
        { status: 404 }
      )
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: '/logo.webp',
      badge: '/logo.webp',
      url: url || '/',
      timestamp: Date.now()
    })

    let totalSent = 0
    let totalFailed = 0
    const failedEndpoints: string[] = []

    const sendPromises = subscribers.map(async (subscriber) => {
      const pushSubscription = {
        endpoint: subscriber.endpoint,
        keys: {
          p256dh: subscriber.p256dh,
          auth: subscriber.auth
        }
      }

      try {
        await webpush.sendNotification(pushSubscription, payload)
        totalSent++
      } catch (error: any) {
        totalFailed++
        if (error.statusCode === 410 || error.statusCode === 404) {
          failedEndpoints.push(subscriber.endpoint)
        }
        console.error(`Failed to send to ${subscriber.endpoint}:`, error.message)
      }
    })

    await Promise.all(sendPromises)

    if (failedEndpoints.length > 0) {
      await supabaseAdmin
        .from('push_subscribers')
        .delete()
        .in('endpoint', failedEndpoints)
    }

    const { error: insertError } = await supabaseAdmin
      .from('push_notifications')
      .insert({
        title,
        body,
        url: url || null,
        total_subscribers: subscribers.length,
        total_sent: totalSent,
        total_failed: totalFailed,
        sent_at: new Date().toISOString()
      })

    if (insertError) {
      console.error('Error saving notification history:', insertError)
    }

    return NextResponse.json({
      success: true,
      total_subscribers: subscribers.length,
      total_sent: totalSent,
      total_failed: totalFailed,
      removed_invalid: failedEndpoints.length
    })
  } catch (error) {
    console.error('Push error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
