// lib/store.ts
// Gestion de la persistance des données en localStorage pour l'admin Maison Lune

import { Product, PRODUCTS as DEFAULT_PRODUCTS } from './products'

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
  currency?: string
  paymentMethod?: string
  status: 'En attente de virement' | 'Paiement reçu' | 'Expédiée' | 'Livrée' | 'Annulée'
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
  siteName: 'Maison Lune',
  announcement: 'Livraison offerte dès 60 € · Idôle Now 100ml à 100,00 € — Nouveauté exclusive !',
  heroTitle: 'La Jeunesse, sublimée.',
  heroSubtitle: "Des soins anti-âge d'exception, formulés avec les actifs botaniques les plus précieux et concentrés. Une efficacité prouvée pour révéler l'éclat et la fermeté de votre peau.",
  contactPhone: '+33 1 42 56 12 00',
  contactAddress: '24 avenue Montaigne, 75008 Paris, France',
  contactEmail: 'contact@maisonlune.fr',
  contactHours: 'Lundi – Vendredi : 10h – 19h · Samedi : 10h – 17h',
  bankName: 'BNP Paribas Private Banking',
  bankAccountHolder: 'Maison Lune Paris SAS',
  bankIban: 'FR76 3000 4001 2345 6789 0123 456',
  bankSwift: 'BNPAFR2PXXX',
  bankInstructions: 'Veuillez mentionner votre référence de commande en motif de virement.',
  facebookPixelId: '',
  tiktokPixelId: '',
  googleTagId: '',
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

function safeWrite(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore quota errors
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
  const adminIds = new Set(adminProducts.map((p) => p.id))
  const base = DEFAULT_PRODUCTS.filter((p) => !adminIds.has(p.id) && !deletedIds.has(p.id))
  return [...base, ...adminProducts].filter((p) => !deletedIds.has(p.id))
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

  const products = getAdminProducts()
  const idx = products.findIndex((p) => p.id === product.id)
  if (idx >= 0) {
    products[idx] = product
  } else {
    products.push(product)
  }
  safeWrite(STORAGE_KEYS.PRODUCTS, products)
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
