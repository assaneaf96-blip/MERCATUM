import { supabase, isSupabaseConfigured } from './supabase'
import { Product, MediaItem } from './products'
import { SiteSettings, NewItem } from './store'

// ==========================================
// 1. GESTION DU CATALOGUE PRODUITS
// ==========================================

export async function fetchProductsFromDb(): Promise<Product[] | null> {
  if (!isSupabaseConfigured) return null
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('Erreur Supabase fetchProducts:', error.message)
      return null
    }

    if (!data) return null

    return data.map((item: any) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      type: item.type || '',
      price: item.price,
      rawPrice: Number(item.raw_price) || 0,
      description: item.description || '',
      image: item.image || '',
      images: Array.isArray(item.images) ? item.images : [],
      media: Array.isArray(item.media) ? item.media : [],
      tag: item.tag || '',
      rating: Number(item.rating) || 5.0,
      reviewsCount: Number(item.reviews_count) || 1,
    }))
  } catch (err) {
    console.error('Erreur inattendue fetchProductsFromDb:', err)
    return null
  }
}

export async function fetchProductByIdFromDb(id: string): Promise<Product | null> {
  if (!isSupabaseConfigured) return null
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) return null

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
      rating: Number(data.rating) || 5.0,
      reviewsCount: Number(data.reviews_count) || 1,
    }
  } catch (err) {
    console.error('Erreur fetchProductByIdFromDb:', err)
    return null
  }
}

export async function saveProductToDb(product: Product): Promise<boolean> {
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
      return false
    }
    return true
  } catch (err) {
    console.error('Erreur saveProductToDb:', err)
    return false
  }
}

export async function deleteProductFromDb(id: string): Promise<boolean> {
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
      siteName: data.site_name || 'Maison Lune',
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
