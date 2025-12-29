import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const password = request.headers.get('x-admin-password')
    const adminPassword = process.env.ADMIN_PASSWORD || '24games2024'
    
    if (password !== adminPassword) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { count, error } = await supabaseAdmin
      .from('push_subscribers')
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.error('Error counting subscribers:', error)
      return NextResponse.json(
        { error: 'Failed to count subscribers' },
        { status: 500 }
      )
    }

    return NextResponse.json({ count: count || 0 })
  } catch (error) {
    console.error('Subscribers error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
