import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.redirect(new URL('/placeholder.svg', request.url))
    }

    const { data, error } = await supabase
      .from('products')
      .select('image')
      .eq('id', id)
      .single()

    if (error || !data || !data.image) {
      return NextResponse.redirect(new URL('/placeholder.svg', request.url))
    }

    const raw = String(data.image).trim()

    // 1. Si c'est une URL directe (http:// ou https://)
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return NextResponse.redirect(raw)
    }

    // 2. Si c'est un chemin relatif (/images/...)
    if (raw.startsWith('/')) {
      return NextResponse.redirect(new URL(raw, request.url))
    }

    // 3. Si c'est une image Data URL base64
    if (raw.startsWith('data:')) {
      const parts = raw.split(';base64,')
      if (parts.length === 2) {
        const mimeType = parts[0].replace('data:', '') || 'image/jpeg'
        const buffer = Buffer.from(parts[1], 'base64')

        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': mimeType,
            'Content-Length': buffer.length.toString(),
            'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
          },
        })
      }
    }

    return NextResponse.redirect(new URL('/placeholder.svg', request.url))
  } catch (err) {
    console.error('Erreur /api/product-image:', err)
    return NextResponse.redirect(new URL('/placeholder.svg', request.url))
  }
}
