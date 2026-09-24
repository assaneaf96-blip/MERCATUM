import { supabase, isSupabaseConfigured } from './supabase'
import { Product, MediaItem, extractContenance, extractVolumes, extractColors, extractColorImages, isVideoUrl } from './products'
import { SiteSettings, NewItem } from './store'
import { getClientCachedProducts, setClientCachedProducts, invalidateClientCache } from './clientCache'

// ==========================================
// 1. GESTION DU CATALOGUE PRODUITS
// ==========================================

// Cache mémoire client pour affichage instantané
let clientCachedProducts: Product[] | null = null

export function invalidateClientProductsCache() {
  clientCachedProducts = null
  invalidateClientCache()
}

/**
 * Écoute les modifications de produits en temps réel via Supabase Realtime
 * Dès qu'un produit est inséré, modifié ou supprimé, le callback est exécuté immédiatement.
 */
export function subscribeToProductsChanges(onUpdate: (payload?: any) => void): () => void {
  if (typeof window === 'undefined' || !isSupabaseConfigured) {
    return () => {}
  }

  try {
    const channel = supabase
      .channel('realtime:products_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          invalidateClientProductsCache()
          onUpdate(payload)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Supabase Realtime] Écoute active sur la table products')
        }
      })

    return () => {
      try {
        supabase.removeChannel(channel)
      } catch {}
    }
  } catch (err) {
    console.warn('Erreur initialisation Supabase Realtime:', err)
    return () => {}
  }
}

export async function fetchProductsFromDb(forceRefresh = true): Promise<Product[] | null> {
  // 1. Si exécuté côté navigateur client, interroger l'API avec contournement immédiat de cache
  if (typeof window !== 'undefined') {
    try {
      const url = `/api/products?t=${Date.now()}`
      const res = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache',
        },
      })
      if (res.ok) {
        const json = await res.json()
        if (json.success && Array.isArray(json.products)) {
          clientCachedProducts = json.products
          setClientCachedProducts(json.products).catch(() => {})
          return json.products
        }
      }
    } catch (err) {
      console.warn('API proxy /api/products indisponible, bascule directe Supabase:', err)
    }

    // Si l'API échoue temporairement, repli sur le cache mémoire ou IndexedDB
    if (clientCachedProducts && clientCachedProducts.length > 0) {
      return clientCachedProducts
    }
    const cached = await getClientCachedProducts().catch(() => null)
    if (cached && cached.length > 0) {
      return cached
    }
  }

  // 2. Côté serveur ou repli direct Supabase
  if (!isSupabaseConfigured) return null
  try {
    const batchSize = 100
    const ranges: { from: number; to: number }[] = []
    for (let i = 0; i < 800; i += batchSize) {
      ranges.push({ from: i, to: i + batchSize - 1 })
    }

    const responses = await Promise.all(
      ranges.map((r) =>
        supabase
          .from('products')
          .select('id, name, category, type, price, raw_price, tag, rating, reviews_count, image')
          .order('id', { ascending: true })
          .range(r.from, r.to)
      )
    )

    let allData: any[] = []
    for (const res of responses) {
      if (res.data && res.data.length > 0) {
        allData.push(...res.data)
      }
    }

    if (allData.length === 0) return null

    return allData.map((item: any) => {
      const vols = extractVolumes(item)
      const cols = extractColors(item)
      const colImgs = extractColorImages(item)
      const cont = item.contenance || extractContenance(item)

      let rawImages: string[] = []
      if (Array.isArray(item.images)) rawImages = item.images.filter(Boolean)
      else if (typeof item.images === 'string') {
        try {
          const parsed = JSON.parse(item.images)
          if (Array.isArray(parsed)) rawImages = parsed.filter(Boolean)
        } catch {}
      }

      let rawMedia: any[] = []
      if (Array.isArray(item.media)) rawMedia = item.media.filter(Boolean)
      else if (typeof item.media === 'string') {
        try {
          const parsed = JSON.parse(item.media)
          if (Array.isArray(parsed)) rawMedia = parsed.filter(Boolean)
        } catch {}
      }

      const mediaUrls = rawMedia.map((m: any) => (typeof m === 'string' ? m : m?.url)).filter(Boolean)
      let mainImage = (typeof item.image === 'string' ? item.image.trim() : '') || rawImages[0] || mediaUrls[0] || ''
      if (mainImage && mainImage.startsWith('data:')) {
        mainImage = `/api/product-image?id=${encodeURIComponent(item.id)}`
      }

      const allImagesSet = new Set<string>()
      if (mainImage) allImagesSet.add(mainImage)
      rawImages.forEach((u) => {
        if (u && typeof u === 'string') {
          const trimmed = u.trim()
          allImagesSet.add(trimmed.startsWith('data:') ? `/api/product-image?id=${encodeURIComponent(item.id)}` : trimmed)
        }
      })
      mediaUrls.forEach((u) => {
        if (u && typeof u === 'string') {
          const trimmed = u.trim()
          allImagesSet.add(trimmed.startsWith('data:') ? `/api/product-image?id=${encodeURIComponent(item.id)}` : trimmed)
        }
      })

      const imagesList = Array.from(allImagesSet)
      const mediaList: MediaItem[] = imagesList.map((url) => ({
        url,
        type: isVideoUrl(url) ? 'video' : 'image',
      }))

      return {
        id: item.id,
        name: item.name,
        category: item.category,
        type: item.type || '',
        price: item.price,
        rawPrice: Number(item.raw_price) || 0,
        description: item.description || '',
        image: mainImage,
        images: imagesList,
        media: mediaList,
        tag: item.tag || '',
        contenance: cont,
        volumes: vols.length > 0 ? vols : undefined,
        colors: cols.length > 0 ? cols : undefined,
        color: cols.length > 0 ? cols.join(', ') : undefined,
        colorImages: Object.keys(colImgs).length > 0 ? colImgs : undefined,
        rating: Number(item.rating) || 5.0,
        reviewsCount: Number(item.reviews_count) || 1,
      }
    })
  } catch (err) {
    console.error('Erreur inattendue fetchProductsFromDb:', err)
    return null
  }
}

export async function fetchProductByIdFromDb(id: string): Promise<Product | null> {
  // 1. Si côté navigateur, passer par l'API serveur interne avec no-store
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/products?id=${encodeURIComponent(id)}&t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache',
        },
      })
      if (res.ok) {
        const json = await res.json()
        if (json.success && json.product) {
          return json.product
        }
      }
    } catch (err) {
      console.warn('API proxy /api/products single indisponible, bascule directe Supabase:', err)
    }
  }

  // 2. Côté serveur ou repli direct Supabase
  if (!isSupabaseConfigured) return null
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) return null

    const vols = extractVolumes(data)
    const cols = extractColors(data)
    const colImgs = extractColorImages(data)
    const cont = data.contenance || extractContenance(data)
    let rawImages: string[] = []
    if (Array.isArray(data.images)) rawImages = data.images.filter(Boolean)
    else if (typeof data.images === 'string') {
      try {
        const parsed = JSON.parse(data.images)
        if (Array.isArray(parsed)) rawImages = parsed.filter(Boolean)
      } catch {}
    }

    let rawMedia: any[] = []
    if (Array.isArray(data.media)) rawMedia = data.media.filter(Boolean)
    else if (typeof data.media === 'string') {
      try {
        const parsed = JSON.parse(data.media)
        if (Array.isArray(parsed)) rawMedia = parsed.filter(Boolean)
      } catch {}
    }

    const mediaUrls = rawMedia.map((m: any) => (typeof m === 'string' ? m : m?.url)).filter(Boolean)
    const mainImage = (typeof data.image === 'string' ? data.image.trim() : '') || rawImages[0] || mediaUrls[0] || ''

    const allImagesSet = new Set<string>()
    if (mainImage) allImagesSet.add(mainImage)
    rawImages.forEach((u) => { if (u && typeof u === 'string') allImagesSet.add(u.trim()) })
    mediaUrls.forEach((u) => { if (u && typeof u === 'string') allImagesSet.add(u.trim()) })

    const imagesList = Array.from(allImagesSet)
    const mediaList: MediaItem[] = imagesList.map((url) => ({
      url,
      type: isVideoUrl(url) ? 'video' : 'image',
    }))

    return {
      id: data.id,
      name: data.name,
      category: data.category,
      type: data.type || '',
      price: data.price,
      rawPrice: Number(data.raw_price) || 0,
      description: data.description || '',
      image: mainImage,
      images: imagesList,
      media: mediaList,
      tag: data.tag || '',
      contenance: cont,
      volumes: vols.length > 0 ? vols : undefined,
      colors: cols.length > 0 ? cols : undefined,
      color: cols.length > 0 ? cols.join(', ') : undefined,
      colorImages: Object.keys(colImgs).length > 0 ? colImgs : undefined,
      rating: Number(data.rating) || 5.0,
      reviewsCount: Number(data.reviews_count) || 1,
    }
  } catch (err) {
    console.error('Erreur fetchProductByIdFromDb:', err)
    return null
  }
}

export async function saveProductToDbDetailed(
  product: Product
): Promise<{ success: boolean; error?: string }> {
  // 1. Côté navigateur : passer impérativement par la route serveur Next.js
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        if (clientCachedProducts) {
          const idx = clientCachedProducts.findIndex((p) => p.id === product.id)
          if (idx >= 0) {
            clientCachedProducts[idx] = { ...clientCachedProducts[idx], ...product }
          } else {
            clientCachedProducts.unshift(product)
          }
        }
        return { success: true }
      }
      console.warn(`API proxy /api/products a renvoyé code ${res.status}: ${json.error || 'Erreur'}, bascule directe vers Supabase...`)
    } catch (err: any) {
      console.warn('API proxy /api/products indisponible, tentative Supabase directe:', err)
    }
  }

  // 2. Côté serveur ou repli Supabase direct
  try {
    const { error } = await supabase.from('products').upsert({
      id: product.id,
      name: product.name,
      category: product.category,
      type: product.type,
      price: product.price,
      raw_price: product.rawPrice,
      description: product.description,
      image: product.image,
      images: product.images || [],
      media: product.media || [],
      tag: product.tag,
      rating: product.rating,
      reviews_count: product.reviewsCount,
    })

    if (error) {
      console.error('Erreur Supabase saveProduct:', error.message)
      return { success: false, error: error.message }
    }
    invalidateClientProductsCache()
    return { success: true }
  } catch (err: any) {
    console.error('Erreur saveProductToDb:', err)
    return { success: false, error: err?.message || 'Erreur inattendue' }
  }
}

export async function saveProductToDb(product: Product): Promise<boolean> {
  const res = await saveProductToDbDetailed(product)
  return res.success
}

export async function deleteProductFromDb(id: string): Promise<boolean> {
  // 1. Côté navigateur : passer par la route serveur Next.js
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/products?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        const json = await res.json()
        if (json.success) {
          if (clientCachedProducts) {
            clientCachedProducts = clientCachedProducts.filter((p) => p.id !== id)
          }
          return true
        }
      }
    } catch (err) {
      console.warn('API proxy /api/products delete indisponible, tentative Supabase directe:', err)
    }
  }

  // 2. Côté serveur ou repli Supabase direct
  try {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) {
      console.error('Erreur Supabase deleteProduct:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.error('Erreur deleteProductFromDb:', err)
    return false
  }
}

// ==========================================
// 2. GESTION DES NOUVEAUTÉS
// ==========================================

export async function fetchNouveautesFromDb(): Promise<NewItem[] | null> {
  try {
    const { data, error } = await supabase
      .from('nouveautes')
      .select('*')
      .order('display_order', { ascending: true })

    if (error) {
      console.warn('Erreur Supabase fetchNouveautes:', error.message)
      return null
    }

    if (!data) return null

    return data.map((item: any) => ({
      productId: item.product_id,
      customLabel: item.custom_label || 'Nouveauté',
    }))
  } catch (err) {
    console.error('Erreur fetchNouveautesFromDb:', err)
    return null
  }
}

export async function saveNouveautesToDb(items: NewItem[]): Promise<boolean> {
  try {
    // Vider puis réinsérer pour maintenir l'ordre exact
    await supabase.from('nouveautes').delete().neq('id', 0)

    const payload = items.map((item, index) => ({
      product_id: item.productId,
      custom_label: item.customLabel,
      display_order: index + 1,
    }))

    const { error } = await supabase.from('nouveautes').insert(payload)
    if (error) {
      console.error('Erreur Supabase saveNouveautes:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.error('Erreur saveNouveautesToDb:', err)
    return false
  }
}

// ==========================================
// 3. GESTION DES COMMANDES (VIREMENT BANCAIRE)
// ==========================================

export interface OrderPayload {
  id: string
  customerName: string
  customerEmail: string
  customerPhone: string
  customerAddress: string
  productId?: string
  productName?: string
  totalPrice: number
}

export async function createOrderInDb(order: OrderPayload): Promise<boolean> {
  try {
    const { error } = await supabase.from('orders').insert({
      id: order.id,
      customer_name: order.customerName,
      customer_email: order.customerEmail,
      customer_phone: order.customerPhone,
      customer_address: order.customerAddress,
      product_id: order.productId || null,
      product_name: order.productName || null,
      total_price: order.totalPrice,
      currency: 'EUR',
      payment_method: 'Virement Bancaire',
      status: 'En attente de virement',
    })

    if (error) {
      console.error('Erreur Supabase createOrder:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.error('Erreur createOrderInDb:', err)
    return false
  }
}

export async function markOrderPaymentConfirmedInDb(orderId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'Pago confirmado por cliente',
      })
      .eq('id', orderId)

    if (error) {
      console.warn('Erreur Supabase markOrderPaymentConfirmed:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.warn('Erreur markOrderPaymentConfirmedInDb:', err)
    return false
  }
}

export async function fetchOrdersFromDb(): Promise<any[] | null> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('Erreur Supabase fetchOrders:', error.message)
      return null
    }

    if (!data) return null

    return data.map((item: any) => ({
      id: item.id,
      customerName: item.customer_name,
      customerEmail: item.customer_email,
      customerPhone: item.customer_phone,
      customerAddress: item.customer_address,
      productId: item.product_id,
      productName: item.product_name,
      totalPrice: Number(item.total_price) || 0,
      currency: item.currency || 'EUR',
      paymentMethod: item.payment_method || 'Virement Bancaire',
      status: item.status || 'En attente de virement',
      createdAt: item.created_at,
    }))
  } catch (err) {
    console.error('Erreur fetchOrdersFromDb:', err)
    return null
  }
}

export async function updateOrderStatusInDb(id: string, status: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)

    if (error) {
      console.error('Erreur Supabase updateOrderStatus:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.error('Erreur updateOrderStatusInDb:', err)
    return false
  }
}

export async function deleteOrderFromDb(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Erreur Supabase deleteOrder:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.error('Erreur deleteOrderFromDb:', err)
    return false
  }
}

// ==========================================
// 4. PARAMÈTRES DU SITE & BANQUE & PIXELS
// ==========================================

export async function fetchSettingsFromDb(): Promise<SiteSettings | null> {
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .eq('id', 1)
      .single()

    if (error || !data) {
      return null
    }

    return {
      siteName: data.site_name || 'MERCATUM',
      announcement: data.announcement || '',
      heroTitle: data.hero_title || '',
      heroSubtitle: data.hero_subtitle || '',
      contactPhone: data.contact_phone || '',
      contactAddress: data.contact_address || '',
      contactEmail: data.contact_email || '',
      contactHours: data.contact_hours || '',
      bankName: data.bank_name || '',
      bankAccountHolder: data.account_holder || '',
      bankIban: data.iban || '',
      bankSwift: data.bic || '',
      facebookPixelId: data.meta_pixel_id || '',
      tiktokPixelId: data.tiktok_pixel_id || '',
      googleTagId: data.google_tag_id || '',
      pinterestTagId: data.pinterest_tag_id || '',
      customPixelScript: '',
    }
  } catch (err) {
    console.error('Erreur fetchSettingsFromDb:', err)
    return null
  }
}

export async function saveSettingsToDb(settings: SiteSettings): Promise<boolean> {
  try {
    const { error } = await supabase.from('site_settings').upsert({
      id: 1,
      site_name: settings.siteName,
      announcement: settings.announcement,
      hero_title: settings.heroTitle,
      hero_subtitle: settings.heroSubtitle,
      contact_phone: settings.contactPhone,
      contact_address: settings.contactAddress,
      contact_email: settings.contactEmail,
      contact_hours: settings.contactHours,
      bank_name: settings.bankName,
      account_holder: settings.bankAccountHolder,
      iban: settings.bankIban,
      bic: settings.bankSwift,
      meta_pixel_id: settings.facebookPixelId || '',
      tiktok_pixel_id: settings.tiktokPixelId || '',
      google_tag_id: settings.googleTagId || '',
      pinterest_tag_id: settings.pinterestTagId || '',
      updated_at: new Date().toISOString(),
    })

    if (error) {
      console.error('Erreur Supabase saveSettings:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.error('Erreur saveSettingsToDb:', err)
    return false
  }
}
