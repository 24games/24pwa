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
    const { data: campaigns, error } = await supabaseAdmin
      .from('push_ab_campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ campaigns })
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
      const { data: campaign, error } = await supabaseAdmin
        .from('push_ab_campaigns')
        .insert({
          name: data.name,
          variant_a_title: data.variant_a_title,
          variant_a_body: data.variant_a_body,
          variant_a_url: data.variant_a_url || null,
          variant_a_percentage: data.variant_a_percentage,
          variant_b_title: data.variant_b_title,
          variant_b_body: data.variant_b_body,
          variant_b_url: data.variant_b_url || null,
          variant_b_percentage: data.variant_b_percentage,
          status: 'draft'
        })
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ campaign })
    }

    if (action === 'send') {
      const { campaign_id } = data

      const { data: campaign, error: campaignError } = await supabaseAdmin
        .from('push_ab_campaigns')
        .select('*')
        .eq('id', campaign_id)
        .single()

      if (campaignError) throw campaignError

      const { data: subscribers, error: subsError } = await supabaseAdmin
        .from('push_subscribers')
        .select('*')

      if (subsError) throw subsError

      if (!subscribers || subscribers.length === 0) {
        return NextResponse.json({ error: 'No subscribers found' }, { status: 400 })
      }

      const shuffled = subscribers.sort(() => Math.random() - 0.5)
      const splitIndex = Math.floor(shuffled.length * (campaign.variant_a_percentage / 100))
      
      const variantASubscribers = shuffled.slice(0, splitIndex)
      const variantBSubscribers = shuffled.slice(splitIndex)

      let variantASent = 0
      let variantBSent = 0

      for (const sub of variantASubscribers) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth }
            },
            JSON.stringify({
              title: campaign.variant_a_title,
              body: campaign.variant_a_body,
              url: campaign.variant_a_url,
              campaign_id: campaign.id,
              variant: 'A'
            })
          )
          variantASent++
        } catch (err) {
          console.error('Error sending to variant A subscriber:', err)
        }
      }

      for (const sub of variantBSubscribers) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth }
            },
            JSON.stringify({
              title: campaign.variant_b_title,
              body: campaign.variant_b_body,
              url: campaign.variant_b_url,
              campaign_id: campaign.id,
              variant: 'B'
            })
          )
          variantBSent++
        } catch (err) {
          console.error('Error sending to variant B subscriber:', err)
        }
      }

      await supabaseAdmin
        .from('push_ab_campaigns')
        .update({
          status: 'completed',
          variant_a_sent: variantASent,
          variant_b_sent: variantBSent,
          sent_at: new Date().toISOString(),
          completed_at: new Date().toISOString()
        })
        .eq('id', campaign_id)

      return NextResponse.json({
        success: true,
        variant_a_sent: variantASent,
        variant_b_sent: variantBSent,
        total_subscribers: subscribers.length
      })
    }

    if (action === 'delete') {
      const { campaign_id } = data
      const { error } = await supabaseAdmin
        .from('push_ab_campaigns')
        .delete()
        .eq('id', campaign_id)

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('AB Campaign error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
