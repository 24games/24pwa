import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import webpush from 'web-push'

webpush.setVapidDetails(
  'mailto:dev@24games.cl',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
)

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: flows, error: flowsError } = await supabaseAdmin
      .from('push_automation_flows')
      .select('*')
      .eq('status', 'active')

    if (flowsError) throw flowsError

    let totalSent = 0

    for (const flow of flows || []) {
      const cutoffTime = new Date()
      cutoffTime.setHours(cutoffTime.getHours() - flow.trigger_delay_hours)

      const { data: eligibleSubscribers, error: subsError } = await supabaseAdmin
        .from('push_subscribers')
        .select('*')
        .lte('created_at', cutoffTime.toISOString())

      if (subsError) {
        console.error('Error fetching subscribers:', subsError)
        continue
      }

      for (const sub of eligibleSubscribers || []) {
        const { data: alreadySent } = await supabaseAdmin
          .from('push_automation_sent')
          .select('id')
          .eq('flow_id', flow.id)
          .eq('subscriber_id', sub.id)
          .single()

        if (alreadySent) continue

        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth }
            },
            JSON.stringify({
              title: flow.title,
              body: flow.body,
              url: flow.url,
              flow_id: flow.id
            })
          )

          await supabaseAdmin
            .from('push_automation_sent')
            .insert({
              flow_id: flow.id,
              subscriber_id: sub.id
            })

          totalSent++
        } catch (err) {
          console.error('Error sending automation push:', err)
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      total_sent: totalSent,
      processed_at: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Cron error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
