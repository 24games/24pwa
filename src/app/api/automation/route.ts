import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import webpush from 'web-push'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '24games2024'

webpush.setVapidDetails(
  'mailto:dev@24games.cl',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
)

export async function GET(request: NextRequest) {
  try {
    const { data: flows, error } = await supabaseAdmin
      .from('push_automation_flows')
      .select('*')
      .neq('status', 'deleted')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ flows })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password, action, ...data } = body

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (action === 'create') {
      const { data: flow, error } = await supabaseAdmin
        .from('push_automation_flows')
        .insert({
          name: data.name,
          trigger_delay_hours: data.trigger_delay_hours,
          title: data.title,
          body: data.body,
          url: data.url || null,
          status: 'active'
        })
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ flow })
    }

    if (action === 'update') {
      const { flow_id, ...updateData } = data
      const { data: flow, error } = await supabaseAdmin
        .from('push_automation_flows')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', flow_id)
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ flow })
    }

    if (action === 'toggle') {
      const { flow_id, status } = data
      const { error } = await supabaseAdmin
        .from('push_automation_flows')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', flow_id)

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (action === 'delete') {
      const { flow_id } = data
      const { error } = await supabaseAdmin
        .from('push_automation_flows')
        .update({ status: 'deleted', updated_at: new Date().toISOString() })
        .eq('id', flow_id)

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (action === 'process') {
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

      return NextResponse.json({ success: true, total_sent: totalSent })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('Automation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
