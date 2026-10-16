import { NextResponse } from 'next/server'
import { getAdminContext } from '@/lib/admin-auth'
import { getRealTrafficData, clearRealTrafficLogs } from '@/lib/security/traffic-recorder'
import { logAudit } from '@/lib/supabase/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const context = await getAdminContext()
  if (!context) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const data = getRealTrafficData()
  return NextResponse.json({
    ...data,
    lastUpdated: new Date().toISOString(),
  })
}

export async function DELETE() {
  const context = await getAdminContext()
  if (!context) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = clearRealTrafficLogs()

  try {
    await logAudit({
      actor_id: context.user.id,
      action: 'clear',
      entity: 'traffic_monitor_logs',
      details: { clearedCount: result.clearedCount },
    })
  } catch (err) {
    console.warn('[TrafficAPI] Failed to log audit event:', err)
  }

  return NextResponse.json({
    success: true,
    clearedCount: result.clearedCount,
    message: 'All recorded traffic logs and threat alerts have been cleared.',
  })
}
