import { supabase, isSupabaseConfigured } from './supabase'
import { Product, MediaItem, extractContenance, extractVolumes, isVideoUrl } from './products'
import { SiteSettings, NewItem } from './store'

// ==========================================
// 1. GESTION DU CATALOGUE PRODUITS
// ==========================================

// Cache mémoire client pour navigation instantanée (< 1ms) entre pages
let clientCachedProducts: Product[] | null = null
let clientCacheTimestamp = 0
const CLIENT_CACHE_TTL = 30 * 1000 // 30 secondes de cache mémoire client

export function invalidateClientProductsCache() {
  clientCachedProducts = null
  clientCacheTimestamp = 0
}

export async function fetchProductsFromDb(forceRefresh = false): Promise<Product[] | null> {
  // 1. Si exécuté côté navigateur client, passer par l'API serveur interne
  // Cela évite tout blocage CORS ou certificats SSL locaux
  if (typeof window !== 'undefined') {
    if (!forceRefresh && clientCachedProducts && Date.now() - clientCacheTimestamp < CLIENT_CACHE_TTL) {
      return clientCachedProducts
    }
    try {
      const res = await fetch('/api/products')
      if (res.ok) {
        const json = await res.json()
        if (json.success && Array.isArray(json.products)) {
          clientCachedProducts = json.products
          clientCacheTimestamp = Date.now()
          return json.products
        }
      }
    } catch (err) {
      console.warn('API proxy /api/products indisponible, bascule directe Supabase:', err)
    }
  }

  // 2. Côté serveur ou repli direct Supabase
  if (!isSupabaseConfigured) return null
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, category, type, price, raw_price, description, image, images, tag, rating, reviews_count, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('Erreur Supabase fetchProducts:', error.message)
      return null
    }

    if (!data) return null

    return data.map((item: any) => {
      const vols = extractVolumes(item)
      const cont = item.contenance || extractContenance(item)
      const imagesList = Array.isArray(item.images) ? item.images : []
      const mediaList = imagesList.map((url: string) => ({
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
        image: item.image || (imagesList[0] || ''),
        images: imagesList,
        media: mediaList,
        tag: item.tag || '',
        contenance: cont,
        volumes: vols.length > 0 ? vols : undefined,
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
  // 1. Si côté navigateur, passer par l'API serveur interne
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/products?id=${encodeURIComponent(id)}`, { cache: 'no-store' })
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
    const cont = data.contenance || extractContenance(data)
    return {
      id: data.id,
      name: data.name,
      category: data.category,
      type: data.type || '',
      price: data.price,
      rawPrice: Number(data.raw_price) || 0,
      description: data.description || '',
      image: data.image || '',
      images: Array.isArray(data.images) ? data.images : [],
      media: Array.isArray(data.media) ? data.media : [],
      tag: data.tag || '',
      contenance: cont,
      volumes: vols.length > 0 ? vols : undefined,
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
        invalidateClientProductsCache()
        return { success: true }
      }
      return {
        success: false,
        error: json.error || `Erreur serveur (${res.status})`,
      }
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
          invalidateClientProductsCache()
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
      bankAccountHolder: data.bank_account_holder || '',
      bankIban: data.bank_iban || '',
      bankSwift: data.bank_swift || '',
      bankInstructions: data.bank_instructions || '',
      facebookPixelId: data.facebook_pixel_id || '',
      tiktokPixelId: data.tiktok_pixel_id || '',
      googleTagId: data.google_tag_id || '',
      customPixelScript: data.custom_pixel_script || '',
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
      bank_account_holder: settings.bankAccountHolder,
      bank_iban: settings.bankIban,
      bank_swift: settings.bankSwift,
      bank_instructions: settings.bankInstructions,
      facebook_pixel_id: settings.facebookPixelId,
      tiktok_pixel_id: settings.tiktokPixelId,
      google_tag_id: settings.googleTagId,
      custom_pixel_script: settings.customPixelScript,
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
