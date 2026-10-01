import { supabase } from './supabase'
import fs from 'fs'
import path from 'path'

// Cache mémoire serveur (RAM) des galeries complètes (id -> liste d'URLs ou base64)
export const galleryMemoryCache = new Map<string, { images: string[]; timestamp: number }>()
export const GALLERY_CACHE_TTL = 1000 * 60 * 60 * 6 // 6 heures

// Cache mémoire serveur (RAM) des buffers décodés (id:index -> { buffer, mimeType, timestamp })
export const imageBufferCache = new Map<string, { buffer: Buffer; mimeType: string; timestamp: number }>()
export const BUFFER_CACHE_TTL = 1000 * 60 * 60 * 24 // 24 heures

// DÉDUPLICATION PAR PRODUIT : une seule requête Supabase en vol par produit pour l'ensemble des vignettes
export const inflightProductQueries = new Map<string, Promise<string[]>>()

export function getMimeTypeFromFilename(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  if (ext === '.webp') return 'image/webp'
  if (ext === '.png') return 'image/png'
  if (ext === '.svg') return 'image/svg+xml'
  if (ext === '.gif') return 'image/gif'
  if (ext === '.avif') return 'image/avif'
  return 'image/jpeg'
}

/**
 * Enregistre une galerie complète en mémoire RAM et pré-décode immédiatement
 * chaque image Base64 ou locale pour que les 10 requêtes simultanées répondent en 0ms.
 */
export function setGalleryInCache(id: string, images: string[]) {
  if (!id || !images || images.length === 0) return

  // 1. Stocker la liste des images
  galleryMemoryCache.set(id, { images, timestamp: Date.now() })

  // Limite de taille pour protéger la mémoire RAM
  if (galleryMemoryCache.size > 500) {
    const oldestKey = galleryMemoryCache.keys().next().value
    if (oldestKey) galleryMemoryCache.delete(oldestKey)
  }

  // 2. Pré-remplir le cache de buffers décodés pour chaque image de la galerie
  images.forEach((raw, idx) => {
    if (!raw || typeof raw !== 'string') return
    const cacheKey = `${id}:${idx}`

    // Si Base64
    if (raw.startsWith('data:')) {
      const parts = raw.split(';base64,')
      if (parts.length === 2) {
        const mimeType = parts[0].replace('data:', '') || 'image/jpeg'
        try {
          const buffer = Buffer.from(parts[1], 'base64')
          imageBufferCache.set(cacheKey, { buffer, mimeType, timestamp: Date.now() })
        } catch {}
      }
    }
    // Si fichier local (/uploads/...)
    else if (raw.startsWith('/')) {
      try {
        const cleanPath = raw.split('?')[0].replace(/^\//, '')
        const localPath = path.join(process.cwd(), 'public', cleanPath)
        if (fs.existsSync(localPath)) {
          const buffer = fs.readFileSync(localPath)
          const mimeType = getMimeTypeFromFilename(localPath)
          imageBufferCache.set(cacheKey, { buffer, mimeType, timestamp: Date.now() })
        }
      } catch {}
    }
  })

  // Nettoyage si le cache buffer dépasse 1500 images en RAM
  if (imageBufferCache.size > 1500) {
    let toDelete = imageBufferCache.size - 1200
    for (const key of imageBufferCache.keys()) {
      if (toDelete <= 0) break
      imageBufferCache.delete(key)
      toDelete--
    }
  }
}

/**
 * Récupère la galerie complète d'un produit depuis le cache RAM ou interroge Supabase
 * UNE SEULE FOIS pour l'ensemble des 10 photos simultanées.
 */
export async function getOrFetchGallery(id: string): Promise<string[]> {
  if (!id) return []

  // 1. Vérifier si la galerie complète est déjà en mémoire RAM
  const cached = galleryMemoryCache.get(id)
  if (cached && Date.now() - cached.timestamp < GALLERY_CACHE_TTL) {
    return cached.images
  }

  // 2. Si une requête est déjà en cours pour ce même produit, attendre la même promesse !
  // (Empêche de lancer 10 requêtes concurrentes vers Supabase)
  if (inflightProductQueries.has(id)) {
    return inflightProductQueries.get(id)!
  }

  // 3. Lancer une seule et unique requête Supabase pour récupérer TOUTES les photos
  const queryPromise = (async (): Promise<string[]> => {
    try {
      const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error('Supabase query timeout') }), 12000)
      )

      const dbPromise = supabase
        .from('products')
        .select('image, images, media')
        .eq('id', id)
        .maybeSingle()

      const res = await Promise.race([dbPromise, timeoutPromise])
      const data = res?.data
      if (!data) return []

      let rawImages: string[] = []
      if (Array.isArray(data.images) && data.images.length > 0) {
        rawImages = data.images.filter(Boolean)
      } else if (typeof data.images === 'string') {
        try {
          const parsed = JSON.parse(data.images)
          if (Array.isArray(parsed)) rawImages = parsed.filter(Boolean)
        } catch {}
      }

      let rawMedia: string[] = []
      if (Array.isArray(data.media) && data.media.length > 0) {
        rawMedia = data.media.map((m: any) => (typeof m === 'string' ? m : m?.url)).filter(Boolean)
      } else if (typeof data.media === 'string') {
        try {
          const parsed = JSON.parse(data.media)
          if (Array.isArray(parsed)) {
            rawMedia = parsed.map((m: any) => (typeof m === 'string' ? m : m?.url)).filter(Boolean)
          }
        } catch {}
      }

      // Sélectionner la liste la plus complète
      const finalList = rawMedia.length >= rawImages.length ? rawMedia : rawImages
      if (finalList.length === 0 && data.image) {
        finalList.push(String(data.image).trim())
      }

      if (finalList.length > 0) {
        setGalleryInCache(id, finalList)
        return finalList
      }

      return []
    } catch (e) {
      console.warn(`[imageCache] Erreur récupération Supabase pour id=${id}:`, e)
      return []
    } finally {
      inflightProductQueries.delete(id)
    }
  })()

  inflightProductQueries.set(id, queryPromise)
  return queryPromise
}
