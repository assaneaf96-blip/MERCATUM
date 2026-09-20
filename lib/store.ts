// lib/store.ts
// Gestion de la persistance des données en localStorage pour l'admin Maison Lune

import { Product, PRODUCTS as DEFAULT_PRODUCTS } from './products'
import { setClientCachedProducts } from './clientCache'

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface SiteSettings {
  siteName: string
  announcement: string
  heroTitle: string
  heroSubtitle: string
  contactPhone: string
  contactAddress: string
  contactEmail: string
  contactHours: string
  // Coordonnées bancaires pour virement
  bankName: string
  bankAccountHolder: string
  bankIban: string
  bankSwift: string
  bankInstructions?: string
  // Pixels de suivi publicitaire
  facebookPixelId?: string
  tiktokPixelId?: string
  googleTagId?: string
  pinterestTagId?: string
  customPixelScript?: string
}

export interface NewItem {
  productId: string
  customLabel?: string
}

export interface Order {
  id: string
  customerName: string
  customerEmail: string
  customerPhone: string
  customerAddress: string
  productId?: string
  productName?: string
  totalPrice: number
  currency: string
  paymentMethod: string
  status: 'En attente de virement' | 'Paiement reçu' | 'Expédiée' | 'Annulée'
  createdAt: string
}

const STORAGE_KEYS = {
  PRODUCTS: 'ml_admin_products',
  DELETED_PRODUCTS: 'ml_admin_deleted_products',
  NOUVEAUTES: 'ml_admin_nouveautes',
  SETTINGS: 'ml_admin_settings',
  AUTH: 'ml_admin_auth',
  ORDERS: 'ml_admin_orders',
}

export const DEFAULT_SETTINGS: SiteSettings = {
  siteName: 'MERCATUM',
  announcement: 'Arte de Vivir & Santuario Interior · Envío gratuito a partir de 150 €',
  heroTitle: "El Lujo de Habitar su Espacio.",
  heroSubtitle: "Un espacio refinado donde vivir en armonía. Piezas de mobiliario, electrodomésticos de excepción y rituales de bienestar diseñados para transformar su hogar.",
  contactPhone: '+34 910 00 00 00',
  contactAddress: 'Paseo de la Castellana, 28046 Madrid, España',
  contactEmail: 'contact@mercatum.fr',
  contactHours: 'Lunes a Viernes: 10:00 – 19:00 · Sábados: 10:00 – 17:00',
  bankName: 'Banco Santander',
  bankAccountHolder: 'MERCATUM',
  bankIban: 'ES91 2100 0418 4502 0005 1332',
  bankSwift: 'BSCHESMMXXX',
  bankInstructions: 'Por favor, indique su referencia de pedido como concepto de la transferencia bancaria.',
  facebookPixelId: '',
  tiktokPixelId: '',
  googleTagId: '',
  pinterestTagId: '',
  customPixelScript: '',
}

// ─────────────────────────────────────────────
// HELPERS (safe localStorage access for SSR)
// ─────────────────────────────────────────────

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

// Helper pour alléger les produits enregistrés en localStorage
// Évite impérativement l'erreur QUOTA_EXCEEDED_ERR (5 Mo max par domaine)
export function compactProductForStorage(product: Product): Product {
  const isVideo = (url?: string) =>
    typeof url === 'string' && (url.startsWith('data:video') || url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i))

  const cleanImage = isVideo(product.image) ? '' : product.image
  const cleanImages = Array.isArray(product.images)
    ? product.images.filter((img) => !isVideo(img)).slice(0, 5)
    : []
  const cleanMedia = Array.isArray(product.media)
    ? product.media
        .filter((m) => {
          const url = typeof m === 'string' ? m : m?.url
          return !isVideo(url)
        })
        .slice(0, 5)
    : undefined

  return {
    ...product,
    image: cleanImage || (cleanImages[0] || ''),
    images: cleanImages,
    media: cleanMedia,
  }
}

function safeWrite(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    console.warn('[store] Erreur quota localStorage:', err)
  }
}

// ─────────────────────────────────────────────
// PRODUITS
// ─────────────────────────────────────────────

export function getDeletedProductIds(): string[] {
  return safeRead<string[]>(STORAGE_KEYS.DELETED_PRODUCTS, [])
}

/** Retourne tous les produits : défauts non supprimés + ceux ajoutés/modifiés via l'admin */
export function getProducts(): Product[] {
  const adminProducts = safeRead<Product[]>(STORAGE_KEYS.PRODUCTS, [])
  const deletedIds = new Set(getDeletedProductIds())
  
  // Si DEFAULT_PRODUCTS a plus d'images pour un produit, toujours préserver la liste complète
  const defaultMap = new Map<string, Product>()
  DEFAULT_PRODUCTS.forEach((p) => defaultMap.set(p.id, p))

  const enhancedAdmin = adminProducts.map((ap) => {
    const def = defaultMap.get(ap.id)
    if (def) {
      const chosenMain = (ap.image || def.image || '').trim()
      const apHasImages = (ap.images && ap.images.length > 0) || (ap.media && ap.media.length > 0)
      const rawImages = apHasImages
        ? (ap.images && ap.images.length > 0 ? ap.images : (ap.media || []).map((m: any) => typeof m === 'string' ? m : m.url))
        : (def.images && def.images.length > 0 ? def.images : (chosenMain ? [chosenMain] : []))

      const orderedImages = chosenMain
        ? [chosenMain, ...rawImages.filter((x) => x !== chosenMain)]
        : rawImages

      const rawMedia = (ap.media && ap.media.length > 0)
        ? ap.media
        : (def.media && def.media.length > 0 ? def.media : orderedImages.map((url) => ({ url, type: 'image' as const })))

      return {
        ...ap,
        image: chosenMain,
        images: orderedImages,
        media: rawMedia,
      }
    }
    return ap
  })

  const adminIds = new Set(enhancedAdmin.map((p) => p.id))
  const base = DEFAULT_PRODUCTS.filter((p) => !adminIds.has(p.id) && !deletedIds.has(p.id))
  return [...base, ...enhancedAdmin].filter((p) => !deletedIds.has(p.id))
}

/** Retourne uniquement les produits personnalisés ou modifiés par l'admin */
export function getAdminProducts(): Product[] {
  return safeRead<Product[]>(STORAGE_KEYS.PRODUCTS, [])
}

/** Sauvegarde ou met à jour un produit (upsert) */
export function saveProduct(product: Product): void {
  // Retirer des supprimés si nécessaire
  const deleted = getDeletedProductIds().filter((id) => id !== product.id)
  safeWrite(STORAGE_KEYS.DELETED_PRODUCTS, deleted)

  const compacted = compactProductForStorage(product)
  const products = getAdminProducts()
  const idx = products.findIndex((p) => p.id === product.id)
  if (idx >= 0) {
    products[idx] = compacted
  } else {
    products.push(compacted)
  }
  safeWrite(STORAGE_KEYS.PRODUCTS, products)
  setClientCachedProducts(getProducts()).catch(() => {})

  // Notifier immédiatement toutes les pages/onglets ouverts
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mercatum:products_updated', { detail: compacted }))
  }
}

/** Met à jour les produits en cache local tout en préservant les créations locales non encore envoyées au Cloud */
export function saveProductsBulk(items: Product[]): void {
  if (!Array.isArray(items) || items.length === 0) return
  try {
    const currentLocal = safeRead<Product[]>(STORAGE_KEYS.PRODUCTS, [])
    const incomingIds = new Set(items.map((p) => p.id))
    // Conserver les produits locaux créés qui ne sont pas encore présents dans la base distante
    const unsynced = currentLocal.filter((p) => p && p.id && !incomingIds.has(p.id))
    const mergedList = [...items, ...unsynced]

    // 1. Sauvegarde instantanée dans IndexedDB sans limite de quota
    setClientCachedProducts(mergedList).catch(() => {})

    // 2. En localStorage, ne stocker que les éventuels produits locaux non synchronisés (pour rester bien sous 50 Ko et éviter les crashs de quota Safari iOS)
    if (unsynced.length > 0) {
      safeWrite(STORAGE_KEYS.PRODUCTS, unsynced.map((p) => compactProductForStorage(p)))
    } else {
      if (typeof window !== 'undefined') {
        try { localStorage.removeItem(STORAGE_KEYS.PRODUCTS) } catch {}
      }
    }
  } catch (err) {
    console.warn('saveProductsBulk error:', err)
  }
}

/** Retourne les produits en cache local qui ne figurent pas encore dans la base distante */
export function getUnsyncedLocalProducts(dbProductIds: string[]): Product[] {
  const currentLocal = safeRead<Product[]>(STORAGE_KEYS.PRODUCTS, [])
  const dbSet = new Set(dbProductIds)
  return currentLocal.filter((p) => p && p.id && !dbSet.has(p.id))
}

/** Supprime un produit (qu'il soit par défaut ou créé par l'admin) */
export function deleteProduct(id: string): void {
  // Retirer des produits admin personnalisés
  const products = getAdminProducts().filter((p) => p.id !== id)
  safeWrite(STORAGE_KEYS.PRODUCTS, products)

  // Enregistrer comme supprimé
  const deleted = getDeletedProductIds()
  if (!deleted.includes(id)) {
    deleted.push(id)
    safeWrite(STORAGE_KEYS.DELETED_PRODUCTS, deleted)
  }

  // Notifier immédiatement toutes les pages/onglets ouverts
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mercatum:products_updated', { detail: { id, deleted: true } }))
  }
}

/** Réinitialiser les produits aux valeurs par défaut */
export function resetProductsToDefault(): void {
  safeWrite(STORAGE_KEYS.PRODUCTS, [])
  safeWrite(STORAGE_KEYS.DELETED_PRODUCTS, [])
}

/** Vérifie si un produit existe dans le catalogue par défaut */
export function isDefaultProduct(id: string): boolean {
  return DEFAULT_PRODUCTS.some((p) => p.id === id)
}

// ─────────────────────────────────────────────
// NOUVEAUTÉS
// ─────────────────────────────────────────────

const DEFAULT_NOUVEAUTES: NewItem[] = [
  { productId: 'idole-now-lancome', customLabel: 'Parfumerie · Nouveau' },
  { productId: 'creme-supreme-anti-age', customLabel: 'Soins Anti-Âge · N°1 des Ventes' },
]

export function getNouveautes(): NewItem[] {
  return safeRead<NewItem[]>(STORAGE_KEYS.NOUVEAUTES, DEFAULT_NOUVEAUTES)
}

export function saveNouveautes(items: NewItem[]): void {
  safeWrite(STORAGE_KEYS.NOUVEAUTES, items)
}

// ─────────────────────────────────────────────
// PARAMÈTRES DU SITE
// ─────────────────────────────────────────────

export function getSiteSettings(): SiteSettings {
  const saved = safeRead<Partial<SiteSettings>>(STORAGE_KEYS.SETTINGS, {})
  return { ...DEFAULT_SETTINGS, ...saved }
}

export function saveSiteSettings(settings: SiteSettings): void {
  safeWrite(STORAGE_KEYS.SETTINGS, settings)
}

// ─────────────────────────────────────────────
// TABLEAU DE VENTES & COMMANDES
// ─────────────────────────────────────────────

const DEFAULT_ORDERS: Order[] = [
  {
    id: 'ML-849201',
    customerName: 'Éléonore de Montmirail',
    customerEmail: 'eleonore.montmirail@gmail.com',
    customerPhone: '+33 6 12 34 56 78',
    customerAddress: '14 rue de Rivoli, 75004 Paris',
    productId: 'creme-supreme-anti-age',
    productName: 'Crème Suprême Jeunesse Absolue',
    totalPrice: 125.00,
    currency: 'EUR',
    paymentMethod: 'Virement Bancaire',
    status: 'Paiement reçu',
    createdAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
  },
  {
    id: 'ML-932145',
    customerName: 'Camille Laurent',
    customerEmail: 'camille.laurent@outlook.fr',
    customerPhone: '+33 7 89 01 23 45',
    customerAddress: '8 place Bellecour, 69002 Lyon',
    productId: 'idole-now-lancome',
    productName: 'Idôle Now — Lancôme Paris',
    totalPrice: 98.00,
    currency: 'EUR',
    paymentMethod: 'Virement Bancaire',
    status: 'En attente de virement',
    createdAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
  },
  {
    id: 'ML-715309',
    customerName: 'Alexandre Beaulieu',
    customerEmail: 'a.beaulieu@free.fr',
    customerPhone: '+33 6 98 76 54 32',
    customerAddress: '27 boulevard de la Croisette, 06400 Cannes',
    productId: 'serum-eclat-botanique',
    productName: 'Sérum Infusion Régénérant Nuit',
    totalPrice: 95.00,
    currency: 'EUR',
    paymentMethod: 'Virement Bancaire',
    status: 'Expédiée',
    createdAt: new Date(Date.now() - 3600 * 1000 * 28).toISOString(),
  }
]

export function getOrders(): Order[] {
  return safeRead<Order[]>(STORAGE_KEYS.ORDERS, DEFAULT_ORDERS)
}

export function saveOrder(order: Order): void {
  const orders = getOrders()
  const idx = orders.findIndex((o) => o.id === order.id)
  if (idx >= 0) {
    orders[idx] = order
  } else {
    orders.unshift(order)
  }
  safeWrite(STORAGE_KEYS.ORDERS, orders)
}

export function updateOrderStatus(id: string, status: Order['status']): void {
  const orders = getOrders()
  const target = orders.find((o) => o.id === id)
  if (target) {
    target.status = status
    safeWrite(STORAGE_KEYS.ORDERS, orders)
  }
}

export function deleteOrder(id: string): void {
  const orders = getOrders().filter((o) => o.id !== id)
  safeWrite(STORAGE_KEYS.ORDERS, orders)
}

// ─────────────────────────────────────────────
// AUTHENTIFICATION ADMIN
// ─────────────────────────────────────────────

const DEFAULT_PASSWORD = 'admin1234'

export function checkAdminPassword(input: string): boolean {
  const stored = safeRead<string>(STORAGE_KEYS.AUTH, DEFAULT_PASSWORD)
  return input === stored
}

export function changeAdminPassword(newPassword: string): void {
  safeWrite(STORAGE_KEYS.AUTH, newPassword)
}

export function isAdminLoggedIn(): boolean {
  if (typeof window === 'undefined') return false
  return sessionStorage.getItem('ml_admin_session') === '1'
}

export function loginAdmin(): void {
  if (typeof window !== 'undefined') sessionStorage.setItem('ml_admin_session', '1')
}

export function logoutAdmin(): void {
  if (typeof window !== 'undefined') sessionStorage.removeItem('ml_admin_session')
}
