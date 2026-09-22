// lib/clientCache.ts
// Cache haute performance persistant côté navigateur (IndexedDB + mémoire)
// Permet un affichage INSTANTANÉ (0ms) de tous les produits dès l'actualisation de la page.

import { Product } from './products'

const DB_NAME = 'mercatum_catalog_v5'
const STORE_NAME = 'products'
const KEY = 'catalog_items'
const TIMESTAMP_KEY = 'catalog_timestamp'

// Cache mémoire en RAM pour un accès synchrone ultra-rapide (0ms)
let memoryCache: Product[] | null = null

function openDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null)
  }
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, 1)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

/**
 * Récupère les produits du cache client (RAM d'abord, puis IndexedDB).
 * Répond en < 15ms sans aucun appel réseau.
 */
export async function getClientCachedProducts(): Promise<Product[] | null> {
  if (memoryCache && memoryCache.length > 0) {
    return memoryCache
  }

  if (typeof window === 'undefined') return null

  try {
    const db = await openDB()
    if (!db) return null

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(KEY)

      req.onsuccess = () => {
        const val = req.result as Product[] | undefined
        if (Array.isArray(val) && val.length > 0) {
          memoryCache = val
          resolve(val)
        } else {
          resolve(null)
        }
      }

      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

const SYNC_CACHE_KEY = 'mercatum_sync_catalog'

export function getSyncCachedProducts(): Product[] | null {
  if (typeof window === 'undefined') return null
  if (memoryCache && memoryCache.length > 0) return memoryCache
  try {
    const raw = sessionStorage.getItem(SYNC_CACHE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryCache = parsed
        return parsed
      }
    }
  } catch {}
  return null
}

export function setSyncCachedProducts(products: Product[]): void {
  if (typeof window === 'undefined' || !Array.isArray(products) || products.length === 0) return
  try {
    const json = JSON.stringify(products)
    // Le quota habituel de sessionStorage est de 5 Mo. Si la taille est sous 4 Mo, sauvegarder directement.
    if (json.length < 4000000) {
      sessionStorage.setItem(SYNC_CACHE_KEY, json)
      return
    }
    // Si la taille dépasse 4 Mo (à cause d'images base64 volumineuses), alléger les images volumineuses
    // pour que la liste complète de tous les 660+ produits soit instantanément disponible au rafraîchissement
    const light = products.map((p) => {
      const isHeavy = typeof p.image === 'string' && p.image.length > 5000
      return isHeavy ? { ...p, image: '' } : p
    })
    sessionStorage.setItem(SYNC_CACHE_KEY, JSON.stringify(light))
  } catch {}
}

/**
 * Enregistre les produits dans IndexedDB et en mémoire RAM.
 * Ne souffre pas de la limite de 5 Mo du localStorage (IndexedDB supporte des centaines de Mo).
 */
export async function setClientCachedProducts(products: Product[]): Promise<void> {
  if (!Array.isArray(products) || products.length === 0) return
  memoryCache = products
  setSyncCachedProducts(products)

  if (typeof window === 'undefined') return

  try {
    const db = await openDB()
    if (!db) return

    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.put(products, KEY)
    store.put(Date.now(), TIMESTAMP_KEY)
  } catch (err) {
    console.warn('[clientCache] Erreur écriture IndexedDB:', err)
  }
}

/**
 * Invalide le cache client (par ex. après une action admin).
 */
export function invalidateClientCache(): void {
  memoryCache = null
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(SYNC_CACHE_KEY)
  } catch {}
  openDB().then((db) => {
    if (!db) return
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).delete(KEY)
    } catch {}
  })
}

