import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

function hashSha256(val: string): string {
  if (!val) return ''
  return crypto.createHash('sha256').update(val.trim().toLowerCase()).digest('hex')
}

function hashPhone(val: string): string {
  if (!val) return ''
  // Normalisation du numéro (ex: +34 691 34 98 40 -> 34691349840)
  const cleaned = val.replace(/[^0-9]/g, '')
  return crypto.createHash('sha256').update(cleaned).digest('hex')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      eventName,
      eventId,
      eventSourceUrl,
      userData = {},
      customData = {},
      testEventCode,
    } = body

    if (!eventName) {
      return NextResponse.json({ error: 'eventName is required' }, { status: 400 })
    }

    const pixelId = process.env.META_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID || '3103103696688897'
    const accessToken =
      process.env.META_ACCESS_TOKEN ||
      process.env.FB_ACCESS_TOKEN ||
      process.env.FACEBOOK_CONVERSIONS_API_TOKEN

    // Récupération de l'IP et de l'User-Agent client pour un Event Match Quality élevé
    const forwarded = req.headers.get('x-forwarded-for')
    const clientIpAddress = forwarded ? forwarded.split(',')[0].trim() : req.headers.get('x-real-ip') || undefined
    const clientUserAgent = req.headers.get('user-agent') || undefined

    const fbp = req.cookies.get('_fbp')?.value
    const fbc = req.cookies.get('_fbc')?.value

    const hashedUserData: Record<string, any> = {
      client_ip_address: clientIpAddress,
      client_user_agent: clientUserAgent,
      country: [hashSha256('es')],
    }

    if (fbp) hashedUserData.fbp = fbp
    if (fbc) hashedUserData.fbc = fbc

    if (userData.email) {
      hashedUserData.em = [hashSha256(userData.email)]
    }
    if (userData.phone) {
      hashedUserData.ph = [hashPhone(userData.phone)]
    }
    if (userData.fullName) {
      const parts = userData.fullName.trim().split(/\s+/)
      if (parts[0]) hashedUserData.fn = [hashSha256(parts[0])]
      if (parts.length > 1) hashedUserData.ln = [hashSha256(parts.slice(1).join(' '))]
    }
    if (userData.address) {
      hashedUserData.zp = [hashSha256(userData.address.match(/\b\d{5}\b/)?.[0] || '')].filter(Boolean)
    }

    const eventPayload: Record<string, any> = {
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId || `ev_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      event_source_url: eventSourceUrl || 'https://www.mercatum-shop.app',
      action_source: 'website',
      user_data: hashedUserData,
      custom_data: {
        currency: customData.currency || 'EUR',
        value: Number(customData.value || 0),
        ...(customData.content_name ? { content_name: customData.content_name } : {}),
        ...(customData.content_ids ? { content_ids: customData.content_ids } : {}),
        ...(customData.content_type ? { content_type: customData.content_type } : {}),
        ...(customData.num_items ? { num_items: Number(customData.num_items) } : {}),
        ...(customData.order_id ? { order_id: String(customData.order_id) } : {}),
      },
    }

    const metaRequestBody: Record<string, any> = {
      data: [eventPayload],
    }

    const activeTestCode = testEventCode || process.env.META_TEST_EVENT_CODE
    if (activeTestCode) {
      metaRequestBody.test_event_code = activeTestCode
    }

    let metaResult: any = null
    let capiSent = false

    if (accessToken && pixelId) {
      try {
        const metaRes = await fetch(
          `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(metaRequestBody),
          }
        )
        metaResult = await metaRes.json()
        capiSent = metaRes.ok
      } catch (err: any) {
        console.warn('Meta CAPI fetch error:', err.message)
      }
    }

    return NextResponse.json({
      success: true,
      eventName,
      eventId: eventPayload.event_id,
      capiConfigured: Boolean(accessToken),
      capiSent,
      metaResponse: metaResult,
    })
  } catch (error: any) {
    console.error('Conversions API route error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
