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

const STORAGE_KEYS = {
  PRODUCTS: 'ml_admin_products',
  DELETED_PRODUCTS: 'ml_admin_deleted_products',
  NOUVEAUTES: 'ml_admin_nouveautes',
  SETTINGS: 'ml_admin_settings',
  AUTH: 'ml_admin_auth',
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
