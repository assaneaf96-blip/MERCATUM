import { NextRequest, NextResponse } from 'next/server'
import { fetchSettingsFromDb, saveSettingsToDb } from '@/lib/supabaseService'
import { DEFAULT_SETTINGS } from '@/lib/store'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const FAST_CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=30, stale-while-revalidate=120',
}

export async function GET() {
  try {
    const dbSettings = await fetchSettingsFromDb()
    if (dbSettings) {
      return NextResponse.json(
        { success: true, settings: { ...DEFAULT_SETTINGS, ...dbSettings } },
        { headers: FAST_CACHE_HEADERS }
      )
    }
    return NextResponse.json(
      { success: true, settings: DEFAULT_SETTINGS },
      { headers: FAST_CACHE_HEADERS }
    )
  } catch (err: any) {
    return NextResponse.json(
      { success: false, settings: DEFAULT_SETTINGS, error: err?.message },
      { status: 200 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const merged = { ...DEFAULT_SETTINGS, ...(body || {}) }
    const success = await saveSettingsToDb(merged)
    return NextResponse.json({ success, settings: merged })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Erreur sauvegarde paramètres' },
      { status: 500 }
    )
  }
}
