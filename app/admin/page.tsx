'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import {
  getProducts,
  saveProduct,
  saveProductsBulk,
  deleteProduct,
  isDefaultProduct,
  resetProductsToDefault,
  getNouveautes,
  saveNouveautes,
  getSiteSettings,
  saveSiteSettings,
  getOrders,
  updateOrderStatus,
  deleteOrder,
  logoutAdmin,
  changeAdminPassword,
  type SiteSettings,
  type NewItem,
  type Order,
} from '@/lib/store'
import {
  fetchOrdersFromDb,
  updateOrderStatusInDb,
  deleteOrderFromDb,
  saveProductToDb,
  saveProductToDbDetailed,
  deleteProductFromDb,
  fetchProductsFromDb,
  fetchNouveautesFromDb,
  saveNouveautesToDb,
  subscribeToProductsChanges,
} from '@/lib/supabaseService'
import {
  type Product,
  type MediaItem,
  type VolumeOption,
  CATEGORIES,
  extractContenance,
  extractVolumes,
  extractColors,
  COMMON_COLORS,
  getColorHex,
  getCleanDescription,
  stripImagesFromDescription,
  isVideoUrl,
} from '@/lib/products'
import RichDescription from '@/components/RichDescription'

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function emptyProduct(): Product {
  return {
    id: '',
    name: '',
    category: 'Haute Cosmétique',
    type: '',
    price: '',
    rawPrice: 0,
    description: '',
    image: '',
    images: [],
    media: [],
    tag: '',
    contenance: '',
    volumes: [],
    colors: [],
    color: '',
    rating: 5.0,
    reviewsCount: 1,
  }
}

export default function AdminPage() {
  const [tab, setTab] = useState<'boutique' | 'nouveautes' | 'parametres' | 'ventes'>('boutique')

  // Orders / Ventes state
  const [orders, setOrders] = useState<Order[]>([])
  const [orderSearch, setOrderSearch] = useState('')
  const [orderStatusFilter, setOrderStatusFilter] = useState('Tous')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  // Products state
  const [products, setProducts] = useState<Product[]>([])
  const [searchProduct, setSearchProduct] = useState('')
  const [filterCategory, setFilterCategory] = useState('Tous les produits')
  const [showForm, setShowForm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [formProduct, setFormProduct] = useState<Product>(emptyProduct())
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showLocalDrafts, setShowLocalDrafts] = useState(false)
  const [localDraftsList, setLocalDraftsList] = useState<any[]>([])
  const [addToNouveautesOnSave, setAddToNouveautesOnSave] = useState(false)
  const [isSavingProduct, setIsSavingProduct] = useState(false)
  const [isCustomCategory, setIsCustomCategory] = useState(false)
  const [newColorInput, setNewColorInput] = useState('')

  // Photos dans la description du produit
  const descFileInputRef = useRef<HTMLInputElement>(null)
  const [descPhotos, setDescPhotos] = useState<{ id: string; url: string; alt: string }[]>([])
  const [descImageUrlInput, setDescImageUrlInput] = useState('')
  const [descImageAltInput, setDescImageAltInput] = useState('')
  const [descUploading, setDescUploading] = useState(false)
  const [showDescPreview, setShowDescPreview] = useState(false)
  const [showDescUrlModal, setShowDescUrlModal] = useState(false)

  // Upload state
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [manualUrl, setManualUrl] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Nouveautés state
  const [nouveautes, setNouveautes] = useState<NewItem[]>([])

  // Settings state (incluant coordonnées bancaires et pixels)
  const [settings, setSettings] = useState<SiteSettings>({
    siteName: 'MERCATUM',
    announcement: '',
    heroTitle: '',
    heroSubtitle: '',
    contactPhone: '',
    contactAddress: '',
    contactEmail: '',
    contactHours: '',
    bankName: '',
    bankAccountHolder: '',
    bankIban: '',
    bankSwift: '',
    bankInstructions: '',
    facebookPixelId: '',
    tiktokPixelId: '',
    googleTagId: '',
    customPixelScript: '',
  })

  // Password state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Notification toast
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  const reloadData = useCallback(async () => {
    const localProducts = getProducts()
    setProducts(localProducts)
    setNouveautes(getNouveautes())
    setSettings(getSiteSettings())
    const localOrders = getOrders()
    setOrders(localOrders)

    // Charger les produits les plus récents depuis Supabase
    try {
      const dbProducts = await fetchProductsFromDb(true)
      if (dbProducts && dbProducts.length > 0) {
        setProducts(dbProducts)
        saveProductsBulk(dbProducts)
      }
    } catch {
      // Garder les produits locaux
    }

    // Charger les nouveautés depuis Supabase Cloud
    try {
      const dbNouv = await fetchNouveautesFromDb()
      if (dbNouv && dbNouv.length > 0) {
        setNouveautes(dbNouv)
        saveNouveautes(dbNouv)
      }
    } catch {
      // Garder les nouveautés locales
    }

    // Tenter de charger les commandes les plus récentes depuis Supabase
    try {
      const dbOrders = await fetchOrdersFromDb()
      if (dbOrders && dbOrders.length > 0) {
        const mergedMap = new Map<string, Order>()
        localOrders.forEach((o) => mergedMap.set(o.id, o))
        dbOrders.forEach((item: any) => {
          mergedMap.set(item.id, {
            id: item.id,
            customerName: item.customerName,
            customerEmail: item.customerEmail,
            customerPhone: item.customerPhone,
            customerAddress: item.customerAddress,
            productId: item.productId,
            productName: item.productName,
            totalPrice: item.totalPrice,
            currency: item.currency || '€',
            paymentMethod: item.paymentMethod || 'Virement bancaire',
            status: item.status,
            createdAt: item.createdAt,
          })
        })
        const finalOrders = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        setOrders(finalOrders)
      }
    } catch {
      // Garder les commandes locales
    }
  }, [])

  useEffect(() => {
    reloadData()
    const unsubscribe = subscribeToProductsChanges(() => {
      reloadData()
    })
    return () => {
      unsubscribe()
    }
  }, [reloadData])

  // --- Actions Commandes (Tableau de Vente) ---
  const handleUpdateOrderStatus = async (id: string, newStatus: Order['status']) => {
    updateOrderStatus(id, newStatus)
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o))
    )
    if (selectedOrder && selectedOrder.id === id) {
      setSelectedOrder({ ...selectedOrder, status: newStatus })
    }
    showToast(`Statut de la commande mis à jour : ${newStatus}`)
    try {
      await updateOrderStatusInDb(id, newStatus)
    } catch (err) {
      console.warn('Erreur synchro Supabase statut commande:', err)
    }
  }

  const handleDeleteOrder = async (id: string) => {
    if (!confirm(`Supprimer définitivement la commande ${id} ?`)) return
    deleteOrder(id)
    setOrders((prev) => prev.filter((o) => o.id !== id))
    if (selectedOrder && selectedOrder.id === id) {
      setSelectedOrder(null)
    }
    showToast(`Commande ${id} supprimée.`)
    try {
      await deleteOrderFromDb(id)
    } catch (err) {
      console.warn('Erreur suppression Supabase:', err)
    }
  }

  // --- Actions Produits ---
  const handleOpenNewProduct = (autoNouveaute = false) => {
    setFormProduct(emptyProduct())
    setDescPhotos([])
    setIsEditing(false)
    setIsCustomCategory(false)
    setAddToNouveautesOnSave(autoNouveaute)
    setShowForm(true)
    setShowUrlInput(false)
    setManualUrl('')
    setUploadError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleEditProduct = (p: Product) => {
    // S'assurer que media et images sont initialisés
    const mediaList: MediaItem[] = p.media && p.media.length > 0
      ? [...p.media]
      : p.images && p.images.length > 0
      ? p.images.map((url) => ({
          url,
          type: isVideoUrl(url) ? 'video' : 'image',
        }))
      : p.image
      ? [{ url: p.image, type: isVideoUrl(p.image) ? 'video' : 'image' }]
      : []

    // Extraire les photos de la description existante
    const existingDescPhotos: { id: string; url: string; alt: string }[] = []
    const imgRegex = /(!\[(.*?)\]\((.*?)\)|<img[^>]*src=["']([^"']+)["'][^>]*alt=["']?([^"'>]*)["']?[^>]*>)/gi
    let imgMatch: RegExpExecArray | null
    const rawDesc = p.description || ''
    while ((imgMatch = imgRegex.exec(rawDesc)) !== null) {
      if (imgMatch[1].startsWith('![')) {
        const u = imgMatch[3]?.trim()
        if (u) {
          existingDescPhotos.push({
            id: `dp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            alt: imgMatch[2]?.trim() || '',
            url: u,
          })
        }
      } else {
        const u = imgMatch[4]?.trim()
        if (u) {
          existingDescPhotos.push({
            id: `dp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            alt: imgMatch[5]?.trim() || '',
            url: u,
          })
        }
      }
    }
    setDescPhotos(existingDescPhotos)

    const detectedContenance = p.contenance || extractContenance(p) || ''
    const detectedVolumes = p.volumes && p.volumes.length > 0 ? p.volumes : extractVolumes(p)
    const detectedColors = p.colors && p.colors.length > 0 ? p.colors : extractColors(p)
    setFormProduct({
      ...p,
      contenance: detectedContenance,
      volumes: detectedVolumes,
      colors: detectedColors,
      color: detectedColors.join(', '),
      description: stripImagesFromDescription(p.description),
      media: mediaList,
      images: mediaList.map((m) => m.url),
    })
    setIsEditing(true)
    setIsCustomCategory(Boolean(p.category && !CATEGORIES.includes(p.category)))
    setAddToNouveautesOnSave(nouveautes.some((n) => n.productId === p.id))
    setShowForm(true)
    setShowUrlInput(false)
    setManualUrl('')
    setUploadError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // --- Gestion du téléversement de photos (Local & Vercel sans serveur requis) ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0) return

    setUploading(true)
    setUploadError(null)

    try {
      const readFileAsDataUrl = (file: File): Promise<MediaItem> => {
        return new Promise((resolve, reject) => {
          const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|avi|m4v|ogg)$/i.test(file.name)
          
          // Pour les images, compresser et redimensionner automatiquement si besoin
          if (!isVideo) {
            const img = new Image()
            const reader = new FileReader()
            reader.onload = (ev) => {
              img.onload = () => {
                const canvas = document.createElement('canvas')
                let width = img.width
                let height = img.height
                const maxDimension = 800

                if (width > maxDimension || height > maxDimension) {
                  if (width > height) {
                    height = Math.round((height * maxDimension) / width)
                    width = maxDimension
                  } else {
                    width = Math.round((width * maxDimension) / height)
                    height = maxDimension
                  }
                }

                canvas.width = width
                canvas.height = height
                const ctx = canvas.getContext('2d')
                if (ctx) {
                  ctx.imageSmoothingEnabled = true
                  ctx.imageSmoothingQuality = 'high'
                  ctx.drawImage(img, 0, 0, width, height)
                  // Compression ultra-légère : WebP 0.75 (ou repli JPEG 0.72) pour diviser le poids par 5 sans perte de netteté
                  let compressedUrl = canvas.toDataURL('image/webp', 0.75)
                  if (!compressedUrl.startsWith('data:image/webp')) {
                    compressedUrl = canvas.toDataURL('image/jpeg', 0.72)
                  }
                  resolve({ url: compressedUrl, type: 'image' })
                  return
                }
                resolve({ url: ev.target?.result as string, type: 'image' })
              }
              img.onerror = () => {
                resolve({ url: ev.target?.result as string, type: 'image' })
              }
              img.src = ev.target?.result as string
            }
            reader.onerror = (error) => reject(error)
            reader.readAsDataURL(file)
          } else {
            // Vidéos
            const reader = new FileReader()
            reader.onload = () => {
              resolve({ url: reader.result as string, type: 'video' })
            }
            reader.onerror = (error) => reject(error)
            reader.readAsDataURL(file)
          }
        })
      }

      const filesArray = Array.from(fileList)
      const newMedia: MediaItem[] = await Promise.all(filesArray.map(readFileAsDataUrl))

      if (newMedia.length > 0) {
        const currentMedia = formProduct.media || []
        const updatedMedia = [...currentMedia, ...newMedia]
        const updatedImages = updatedMedia.map((m) => m.url)
        const currentMainImage = formProduct.image
        const finalMainImage =
          currentMainImage && currentMainImage !== '/placeholder.svg'
            ? currentMainImage
            : updatedMedia[0]?.url || ''

        setFormProduct({
          ...formProduct,
          media: updatedMedia,
          images: updatedImages,
          image: finalMainImage,
        })

        showToast(`${newMedia.length} photo(s) ajoutée(s) au carrousel !`)
      }
    } catch (err: any) {
      console.error('Erreur lecture photo:', err)
      setUploadError("Impossible de charger la photo. Essayez avec un fichier image standard (JPG, PNG, WebP).")
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleAddManualUrl = () => {
    if (!manualUrl.trim()) return
    const url = manualUrl.trim()
    const isVideo = isVideoUrl(url)
    const newMediaItem: MediaItem = { url, type: isVideo ? 'video' : 'image' }

    const currentMedia = formProduct.media || []
    const updatedMedia = [...currentMedia, newMediaItem]
    const updatedImages = updatedMedia.map((m) => m.url)
    const finalMainImage = formProduct.image || url

    setFormProduct({
      ...formProduct,
      media: updatedMedia,
      images: updatedImages,
      image: finalMainImage,
    })
    setManualUrl('')
    showToast('Média ajouté par URL !')
  }

  const handleSetCover = (url: string) => {
    setFormProduct({ ...formProduct, image: url })
    showToast('Image de couverture définie !')
  }

  const handleRemoveMedia = (index: number) => {
    const currentMedia = formProduct.media || []
    const removedItem = currentMedia[index]
    const updatedMedia = currentMedia.filter((_, i) => i !== index)
    const updatedImages = updatedMedia.map((m) => m.url)
    const isRemovingCover = formProduct.image === removedItem?.url
    const finalMainImage = isRemovingCover
      ? updatedMedia[0]?.url || ''
      : formProduct.image

    setFormProduct({
      ...formProduct,
      media: updatedMedia,
      images: updatedImages,
      image: finalMainImage,
    })
    showToast('Média retiré du carrousel')
  }

  const handleMoveMedia = (index: number, direction: 'left' | 'right') => {
    const currentMedia = [...(formProduct.media || [])]
    const targetIndex = direction === 'left' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= currentMedia.length) return
    const [moved] = currentMedia.splice(index, 1)
    currentMedia.splice(targetIndex, 0, moved)

    setFormProduct({
      ...formProduct,
      media: currentMedia,
      images: currentMedia.map((m) => m.url),
    })
  }

  // --- Gestion des Tarifs par Contenance multiples ---
  const handleAddVolumeRow = () => {
    const current = formProduct.volumes || []
    const nextSuggestion =
      current.length === 0 ? '30 ml' : current.length === 1 ? '50 ml' : '100 ml'
    const newVolumes: VolumeOption[] = [
      ...current,
      {
        volume: nextSuggestion,
        rawPrice: formProduct.rawPrice || 0,
        price: formProduct.price || '0,00 €',
      },
    ]
    setFormProduct({ ...formProduct, volumes: newVolumes })
  }

  const handleUpdateVolumeRow = (
    index: number,
    field: 'volume' | 'rawPrice',
    value: string
  ) => {
    const current = [...(formProduct.volumes || [])]
    if (!current[index]) return

    if (field === 'volume') {
      current[index] = { ...current[index], volume: value }
    } else {
      const num = parseFloat(value) || 0
      current[index] = {
        ...current[index],
        rawPrice: num,
        price: `${num.toFixed(2).replace('.', ',')} €`,
      }
    }
    setFormProduct({ ...formProduct, volumes: current })
  }

  const handleRemoveVolumeRow = (index: number) => {
    const current = [...(formProduct.volumes || [])]
    current.splice(index, 1)
    setFormProduct({ ...formProduct, volumes: current })
  }

  // --- Gestion des Couleurs / Déclinaisons de teintes ---
  const handleAddColor = (colorName: string) => {
    const trimmed = colorName.trim()
    if (!trimmed) return
    const current = formProduct.colors || []
    if (current.some((c) => c.toLowerCase() === trimmed.toLowerCase())) return
    setFormProduct({ ...formProduct, colors: [...current, trimmed] })
    setNewColorInput('')
  }

  const handleToggleColor = (colorName: string) => {
    const trimmed = colorName.trim()
    if (!trimmed) return
    const current = formProduct.colors || []
    const exists = current.some((c) => c.toLowerCase() === trimmed.toLowerCase())
    if (exists) {
      setFormProduct({
        ...formProduct,
        colors: current.filter((c) => c.toLowerCase() !== trimmed.toLowerCase()),
      })
    } else {
      setFormProduct({ ...formProduct, colors: [...current, trimmed] })
    }
  }

  const handleRemoveColor = (index: number) => {
    const current = [...(formProduct.colors || [])]
    current.splice(index, 1)
    setFormProduct({ ...formProduct, colors: current })
  }

  // --- Gestion des Photos & Médias dans la Description du Produit ---
  const handleDescFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setDescUploading(true)
    try {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height
          const maxDimension = 900

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width)
              width = maxDimension
            } else {
              width = Math.round((width * maxDimension) / height)
              height = maxDimension
            }
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          let compressedUrl = ''
          if (ctx) {
            ctx.imageSmoothingEnabled = true
            ctx.imageSmoothingQuality = 'high'
            ctx.drawImage(img, 0, 0, width, height)
            compressedUrl = canvas.toDataURL('image/webp', 0.8)
            if (!compressedUrl.startsWith('data:image/webp')) {
              compressedUrl = canvas.toDataURL('image/jpeg', 0.75)
            }
          } else {
            compressedUrl = ev.target?.result as string
          }

          const altText = descImageAltInput.trim() || 'Illustration produit'
          const newPhoto = {
            id: `dp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            url: compressedUrl,
            alt: altText,
          }
          setDescPhotos((prev) => [...prev, newPhoto])
          setDescImageAltInput('')
          showToast('Photo ajoutée ! Elle est visible ci-dessous.')
          setDescUploading(false)
        }
        img.onerror = () => {
          const altText = descImageAltInput.trim() || 'Illustration produit'
          const newPhoto = {
            id: `dp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            url: ev.target?.result as string,
            alt: altText,
          }
          setDescPhotos((prev) => [...prev, newPhoto])
          setDescImageAltInput('')
          showToast('Photo ajoutée ! Elle est visible ci-dessous.')
          setDescUploading(false)
        }
        img.src = ev.target?.result as string
      }
      reader.readAsDataURL(file)
    } catch (err) {
      console.error('Erreur chargement photo description:', err)
      showToast('Impossible de charger la photo pour la description')
      setDescUploading(false)
    } finally {
      if (descFileInputRef.current) descFileInputRef.current.value = ''
    }
  }

  const handleAddDescImageUrl = () => {
    if (!descImageUrlInput.trim()) return
    const altText = descImageAltInput.trim() || 'Illustration produit'
    const newPhoto = {
      id: `dp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      url: descImageUrlInput.trim(),
      alt: altText,
    }
    setDescPhotos((prev) => [...prev, newPhoto])
    setDescImageUrlInput('')
    setDescImageAltInput('')
    setShowDescUrlModal(false)
    showToast('Photo ajoutée ! Elle est visible ci-dessous.')
  }

  const handleInsertGalleryImageIntoDesc = (imgUrl: string) => {
    const newPhoto = {
      id: `dp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      url: imgUrl,
      alt: 'Photo produit',
    }
    setDescPhotos((prev) => [...prev, newPhoto])
    showToast('Photo ajoutée ! Elle est visible ci-dessous.')
  }

  const handleRemoveDescPhoto = (id: string) => {
    setDescPhotos((prev) => prev.filter((p) => p.id !== id))
    showToast('Photo retirée de la description')
  }

  const handleUpdateDescPhotoAlt = (id: string, newAlt: string) => {
    setDescPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, alt: newAlt } : p))
    )
  }

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formProduct.name.trim()) {
      alert('Veuillez entrer le nom du produit.')
      return
    }

    setIsSavingProduct(true)

    const rawNum = parseFloat(String(formProduct.rawPrice)) || 0
    const priceFormatted = formProduct.price.trim() || `${rawNum.toFixed(2).replace('.', ',')} €`
    const generatedId = formProduct.id.trim() || slugify(formProduct.name) || `prod-${Date.now()}`

    const mediaList = formProduct.media || []
    const filteredImages = mediaList
      .filter((m) => m.type !== 'video' && !isVideoUrl(typeof m === 'string' ? m : m?.url))
      .map((m) => (typeof m === 'string' ? m : m.url))
      .filter((url) => !url.startsWith('data:video'))

    const imagesList = filteredImages.length > 0
      ? filteredImages
      : formProduct.image && !formProduct.image.startsWith('data:video') ? [formProduct.image] : []

    const firstValidImage = filteredImages[0] || (formProduct.image && !formProduct.image.startsWith('data:video') ? formProduct.image.trim() : '')
    const primaryImage =
      firstValidImage ||
      'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=900&q=85'

    const userContenance = formProduct.contenance?.trim() || ''
    const cleanDesc = stripImagesFromDescription(getCleanDescription(formProduct.description))
    let finalDesc = cleanDesc

    if (descPhotos.length > 0) {
      for (const dp of descPhotos) {
        if (dp.url) {
          finalDesc += `\n\n![${dp.alt || 'Illustration produit'}](${dp.url})`
        }
      }
    }

    if (userContenance) {
      finalDesc += `\n\n[Contenance: ${userContenance}]`
    }

    const validVolumes = (formProduct.volumes || []).filter(
      (v) => v.volume && v.volume.trim() && v.rawPrice > 0
    )

    if (validVolumes.length > 0) {
      finalDesc += `\n\n<!--VOLUMES_JSON_START-->${JSON.stringify(validVolumes)}<!--VOLUMES_JSON_END-->`
      finalDesc += `\n\n[VolumesJSON: ${JSON.stringify(validVolumes)}]`
    }

    const validColors = (formProduct.colors || []).map((c) => c.trim()).filter(Boolean)
    if (validColors.length > 0) {
      finalDesc += `\n\n<!--COLORS_JSON_START-->${JSON.stringify(validColors)}<!--COLORS_JSON_END-->`
      finalDesc += `\n\n[Couleurs: ${validColors.join(', ')}]`
    }

    const effectiveCont =
      userContenance ||
      (validVolumes.length > 0 ? validVolumes.map((v) => v.volume).join(', ') : '') ||
      extractContenance({
        name: formProduct.name,
        description: cleanDesc,
        type: formProduct.type,
      })

    const effectiveRawPrice =
      rawNum > 0 ? rawNum : validVolumes.length > 0 ? validVolumes[0].rawPrice : 0
    const effectivePriceFormatted =
      rawNum > 0
        ? priceFormatted
        : validVolumes.length > 0
        ? validVolumes[0].price
        : priceFormatted

    const productToSave: Product = {
      ...formProduct,
      id: generatedId,
      contenance: effectiveCont,
      volumes: validVolumes,
      colors: validColors,
      color: validColors.join(', '),
      description: finalDesc,
      price: effectivePriceFormatted,
      rawPrice: effectiveRawPrice,
      rating: parseFloat(String(formProduct.rating)) || 5.0,
      reviewsCount: parseInt(String(formProduct.reviewsCount), 10) || 0,
      image: primaryImage,
      images: imagesList,
      media: mediaList,
    }

    // 1. Sauvegarde locale immédiate
    saveProduct(productToSave)

    // 2. Synchronisation Supabase Cloud via passerelle API sécurisée
    let cloudSynced = false
    let cloudErrorMsg = ''
    try {
      const syncResult = await saveProductToDbDetailed(productToSave)
      cloudSynced = syncResult.success
      if (!syncResult.success) {
        cloudErrorMsg = syncResult.error || 'Erreur inconnue'
      }
    } catch (err: any) {
      console.warn('Erreur synchro Supabase produit:', err)
      cloudErrorMsg = err?.message || 'Erreur réseau'
    }

    // Gestion synchronisée de la case Nouveautés
    let updatedNouvList: NewItem[] = [...nouveautes]
    if (addToNouveautesOnSave) {
      const exists = updatedNouvList.some((n) => n.productId === productToSave.id)
      if (!exists) {
        updatedNouvList = [
          ...updatedNouvList,
          { productId: productToSave.id, customLabel: productToSave.tag || productToSave.type || 'Nouveauté' },
        ]
        setNouveautes(updatedNouvList)
        saveNouveautes(updatedNouvList)
        saveNouveautesToDb(updatedNouvList).catch((err) => console.warn('Erreur saveNouveautesToDb:', err))
      }
    } else if (isEditing) {
      // Si l'utilisateur a décoché Nouveautés pour ce produit
      if (updatedNouvList.some((n) => n.productId === productToSave.id)) {
        updatedNouvList = updatedNouvList.filter((n) => n.productId !== productToSave.id)
        setNouveautes(updatedNouvList)
        saveNouveautes(updatedNouvList)
        saveNouveautesToDb(updatedNouvList).catch((err) => console.warn('Erreur saveNouveautesToDb:', err))
      }
    }

    setIsSavingProduct(false)
    reloadData()
    setShowForm(false)

    if (cloudSynced) {
      showToast(
        isEditing
          ? `🟢 Produit « ${productToSave.name} » modifié et synchronisé sur Supabase Cloud !`
          : `🟢 Produit « ${productToSave.name} » ajouté et synchronisé sur Supabase Cloud !`
      )
    } else {
      showToast(
        `⚠️ Enregistré en local. Échec Supabase Cloud : ${cloudErrorMsg || 'Vérifiez la connexion'}`
      )
    }
  }

  const handleDeleteProduct = async (id: string) => {
    deleteProduct(id)
    try {
      const ok = await deleteProductFromDb(id)
      if (ok) {
        showToast('🟢 Produit supprimé du catalogue et de Supabase Cloud')
      } else {
        showToast('⚠️ Produit supprimé localement (erreur Supabase Cloud)')
      }
    } catch (err) {
      console.warn('Erreur suppression Supabase produit:', err)
      showToast('Produit supprimé du catalogue local')
    }
    const updatedNouveautes = nouveautes.filter((n) => n.productId !== id)
    setNouveautes(updatedNouveautes)
    saveNouveautes(updatedNouveautes)
    try {
      await saveNouveautesToDb(updatedNouveautes)
    } catch (err) {
      console.warn('Erreur suppression nouveauté Supabase:', err)
    }
    setDeleteId(null)
    reloadData()
  }

  const handleResetCatalog = () => {
    resetProductsToDefault()
    setShowResetConfirm(false)
    reloadData()
    showToast('Catalogue réinitialisé avec les produits par défaut')
  }

  const handleInspectLocalDrafts = () => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem('ml_admin_products')
      const parsed = raw ? JSON.parse(raw) : []
      setLocalDraftsList(Array.isArray(parsed) ? parsed : [])
      setShowLocalDrafts(!showLocalDrafts)
    } catch {
      setLocalDraftsList([])
      setShowLocalDrafts(!showLocalDrafts)
    }
  }

  const handleClearLocalDrafts = () => {
    if (typeof window === 'undefined') return
    if (window.confirm('Voulez-vous vider tous les brouillons temporaires locaux stockés dans votre navigateur ?')) {
      try {
        localStorage.removeItem('ml_admin_products')
        localStorage.removeItem('ml_admin_deleted_products')
        setLocalDraftsList([])
        setShowLocalDrafts(false)
        reloadData()
        showToast('🟢 Brouillons locaux vidés avec succès !')
      } catch (err) {
        console.warn('Erreur clear local storage:', err)
      }
    }
  }

  // --- Actions Nouveautés ---
  const handleToggleNouveaute = async (productId: string) => {
    const exists = nouveautes.some((n) => n.productId === productId)
    let updated: NewItem[]
    if (exists) {
      updated = nouveautes.filter((n) => n.productId !== productId)
    } else {
      const prod = products.find((p) => p.id === productId)
      updated = [...nouveautes, { productId, customLabel: prod?.type || 'Nouveauté exclusive' }]
    }
    setNouveautes(updated)
    saveNouveautes(updated)
    try {
      const ok = await saveNouveautesToDb(updated)
      if (ok) {
        showToast('🟢 Nouveautés synchronisées sur le site en direct !')
      } else {
        showToast('Nouveautés enregistrées localement')
      }
    } catch {
      showToast('Nouveautés enregistrées localement')
    }
  }

  const handleMoveNouveaute = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= nouveautes.length) return
    const updated = [...nouveautes]
    const [moved] = updated.splice(index, 1)
    updated.splice(targetIndex, 0, moved)
    setNouveautes(updated)
    saveNouveautes(updated)
    try {
      await saveNouveautesToDb(updated)
      showToast('Ordre des nouveautés synchronisé')
    } catch (err) {
      console.warn('Erreur ordre nouveautes Supabase:', err)
    }
  }

  const handleUpdateNouveauteLabel = async (productId: string, label: string) => {
    const updated = nouveautes.map((n) => (n.productId === productId ? { ...n, customLabel: label } : n))
    setNouveautes(updated)
    saveNouveautes(updated)
    try {
      await saveNouveautesToDb(updated)
    } catch (err) {
      console.warn('Erreur label nouveautes Supabase:', err)
    }
  }

  // --- Actions Paramètres ---
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault()
    saveSiteSettings(settings)
    showToast('Paramètres, coordonnées bancaires et pixels enregistrés avec succès !')
  }

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 4) {
      setPasswordFeedback({ type: 'error', text: 'Le mot de passe doit comporter au moins 4 caractères.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', text: 'Les deux mots de passe ne correspondent pas.' })
      return
    }
    changeAdminPassword(newPassword)
    setPasswordFeedback({ type: 'success', text: 'Mot de passe modifié avec succès !' })
    setNewPassword('')
    setConfirmPassword('')
    setTimeout(() => setPasswordFeedback(null), 4000)
  }

  const handleLogout = () => {
    logoutAdmin()
    window.location.reload()
  }

  // Filtrage des produits pour la vue boutique
  const filteredProducts = products.filter((p) => {
    const matchesCategory = filterCategory === 'Tous les produits' || p.category === filterCategory
    const matchesSearch =
      p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
      p.description.toLowerCase().includes(searchProduct.toLowerCase()) ||
      p.type.toLowerCase().includes(searchProduct.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const customCategories = Array.from(new Set(products.map((p) => p.category).filter(Boolean)))
  const allCategories = Array.from(new Set([...CATEGORIES, ...customCategories]))
  const availableCategories = allCategories.filter((c) => c !== 'Tous les produits')

  return (
    <div className="min-h-screen bg-[#f3f0e8] text-[#1c221d] flex flex-col font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1c221d] text-[#f4f0e9] px-5 py-3.5 rounded-lg shadow-2xl flex items-center gap-3 border border-[#b8c8a6]/40 text-sm font-medium animate-fade-in">
          <span className="text-[#b8c8a6] text-base">✓</span>
          <span>{toast}</span>
        </div>
      )}

      {/* Header Admin */}
      <header className="bg-[#1c221d] text-[#f4f0e9] sticky top-0 z-40 px-6 py-4 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-decoration-none group">
            <span className="text-xl">✨</span>
            <div>
              <span className="font-serif text-lg tracking-wider font-semibold text-[#f4f0e9] group-hover:text-[#b8c8a6] transition">
                {settings.siteName || 'MERCATUM'}
              </span>
              <span className="ml-2 text-xs bg-[#b8c8a6] text-[#1c221d] font-bold uppercase px-2 py-0.5 rounded tracking-wider">
                Admin
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            target="_blank"
            className="text-xs text-[#b8c8a6] hover:text-[#f4f0e9] border border-[#b8c8a6]/40 px-3 py-1.5 rounded transition flex items-center gap-1"
          >
            Voir l'Accueil ↗
          </Link>
          <Link
            href="/boutique"
            target="_blank"
            className="text-xs text-[#b8c8a6] hover:text-[#f4f0e9] border border-[#b8c8a6]/40 px-3 py-1.5 rounded transition flex items-center gap-1"
          >
            Voir la Boutique ↗
          </Link>
          <button
            onClick={handleLogout}
            className="text-xs bg-red-900/40 text-red-200 hover:bg-red-800 hover:text-white border border-red-700/50 px-3 py-1.5 rounded transition"
          >
            Se déconnecter
          </button>
        </div>
      </header>

      {/* Navigation Onglets */}
      <nav className="bg-[#242b25] border-b border-[#363f37] px-6 py-2">
        <div className="max-w-6xl mx-auto flex gap-2">
          <button
            onClick={() => setTab('boutique')}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold tracking-wide uppercase transition flex items-center gap-2 ${
              tab === 'boutique'
                ? 'bg-[#b8c8a6] text-[#1c221d] shadow-sm'
                : 'text-[#c6d2bd] hover:text-white hover:bg-[#2f3830]'
            }`}
          >
            <span>🛍️</span>
            <span>Boutique ({products.length})</span>
          </button>

          <button
            onClick={() => setTab('ventes')}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold tracking-wide uppercase transition flex items-center gap-2 relative ${
              tab === 'ventes'
                ? 'bg-[#b8c8a6] text-[#1c221d] shadow-sm'
                : 'text-[#c6d2bd] hover:text-white hover:bg-[#2f3830]'
            }`}
          >
            <span>📈</span>
            <span>Tableau de Vente ({orders.length})</span>
            {orders.filter((o) => o.status === 'En attente de virement').length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-amber-500 text-stone-950 font-black rounded-full animate-pulse">
                {orders.filter((o) => o.status === 'En attente de virement').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setTab('nouveautes')}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold tracking-wide uppercase transition flex items-center gap-2 ${
              tab === 'nouveautes'
                ? 'bg-[#b8c8a6] text-[#1c221d] shadow-sm'
                : 'text-[#c6d2bd] hover:text-white hover:bg-[#2f3830]'
            }`}
          >
            <span>✨</span>
            <span>Nouveautés ({nouveautes.length})</span>
          </button>

          <button
            onClick={() => setTab('parametres')}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold tracking-wide uppercase transition flex items-center gap-2 ${
              tab === 'parametres'
                ? 'bg-[#b8c8a6] text-[#1c221d] shadow-sm'
                : 'text-[#c6d2bd] hover:text-white hover:bg-[#2f3830]'
            }`}
          >
            <span>⚙️</span>
            <span>Paramètres, Banque & Pixels</span>
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto p-6 flex-1">
        {/* ================================================================= */}
        {/* FORMULAIRE UNIQUE D'AJOUT / ÉDITION AVEC TÉLÉVERSEMENT CARROUSEL  */}
        {/* ================================================================= */}
        {showForm && (
          <div className="bg-white p-6 rounded-xl border-2 border-[#b8c8a6] shadow-xl mb-8 animate-fade-in">
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-stone-200">
              <div>
                <h2 className="font-serif text-xl font-bold text-[#1c221d]">
                  {isEditing ? `Modifier « ${formProduct.name} »` : 'Ajouter un nouveau produit'}
                </h2>
                {addToNouveautesOnSave && (
                  <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded font-semibold mt-1 inline-block">
                    ✨ Ce produit sera automatiquement ajouté aux Nouveautés
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="text-stone-400 hover:text-stone-700 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                    Nom du produit *
                  </label>
                  <input
                    type="text"
                    required
                    value={formProduct.name}
                    onChange={(e) => setFormProduct({ ...formProduct, name: e.target.value })}
                    placeholder="ex: Sérum Éclat Suprême 30ml"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-[#b8c8a6] outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
                      Catégorie *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomCategory(!isCustomCategory)}
                      className="text-[11px] text-[#556943] hover:underline font-semibold"
                    >
                      {isCustomCategory ? 'Choisir dans la liste' : '+ Nouvelle catégorie'}
                    </button>
                  </div>
                  {isCustomCategory ? (
                    <input
                      type="text"
                      required
                      value={formProduct.category}
                      onChange={(e) => setFormProduct({ ...formProduct, category: e.target.value })}
                      placeholder="ex: Maison & Décoration, Accessoires..."
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-[#b8c8a6] outline-none bg-white"
                    />
                  ) : (
                    <select
                      value={formProduct.category}
                      onChange={(e) => {
                        if (e.target.value === '__custom__') {
                          setIsCustomCategory(true)
                          setFormProduct({ ...formProduct, category: '' })
                        } else {
                          setFormProduct({ ...formProduct, category: e.target.value })
                        }
                      }}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-[#b8c8a6] outline-none bg-white"
                    >
                      {availableCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                      <option value="__custom__">+ Autre catégorie personnalisée...</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                    Sous-titre / Type de soin
                  </label>
                  <input
                    type="text"
                    value={formProduct.type}
                    onChange={(e) => setFormProduct({ ...formProduct, type: e.target.value })}
                    placeholder="ex: Soin liftant d'exception aux peptides purs"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-[#b8c8a6] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                    Prix en euros (numérique) *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formProduct.rawPrice || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0
                        setFormProduct({
                          ...formProduct,
                          rawPrice: val,
                          price: `${val.toFixed(2).replace('.', ',')} €`,
                        })
                      }}
                      placeholder="ex: 185.00"
                      className="w-1/2 px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-[#b8c8a6] outline-none"
                    />
                    <input
                      type="text"
                      value={formProduct.price}
                      onChange={(e) => setFormProduct({ ...formProduct, price: e.target.value })}
                      placeholder="Format affiché: 185,00 €"
                      className="w-1/2 px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-[#b8c8a6] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                    Badge / Tag promotionnel (facultatif)
                  </label>
                  <input
                    type="text"
                    value={formProduct.tag || ''}
                    onChange={(e) => setFormProduct({ ...formProduct, tag: e.target.value })}
                    placeholder="ex: N°1 des Ventes, Nouveau, Coup de Cœur"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-[#b8c8a6] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                    Contenance / Format (ex: 50 ml, 100 ml, Coffret)
                  </label>
                  <input
                    type="text"
                    value={formProduct.contenance || ''}
                    onChange={(e) => setFormProduct({ ...formProduct, contenance: e.target.value })}
                    placeholder="Auto-détecté si vide (ex: 50 ml, 100 ml)"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-[#b8c8a6] outline-none"
                  />
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Laisser vide pour détecter automatiquement depuis le titre ou la description.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                    Note & Nombre d'Avis
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="5"
                      value={formProduct.rating}
                      onChange={(e) => setFormProduct({ ...formProduct, rating: parseFloat(e.target.value) || 5 })}
                      placeholder="Note (ex: 4.9)"
                      className="w-1/2 px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-[#b8c8a6] outline-none"
                    />
                    <input
                      type="number"
                      value={formProduct.reviewsCount}
                      onChange={(e) =>
                        setFormProduct({ ...formProduct, reviewsCount: parseInt(e.target.value, 10) || 0 })
                      }
                      placeholder="Nb avis (ex: 120)"
                      className="w-1/2 px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-[#b8c8a6] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION TARIFS PAR CONTENANCE / DÉCLINAISONS MULTIPLES */}
              <div className="bg-[#faf8f3] border border-[#d8d3c5] rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
                      <span>💧 Tarifs par Contenance / Format (30 ml, 50 ml, 100 ml...)</span>
                    </label>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Ajoutez les différentes tailles disponibles et le prix correspondant à chaque taille. Sur le site, le prix changera automatiquement selon la taille choisie par le client !
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddVolumeRow}
                    className="px-3 py-1.5 text-xs font-bold bg-[#1c221d] text-[#f4f0e9] rounded-lg hover:bg-[#2e3730] transition flex items-center gap-1 w-fit shadow-sm"
                  >
                    <span>+</span> Ajouter une contenance & son prix
                  </button>
                </div>

                {formProduct.volumes && formProduct.volumes.length > 0 ? (
                  <div className="space-y-2 pt-1">
                    {formProduct.volumes.map((volItem, vIdx) => (
                      <div
                        key={vIdx}
                        className="flex items-center gap-3 bg-white p-3 rounded-lg border border-stone-200 shadow-sm"
                      >
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-0.5">
                            Contenance / Taille
                          </label>
                          <input
                            type="text"
                            value={volItem.volume}
                            onChange={(e) => handleUpdateVolumeRow(vIdx, 'volume', e.target.value)}
                            placeholder="ex: 30 ml, 50 ml, 100 ml"
                            className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#b8c8a6] outline-none"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-0.5">
                            Prix en euros (€)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={volItem.rawPrice || ''}
                            onChange={(e) => handleUpdateVolumeRow(vIdx, 'rawPrice', e.target.value)}
                            placeholder="ex: 180.00"
                            className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-sm font-bold text-[#1c221d] focus:ring-2 focus:ring-[#b8c8a6] outline-none"
                          />
                        </div>
                        <div className="pt-4">
                          <button
                            type="button"
                            onClick={() => handleRemoveVolumeRow(vIdx)}
                            className="w-8 h-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 flex items-center justify-center text-sm font-bold transition"
                            title="Supprimer ce format"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-1 px-1 text-xs bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-emerald-900 font-medium">
                      <span className="flex items-center gap-1.5">
                        <span className="text-emerald-600 font-bold text-sm">✓</span>
                        <span>
                          Ces tarifs sont <strong>mémorisés en direct</strong>. Pour finaliser et mettre en ligne, cliquez sur <strong>« Enregistrer »</strong> tout en bas du formulaire.
                        </span>
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-white/70 border border-dashed border-stone-300 rounded-lg text-center">
                    <p className="text-xs text-stone-500">
                      Aucune déclinaison spécifique ajoutée. Le produit utilise son prix unique standard (
                      <strong>{formProduct.price || '0,00 €'}</strong>).
                    </p>
                    <button
                      type="button"
                      onClick={handleAddVolumeRow}
                      className="mt-2 text-xs text-[#576b46] font-bold hover:underline"
                    >
                      + Proposer plusieurs tailles (ex: 30 ml, 50 ml, 100 ml)
                    </button>
                  </div>
                )}
              </div>

              {/* SECTION COULEURS & NUANCES DU PRODUIT */}
              <div className="bg-[#faf8f3] border border-[#d8d3c5] rounded-xl p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
                      <span>🎨 Couleurs & Nuances disponibles</span>
                    </label>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Définissez les coloris, teintes ou finitions disponibles (ex: Noir, Blanc, Doré, Nude...). Le client pourra sélectionner sa nuance directement sur la fiche produit.
                    </p>
                  </div>
                  {formProduct.colors && formProduct.colors.length > 0 && (
                    <span className="text-xs font-bold text-[#1c221d] bg-[#b8c8a6]/60 px-3 py-1 rounded-full w-fit">
                      {formProduct.colors.length} couleur(s) définie(s)
                    </span>
                  )}
                </div>

                {/* Couleurs actuellement sélectionnées */}
                {formProduct.colors && formProduct.colors.length > 0 ? (
                  <div className="flex flex-wrap gap-2 p-3 bg-white rounded-lg border border-stone-200 shadow-sm">
                    {formProduct.colors.map((colorName, cIdx) => {
                      const hex = getColorHex(colorName)
                      return (
                        <div
                          key={cIdx}
                          className="inline-flex items-center gap-2 pl-2 pr-1.5 py-1 bg-stone-50 border border-stone-300 rounded-full text-xs font-semibold text-stone-800 shadow-sm"
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-inner flex-shrink-0"
                            style={{ backgroundColor: hex }}
                          />
                          <span>{colorName}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveColor(cIdx)}
                            className="w-4 h-4 rounded-full bg-stone-200 hover:bg-red-100 hover:text-red-700 text-stone-600 flex items-center justify-center text-[10px] font-bold transition ml-0.5"
                            title={`Supprimer la couleur ${colorName}`}
                          >
                            ✕
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="p-3 bg-white/70 border border-dashed border-stone-300 rounded-lg text-center">
                    <p className="text-xs text-stone-500">
                      Aucune couleur spécifique configurée (produit sans déclinaison de teinte).
                    </p>
                  </div>
                )}

                {/* Palette de couleurs courantes (Ajout rapide en 1 clic) */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold text-stone-600 uppercase tracking-wider block">
                    Nuancier rapide (cliquez pour ajouter / retirer) :
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_COLORS.map((c) => {
                      const isSelected = (formProduct.colors || []).some(
                        (col) => col.toLowerCase() === c.name.toLowerCase()
                      )
                      return (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => handleToggleColor(c.name)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition ${
                            isSelected
                              ? 'bg-[#1c221d] text-white border-[#1c221d] shadow-sm'
                              : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400 hover:bg-stone-50'
                          }`}
                        >
                          <span
                            className="w-3 h-3 rounded-full border border-black/20 flex-shrink-0"
                            style={{ backgroundColor: c.hex }}
                          />
                          <span>{c.name}</span>
                          {isSelected && <span className="text-[10px] text-[#b8c8a6] font-bold">✓</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Saisie d'une couleur personnalisée */}
                <div className="pt-2 border-t border-stone-200 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={newColorInput}
                      onChange={(e) => setNewColorInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddColor(newColorInput)
                        }
                      }}
                      placeholder="Ajouter une teinte personnalisée (ex: Bordeaux Velours, Nude 02, Ivoire...)"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs bg-white text-stone-800 placeholder:text-stone-400 focus:ring-2 focus:ring-[#b8c8a6] outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddColor(newColorInput)}
                    disabled={!newColorInput.trim()}
                    className="px-4 py-2 text-xs font-bold bg-[#1c221d] text-[#f4f0e9] rounded-lg hover:bg-[#2e3730] disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm whitespace-nowrap"
                  >
                    + Ajouter cette couleur
                  </button>
                </div>
              </div>

              {/* SECTION TÉLÉVERSEMENT FICHIERS (IMAGES & VIDÉOS / CARROUSEL) */}
              <div className="bg-[#fbf9f4] border-2 border-dashed border-[#c5beae] rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-2">
                      <span>📸 Photos & Vidéos du produit (Carrousel interactif)</span>
                    </label>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Sélectionnez une ou plusieurs photos et vidéos directement depuis votre ordinateur ou téléphone.
                    </p>
                  </div>
                  {formProduct.media && formProduct.media.length > 0 && (
                    <span className="text-xs font-bold text-[#1c221d] bg-[#b8c8a6]/60 px-3 py-1 rounded-full w-fit">
                      {formProduct.media.length} élément(s) dans le carrousel
                    </span>
                  )}
                </div>

                {/* Bouton de sélection de fichiers */}
                <div className="flex flex-wrap items-center gap-3">
                  <label
                    className={`cursor-pointer inline-flex items-center gap-2 px-5 py-3 rounded-lg font-bold text-xs uppercase tracking-wider shadow transition ${
                      uploading
                        ? 'bg-stone-300 text-stone-600 cursor-not-allowed'
                        : 'bg-[#1c221d] text-[#f4f0e9] hover:bg-[#2d372e]'
                    }`}
                  >
                    <span>{uploading ? '⏳' : '📁'}</span>
                    <span>
                      {uploading
                        ? 'Téléversement en cours...'
                        : 'Choisir des images ou vidéos (PC / Téléphone)'}
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="text-xs text-stone-600 hover:text-stone-900 underline"
                  >
                    {showUrlInput ? 'Masquer l\'ajout par URL' : '+ Ou ajouter un lien URL'}
                  </button>
                </div>

                {uploadError && (
                  <p className="text-xs text-red-600 font-semibold">{uploadError}</p>
                )}

                {/* Champ ajout par URL */}
                {showUrlInput && (
                  <div className="flex gap-2 items-center pt-2">
                    <input
                      type="text"
                      placeholder="https://images.unsplash.com/... ou lien vidéo .mp4"
                      value={manualUrl}
                      onChange={(e) => setManualUrl(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#b8c8a6]"
                    />
                    <button
                      type="button"
                      onClick={handleAddManualUrl}
                      className="px-4 py-2 text-xs font-bold bg-stone-700 text-white rounded-lg hover:bg-stone-800"
                    >
                      Ajouter au carrousel
                    </button>
                  </div>
                )}

                {/* Galerie / Carrousel interactif des médias */}
                {formProduct.media && formProduct.media.length > 0 ? (
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-bold uppercase text-stone-500 tracking-wider block">
                      Ordre du carrousel — Cliquez sur « Couverture » pour choisir l'image principale affichée :
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                      {formProduct.media.map((item, idx) => {
                        const isCover = formProduct.image === item.url
                        return (
                          <div
                            key={idx}
                            className={`relative group rounded-lg overflow-hidden border-2 bg-white shadow-sm transition flex flex-col ${
                              isCover ? 'border-[#8ea07c] ring-2 ring-[#b8c8a6]' : 'border-stone-200'
                            }`}
                          >
                            <div className="relative aspect-square bg-stone-100 flex items-center justify-center overflow-hidden">
                              {item.type === 'video' ? (
                                <video src={item.url} className="w-full h-full object-cover" muted playsInline />
                              ) : (
                                <img
                                  src={item.url}
                                  alt={`Aperçu ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    ;(e.target as HTMLImageElement).src = '/placeholder.svg'
                                  }}
                                />
                              )}

                              {/* Badge Type */}
                              <span className="absolute top-1 left-1 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                                {item.type === 'video' ? '🎬 Vidéo' : '📷 Photo'}
                              </span>

                              {/* Badge Couverture */}
                              {isCover && (
                                <span className="absolute bottom-1 left-1 right-1 bg-[#1c221d]/90 text-[#b8c8a6] text-[9px] font-bold text-center py-0.5 rounded shadow">
                                  ★ Principale
                                </span>
                              )}

                              {/* Bouton Supprimer */}
                              <button
                                type="button"
                                onClick={() => handleRemoveMedia(idx)}
                                className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow"
                                title="Supprimer ce média"
                              >
                                ✕
                              </button>
                            </div>

                            {/* Actions miniatures */}
                            <div className="p-1.5 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-[11px]">
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => handleMoveMedia(idx, 'left')}
                                  className="px-1.5 py-0.5 bg-white border border-stone-300 rounded text-stone-700 hover:bg-stone-100 disabled:opacity-30"
                                  title="Déplacer vers la gauche"
                                >
                                  ‹
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === formProduct.media!.length - 1}
                                  onClick={() => handleMoveMedia(idx, 'right')}
                                  className="px-1.5 py-0.5 bg-white border border-stone-300 rounded text-stone-700 hover:bg-stone-100 disabled:opacity-30"
                                  title="Déplacer vers la droite"
                                >
                                  ›
                                </button>
                              </div>

                              {!isCover && (
                                <button
                                  type="button"
                                  onClick={() => handleSetCover(item.url)}
                                  className="text-[10px] text-stone-600 hover:text-stone-900 font-semibold underline"
                                  title="Définir comme image de couverture"
                                >
                                  Couverture
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 border-2 border-dashed border-stone-300 rounded-lg bg-white/50">
                    <span className="text-3xl block mb-1">🖼️</span>
                    <p className="text-xs text-stone-500">
                      Aucun média dans le carrousel. Cliquez sur le bouton noir ci-dessus pour ajouter des photos et vidéos.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4 bg-[#faf8f4] border border-[#d6cfc0] rounded-xl p-5">
                {/* 1. SECTION PHOTOS VISUELLES DE LA DESCRIPTION */}
                <div className="space-y-3 pb-4 border-b border-[#e5dfd2]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📷</span>
                        <label className="text-sm font-bold uppercase tracking-wider text-[#1c221d]">
                          Photos de la description
                        </label>
                        {descPhotos.length > 0 && (
                          <span className="text-xs bg-[#1c221d] text-white px-2.5 py-0.5 rounded-full font-bold">
                            {descPhotos.length} photo(s)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Ajoutez vos photos ici : elles s&apos;affichent directement en images réelles ci-dessous sans aucun code dans votre texte.
                      </p>
                    </div>

                    {/* Boutons d'ajout de photo */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        ref={descFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleDescFileUpload}
                        disabled={descUploading}
                      />
                      <button
                        type="button"
                        onClick={() => descFileInputRef.current?.click()}
                        disabled={descUploading}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#1c221d] text-[#f4f0e9] text-xs font-bold rounded-lg hover:bg-[#2e3730] transition shadow disabled:opacity-50"
                      >
                        {descUploading ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            <span>Chargement...</span>
                          </>
                        ) : (
                          <>
                            <span>📷</span>
                            <span>+ Ajouter une photo</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowDescUrlModal(!showDescUrlModal)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-stone-300 text-stone-700 text-xs font-semibold rounded-lg hover:bg-stone-50 hover:border-stone-400 transition shadow-sm"
                      >
                        <span>🔗</span>
                        <span>Par lien URL</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowDescPreview(!showDescPreview)}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition shadow-sm ${
                          showDescPreview
                            ? 'bg-[#b8c8a6]/40 text-[#1c221d] border-[#97ab83]'
                            : 'bg-white border-stone-300 text-stone-700 hover:bg-stone-50'
                        }`}
                      >
                        <span>👁️</span>
                        <span>{showDescPreview ? 'Masquer aperçu' : 'Aperçu fiche produit'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Formulaire ajout image par URL */}
                  {showDescUrlModal && (
                    <div className="bg-white border border-stone-200 rounded-lg p-3.5 space-y-2.5 shadow-sm">
                      <span className="text-xs font-bold text-stone-700 block">
                        Insérer une photo par URL internet :
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="url"
                          value={descImageUrlInput}
                          onChange={(e) => setDescImageUrlInput(e.target.value)}
                          placeholder="Lien de l'image (ex: https://...)"
                          className="px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#b8c8a6] outline-none"
                        />
                        <input
                          type="text"
                          value={descImageAltInput}
                          onChange={(e) => setDescImageAltInput(e.target.value)}
                          placeholder="Légende optionnelle (ex: Flacon d'exception)"
                          className="px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#b8c8a6] outline-none"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowDescUrlModal(false)}
                          className="px-3 py-1 text-xs text-stone-500 hover:text-stone-800"
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          onClick={handleAddDescImageUrl}
                          disabled={!descImageUrlInput.trim()}
                          className="px-4 py-1.5 bg-[#1c221d] text-white text-xs font-bold rounded-lg hover:bg-[#2e3730] disabled:opacity-40 transition shadow-sm"
                        >
                          + Ajouter cette photo
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Raccourci depuis les photos du carrousel existantes */}
                  {formProduct.images && formProduct.images.length > 0 && (
                    <div className="bg-white/90 border border-stone-200 rounded-lg p-2.5 flex items-center gap-2 overflow-x-auto">
                      <span className="text-[11px] font-bold text-stone-600 uppercase tracking-wider flex-shrink-0">
                        Ajouter depuis le carrousel :
                      </span>
                      <div className="flex items-center gap-2">
                        {formProduct.images.map((imgUrl, iIdx) => (
                          <button
                            key={iIdx}
                            type="button"
                            onClick={() => handleInsertGalleryImageIntoDesc(imgUrl)}
                            className="relative group w-11 h-11 rounded-lg border border-stone-200 overflow-hidden flex-shrink-0 hover:border-[#1c221d] hover:scale-105 transition shadow-sm"
                            title="Cliquer pour ajouter cette photo à la description"
                          >
                            <img src={imgUrl} alt={`Photo ${iIdx}`} className="w-full h-full object-cover" />
                            <span className="absolute inset-0 bg-black/40 text-white text-xs font-bold opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                              +
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Galerie visuelle des photos de description */}
                  {descPhotos.length > 0 ? (
                    <div className="space-y-2 pt-1">
                      <span className="text-[11px] font-bold text-stone-600 uppercase tracking-wider block">
                        Photos affichées dans la description ({descPhotos.length}) :
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {descPhotos.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 p-2.5 bg-white border border-stone-200 rounded-xl shadow-sm hover:border-stone-300 transition"
                          >
                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-stone-100 border border-stone-200 flex-shrink-0">
                              <img
                                src={item.url}
                                alt={item.alt || 'Photo'}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <input
                                type="text"
                                value={item.alt}
                                onChange={(e) => handleUpdateDescPhotoAlt(item.id, e.target.value)}
                                placeholder="Légende de la photo..."
                                className="w-full px-2 py-1 text-xs border border-stone-200 rounded focus:border-stone-400 outline-none"
                              />
                              <p className="text-[10px] text-green-700 font-semibold flex items-center gap-1">
                                <span>✓</span> Prête pour la fiche produit
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveDescPhoto(item.id)}
                              className="w-7 h-7 rounded-full bg-stone-100 hover:bg-red-100 text-stone-500 hover:text-red-700 flex items-center justify-center text-xs font-bold transition flex-shrink-0"
                              title="Retirer cette photo"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-white/60 border border-dashed border-stone-300 rounded-lg text-center">
                      <p className="text-xs text-stone-500">
                        Aucune photo d&apos;illustration ajoutée pour l&apos;instant. Cliquez sur <strong>« + Ajouter une photo »</strong> ci-dessus pour enrichir la fiche produit.
                      </p>
                    </div>
                  )}
                </div>

                {/* 2. SECTION RÉDACTION DU TEXTE (100% PROPRE, AUCUN CODE) */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#1c221d]">
                      Texte de la description du produit *
                    </label>
                    <span className="text-[11px] text-stone-400">
                      Rédigez normalement sans aucun code ni écriture technique
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    required
                    value={formProduct.description}
                    onChange={(e) => setFormProduct({ ...formProduct, description: e.target.value })}
                    placeholder="Décrivez les bienfaits, la texture, les rituels d'application et les actifs précieux..."
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-[#b8c8a6] outline-none bg-white text-stone-800 leading-relaxed"
                  />
                </div>

                {/* 3. APERÇU DIRECT DE LA FICHE PRODUIT */}
                {showDescPreview && (
                  <div className="mt-3 p-4 bg-white rounded-xl border border-[#b8c8a6] shadow-sm space-y-2">
                    <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                      <span className="text-xs font-bold text-[#1c221d] uppercase tracking-wider flex items-center gap-1.5">
                        <span>👁️</span> Aperçu direct sur la fiche produit publique :
                      </span>
                      <span className="text-[10px] text-stone-400 italic">
                        Texte + photos assemblés automatiquement
                      </span>
                    </div>
                    <div className="pt-2">
                      <RichDescription
                        content={
                          formProduct.description +
                          (descPhotos.length > 0
                            ? '\n\n' +
                              descPhotos
                                .map((dp) => `![${dp.alt || 'Illustration produit'}](${dp.url})`)
                                .join('\n\n')
                            : '')
                        }
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* OPTION NOUVEAUTÉS ACCUEIL */}
              <div className="bg-[#f3f7f0] border border-[#b8c8a6] rounded-xl p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl">✨</span>
                  <div>
                    <label htmlFor="addToNouvCheck" className="text-sm font-bold text-[#1c221d] cursor-pointer block">
                      Afficher ce produit dans la section « Nouveautés » de l'accueil
                    </label>
                    <p className="text-xs text-stone-600">
                      Ce produit apparaîtra immédiatement en direct sur la page d'accueil du site dans la vitrine des nouveautés.
                    </p>
                  </div>
                </div>
                <input
                  id="addToNouvCheck"
                  type="checkbox"
                  checked={addToNouveautesOnSave}
                  onChange={(e) => setAddToNouveautesOnSave(e.target.checked)}
                  className="w-5 h-5 rounded border-stone-300 text-[#1c221d] focus:ring-[#b8c8a6] cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-sm text-stone-700 hover:bg-stone-100 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={uploading || isSavingProduct}
                  className="px-6 py-2 bg-[#1c221d] text-[#f4f0e9] font-bold rounded-lg text-sm hover:bg-[#2e3730] transition shadow disabled:opacity-50 flex items-center gap-2"
                >
                  {isSavingProduct ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>Synchronisation Cloud...</span>
                    </>
                  ) : isEditing ? (
                    'Enregistrer les modifications'
                  ) : (
                    'Créer et ajouter le produit'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ================================================================= */}
        {/* ONGLET 1: BOUTIQUE                                                */}
        {/* ================================================================= */}
        {tab === 'boutique' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-[#d8d3c5] shadow-sm">
              <div>
                <h1 className="font-serif text-2xl font-bold text-[#1c221d]">Gestion du Catalogue Boutique</h1>
                <p className="text-sm text-[#666] mt-0.5">
                  Ajoutez, modifiez ou supprimez des soins du catalogue avec photos et vidéos multiples.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="px-3 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 border border-stone-300 rounded-lg hover:bg-stone-100 transition"
                  title="Restaurer les produits de démonstration"
                >
                  ↺ Rétablir défaut
                </button>

                <button
                  onClick={() => handleOpenNewProduct(false)}
                  className="px-4 py-2 text-sm font-bold bg-[#1c221d] text-[#f4f0e9] hover:bg-[#2e3730] rounded-lg transition shadow flex items-center gap-2"
                >
                  <span>+</span> Ajouter un produit
                </button>
              </div>
            </div>

            {/* Confirmation Reset */}
            {showResetConfirm && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-amber-900 text-sm">Réinitialiser tous les produits ?</h4>
                  <p className="text-xs text-amber-800">
                    Cette action restaure le catalogue d'origine et efface les ajouts personnalisés en localStorage.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg text-amber-900 hover:bg-amber-100"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleResetCatalog}
                    className="px-3 py-1.5 text-xs font-bold bg-amber-700 text-white rounded-lg hover:bg-amber-800"
                  >
                    Confirmer la réinitialisation
                  </button>
                </div>
              </div>
            )}

            {/* Confirmation de suppression */}
            {deleteId && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-red-900 text-sm">Confirmer la suppression</h4>
                  <p className="text-xs text-red-700">
                    Êtes-vous sûr de vouloir supprimer ce produit du catalogue ?
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDeleteId(null)}
                    className="px-3 py-1.5 text-xs bg-white border border-red-300 rounded-lg text-red-800 hover:bg-red-100"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(deleteId)}
                    className="px-3 py-1.5 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Supprimer définitivement
                  </button>
                </div>
              </div>
            )}

            {/* Filtres & Recherche */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                placeholder="Rechercher par nom, type, description..."
                className="flex-1 px-4 py-2.5 bg-white border border-[#d8d3c5] rounded-lg text-sm focus:ring-2 focus:ring-[#b8c8a6] outline-none"
              />

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-2.5 bg-white border border-[#d8d3c5] rounded-lg text-sm focus:ring-2 focus:ring-[#b8c8a6] outline-none"
              >
                {allCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Outil d'inspection des brouillons stockés dans le navigateur */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-100/80 border border-stone-300 rounded-xl p-3.5 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">📦</span>
                <div>
                  <span className="font-bold text-stone-900 block">
                    Brouillons temporaires du navigateur (localStorage)
                  </span>
                  <span className="text-stone-500">
                    Consultez la liste des articles mémorisés dans votre navigateur ou videz-les en 1 clic.
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleInspectLocalDrafts}
                  className="px-3 py-1.5 bg-white border border-stone-300 hover:bg-stone-50 rounded-lg font-bold text-stone-800 shadow-sm transition"
                >
                  {showLocalDrafts ? '▲ Masquer' : '👁️ Voir les brouillons'}
                </button>
                <button
                  type="button"
                  onClick={handleClearLocalDrafts}
                  className="px-3 py-1.5 bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 rounded-lg font-bold transition"
                >
                  🗑️ Vider
                </button>
              </div>
            </div>

            {showLocalDrafts && (
              <div className="bg-white border-2 border-[#b8c8a6] rounded-xl p-4 shadow-md space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                    <span>📋 Brouillons trouvés en mémoire locale :</span>
                    <span className="bg-[#1c221d] text-white px-2.5 py-0.5 rounded-full text-xs font-bold">
                      {localDraftsList.length} produit(s)
                    </span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowLocalDrafts(false)}
                    className="text-stone-400 hover:text-stone-700 text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>
                {localDraftsList.length === 0 ? (
                  <p className="text-xs text-stone-500 italic py-2">
                    Aucun brouillon orphelin en mémoire locale. Votre navigateur est 100% synchronisé avec la base !
                  </p>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {localDraftsList.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="flex items-center justify-between p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-stone-400 text-[11px] w-6">#{idx + 1}</span>
                          <div>
                            <div className="font-bold text-stone-900">{item.name || '(Sans nom)'}</div>
                            <div className="text-stone-500 font-mono text-[10px]">
                              ID: {item.id} · Catégorie: {item.category || 'Non définie'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-stone-900">{item.price || '0,00 €'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Liste des produits (Tableau) */}
            <div className="bg-white rounded-xl border border-[#d8d3c5] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#f7f5ef] border-b border-[#e5e0d4] text-xs uppercase font-bold text-stone-600">
                    <tr>
                      <th className="p-3 w-20">Médias</th>
                      <th className="p-3">Nom & Type</th>
                      <th className="p-3">Catégorie</th>
                      <th className="p-3">Prix</th>
                      <th className="p-3">Tag</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-stone-500">
                          Aucun produit trouvé dans cette catégorie ou recherche.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((prod) => {
                        const mediaCount = (prod.media && prod.media.length) || (prod.images && prod.images.length) || 1
                        return (
                          <tr key={prod.id} className="hover:bg-stone-50 transition">
                            <td className="p-3">
                              <div className="relative w-12 h-12 rounded overflow-hidden border border-stone-200 bg-stone-100">
                                {isVideoUrl(prod.image) ? (
                                  <video
                                    src={prod.image}
                                    className="w-full h-full object-cover pointer-events-none"
                                    muted
                                    playsInline
                                  />
                                ) : (
                                  <img
                                    src={prod.image}
                                    alt={prod.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      ;(e.target as HTMLImageElement).src = '/placeholder.svg'
                                    }}
                                  />
                                )}
                                {mediaCount > 1 && (
                                  <span className="absolute bottom-0 right-0 bg-black/75 text-white text-[9px] font-bold px-1 rounded-tl">
                                    {mediaCount}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="font-bold text-stone-900">{prod.name}</div>
                              <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                                {(prod.contenance || extractContenance(prod)) && (
                                  <span className="font-semibold text-[#576b46] bg-[#b8c8a6]/40 px-1.5 py-0.5 rounded text-[10px]">
                                    💧 {prod.contenance || extractContenance(prod)}
                                  </span>
                                )}
                                <span className="line-clamp-1">{prod.type}</span>
                              </div>
                              {(() => {
                                const prodColors = prod.colors && prod.colors.length > 0 ? prod.colors : extractColors(prod)
                                if (prodColors.length === 0) return null
                                return (
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <div className="flex items-center -space-x-1">
                                      {prodColors.slice(0, 5).map((colName, cIndex) => (
                                        <span
                                          key={cIndex}
                                          className="w-3 h-3 rounded-full border border-white shadow-sm inline-block"
                                          style={{ backgroundColor: getColorHex(colName) }}
                                          title={colName}
                                        />
                                      ))}
                                    </div>
                                    <span className="text-[10px] text-stone-500 font-medium">
                                      {prodColors.length === 1 ? prodColors[0] : `${prodColors.length} couleurs`}
                                    </span>
                                  </div>
                                )
                              })()}
                              <span className="text-[10px] text-stone-400 font-mono">ID: {prod.id}</span>
                            </td>
                            <td className="p-3">
                              <span className="inline-block px-2 py-0.5 rounded text-xs bg-stone-100 text-stone-700">
                                {prod.category}
                              </span>
                            </td>
                            <td className="p-3 font-semibold text-stone-900">{prod.price}</td>
                            <td className="p-3">
                              {prod.tag ? (
                                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-[#b8c8a6]/40 text-[#1c221d]">
                                  {prod.tag}
                                </span>
                              ) : (
                                <span className="text-stone-300">—</span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <div className="inline-flex gap-2">
                                <button
                                  onClick={() => handleEditProduct(prod)}
                                  className="px-2.5 py-1 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded border border-stone-200 transition"
                                >
                                  Modifier ✏️
                                </button>
                                <button
                                  onClick={() => setDeleteId(prod.id)}
                                  className="px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition"
                                >
                                  Supprimer
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* ONGLET 2: NOUVEAUTÉS                                              */}
        {/* ================================================================= */}
        {tab === 'nouveautes' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-xl border border-[#d8d3c5] shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="font-serif text-2xl font-bold text-[#1c221d]">Gestion des Nouveautés</h1>
                <p className="text-sm text-[#666] mt-1">
                  Sélectionnez les articles mis en avant dans la vitrine « Nouveautés » sur la page d'accueil.
                </p>
              </div>
              <button
                onClick={() => handleOpenNewProduct(true)}
                className="px-4 py-2 text-sm font-bold bg-[#1c221d] text-[#f4f0e9] hover:bg-[#2e3730] rounded-lg transition shadow flex items-center gap-2"
              >
                <span>+</span> Créer un produit nouveauté
              </button>
            </div>

            {/* Produits actuellement mis en avant dans Nouveautés */}
            <div className="bg-white p-6 rounded-xl border border-[#d8d3c5] shadow-sm space-y-4">
              <h2 className="font-serif text-lg font-bold text-[#1c221d] flex items-center justify-between">
                <span>Vitrine Nouveautés actuelle ({nouveautes.length})</span>
                <span className="text-xs text-stone-500 font-sans font-normal">
                  Utilisez ⬆ et ⬇ pour réordonner
                </span>
              </h2>

              {nouveautes.length === 0 ? (
                <div className="p-8 text-center text-stone-500 border-2 border-dashed border-stone-200 rounded-lg">
                  Aucun produit sélectionné pour les Nouveautés. Cochez des produits ci-dessous pour les ajouter !
                </div>
              ) : (
                <div className="space-y-3">
                  {nouveautes.map((item, index) => {
                    const prod = products.find((p) => p.id === item.productId)
                    if (!prod) return null
                    const mediaCount = (prod.media && prod.media.length) || (prod.images && prod.images.length) || 1
                    return (
                      <div
                        key={item.productId}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3.5 bg-[#fbf9f4] border border-[#e5dfd2] rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 text-center font-bold text-stone-400 text-sm">{index + 1}</span>
                          <div className="relative w-12 h-12 rounded object-cover border border-stone-200 bg-white overflow-hidden flex-shrink-0">
                            {isVideoUrl(prod.image) ? (
                              <video
                                src={prod.image}
                                className="w-full h-full object-cover pointer-events-none"
                                muted
                                playsInline
                              />
                            ) : (
                              <img
                                src={prod.image}
                                alt={prod.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  ;(e.target as HTMLImageElement).src = '/placeholder.svg'
                                }}
                              />
                            )}
                            {mediaCount > 1 && (
                              <span className="absolute bottom-0 right-0 bg-black/75 text-white text-[9px] font-bold px-1 rounded-tl">
                                {mediaCount}
                              </span>
                            )}
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-stone-900">{prod.name}</h3>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-stone-500 font-semibold">{prod.price}</span>
                              <button
                                type="button"
                                onClick={() => handleEditProduct(prod)}
                                className="text-[11px] text-stone-600 hover:text-stone-900 font-semibold underline"
                              >
                                Modifier médias/infos ✏️
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <input
                            type="text"
                            value={item.customLabel || ''}
                            onChange={(e) => handleUpdateNouveauteLabel(item.productId, e.target.value)}
                            placeholder="Label (ex: Parfumerie · Nouveau)"
                            className="text-xs px-2.5 py-1.5 border border-stone-300 rounded bg-white w-full sm:w-64 focus:ring-1 focus:ring-[#b8c8a6] outline-none"
                          />

                          <div className="flex gap-1">
                            <button
                              onClick={() => handleMoveNouveaute(index, 'up')}
                              disabled={index === 0}
                              className="px-2 py-1 text-xs border border-stone-300 rounded bg-white hover:bg-stone-100 disabled:opacity-30"
                              title="Monter"
                            >
                              ⬆
                            </button>
                            <button
                              onClick={() => handleMoveNouveaute(index, 'down')}
                              disabled={index === nouveautes.length - 1}
                              className="px-2 py-1 text-xs border border-stone-300 rounded bg-white hover:bg-stone-100 disabled:opacity-30"
                              title="Descendre"
                            >
                              ⬇
                            </button>
                            <button
                              onClick={() => handleToggleNouveaute(item.productId)}
                              className="px-2.5 py-1 text-xs text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded font-semibold"
                              title="Retirer des nouveautés"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Catalogue complet pour cocher / décocher des nouveautés */}
            <div className="bg-white p-6 rounded-xl border border-[#d8d3c5] shadow-sm space-y-4">
              <h2 className="font-serif text-lg font-bold text-[#1c221d]">
                Ajouter des produits aux Nouveautés
              </h2>
              <p className="text-xs text-stone-500">
                Cochez ou décochez les produits de votre catalogue pour modifier instantanément les articles affichés.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                {products.map((prod) => {
                  const isSelected = nouveautes.some((n) => n.productId === prod.id)
                  return (
                    <div
                      key={prod.id}
                      onClick={() => handleToggleNouveaute(prod.id)}
                      className={`p-3 rounded-lg border flex items-center justify-between gap-3 cursor-pointer transition ${
                        isSelected
                          ? 'border-[#8ea07c] bg-[#eef4ea]'
                          : 'border-stone-200 bg-white hover:border-stone-400'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="w-10 h-10 rounded object-cover bg-stone-100 border border-stone-200"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).src = '/placeholder.svg'
                          }}
                        />
                        <div className="text-left">
                          <div className="text-xs font-bold text-stone-900 line-clamp-1">{prod.name}</div>
                          <div className="text-[11px] text-stone-500">{prod.price}</div>
                        </div>
                      </div>

                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isSelected ? 'bg-[#20251f] text-white' : 'border border-stone-300 text-transparent'
                        }`}
                      >
                        ✓
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* ONGLET 2: TABLEAU DE VENTE (GESTION DES COMMANDES & STATISTIQUES)  */}
        {/* ================================================================= */}
        {tab === 'ventes' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header & Statistiques Rapides */}
            <div className="bg-white p-6 rounded-xl border border-[#d8d3c5] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="font-serif text-2xl font-bold text-[#1c221d] flex items-center gap-2">
                  <span>📈</span> Tableau de Vente
                </h1>
                <p className="text-sm text-stone-500 mt-1">
                  Suivi des commandes en direct, validation des virements bancaires et export de l'activité.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => reloadData()}
                  className="px-3.5 py-2 text-xs font-bold border border-stone-300 rounded-lg hover:bg-stone-100 text-stone-700 transition flex items-center gap-1.5"
                >
                  <span>🔄</span> Actualiser
                </button>
              </div>
            </div>

            {/* Cartes KPI / Indicateurs clés */}
            {(() => {
              const totalRevenue = orders
                .filter((o) => o.status !== 'Annulée')
                .reduce((acc, o) => acc + (o.totalPrice || 0), 0)
              const paidRevenue = orders
                .filter((o) => o.status === 'Paiement reçu' || o.status === 'Expédiée' || o.status === 'Livrée')
                .reduce((acc, o) => acc + (o.totalPrice || 0), 0)
              const pendingCount = orders.filter((o) => o.status === 'En attente de virement').length
              const completedCount = orders.filter(
                (o) => o.status === 'Paiement reçu' || o.status === 'Expédiée' || o.status === 'Livrée'
              ).length

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-[#d8d3c5] shadow-sm">
                    <div className="text-xs font-bold uppercase tracking-wider text-stone-500">Chiffre d'Affaires Validé</div>
                    <div className="text-2xl font-serif font-black text-[#166534] mt-2">
                      {paidRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </div>
                    <div className="text-[11px] text-stone-400 mt-1">
                      Sur {completedCount} commande(s) réglée(s)
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-[#d8d3c5] shadow-sm">
                    <div className="text-xs font-bold uppercase tracking-wider text-stone-500">Volume Total Commandé</div>
                    <div className="text-2xl font-serif font-black text-stone-900 mt-2">
                      {totalRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </div>
                    <div className="text-[11px] text-stone-400 mt-1">
                      {orders.length} commande(s) au total
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-amber-200 bg-amber-50/40 shadow-sm">
                    <div className="text-xs font-bold uppercase tracking-wider text-amber-800">En Attente Virement</div>
                    <div className="text-2xl font-serif font-black text-amber-900 mt-2 flex items-center gap-2">
                      <span>{pendingCount}</span>
                      {pendingCount > 0 && (
                        <span className="text-xs font-sans px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold">
                          À traiter
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-amber-700/80 mt-1">
                      Vérifier les réceptions de fonds sur votre compte
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-[#d8d3c5] shadow-sm">
                    <div className="text-xs font-bold uppercase tracking-wider text-stone-500">Panier Moyen</div>
                    <div className="text-2xl font-serif font-black text-stone-800 mt-2">
                      {orders.length > 0
                        ? (totalRevenue / orders.length).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
                        : '0,00 €'}
                    </div>
                    <div className="text-[11px] text-stone-400 mt-1">Par commande client</div>
                  </div>
                </div>
              )
            })()}

            {/* Barre de Recherche et Filtres */}
            <div className="bg-white p-4 rounded-xl border border-[#d8d3c5] shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative w-full md:w-80">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-sm">🔍</span>
                <input
                  type="text"
                  placeholder="Rechercher par client, email, réf..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-[#b8c8a6] outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Statut :</span>
                {['Tous', 'En attente de virement', 'Paiement reçu', 'Expédiée', 'Livrée', 'Annulée'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setOrderStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      orderStatusFilter === status
                        ? 'bg-[#20251f] text-white shadow-sm'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Table des Commandes */}
            {(() => {
              const filteredOrders = orders.filter((order) => {
                const matchStatus = orderStatusFilter === 'Tous' || order.status === orderStatusFilter
                const query = orderSearch.toLowerCase()
                const matchSearch =
                  order.id.toLowerCase().includes(query) ||
                  order.customerName.toLowerCase().includes(query) ||
                  order.customerEmail.toLowerCase().includes(query) ||
                  (order.productName && order.productName.toLowerCase().includes(query)) ||
                  (order.customerPhone && order.customerPhone.includes(query))
                return matchStatus && matchSearch
              })

              if (filteredOrders.length === 0) {
                return (
                  <div className="bg-white p-12 rounded-xl border border-[#d8d3c5] text-center">
                    <div className="text-4xl mb-3">📦</div>
                    <h3 className="font-serif text-lg font-bold text-stone-800">Aucune commande trouvée</h3>
                    <p className="text-sm text-stone-500 mt-1 max-w-md mx-auto">
                      {orderSearch || orderStatusFilter !== 'Tous'
                        ? 'Aucun résultat ne correspond à vos filtres de recherche.'
                        : "Les commandes passées sur la boutique apparaîtront ici automatiquement dès qu'un client passera commande."}
                    </p>
                  </div>
                )
              }

              return (
                <div className="bg-white rounded-xl border border-[#d8d3c5] shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-[#faf9f5] border-b border-[#e5dfd0] text-[11px] font-bold uppercase tracking-wider text-stone-600">
                          <th className="py-3.5 px-4">Réf. Commande</th>
                          <th className="py-3.5 px-4">Date</th>
                          <th className="py-3.5 px-4">Client & Contact</th>
                          <th className="py-3.5 px-4">Articles / Produit</th>
                          <th className="py-3.5 px-4 text-right">Montant</th>
                          <th className="py-3.5 px-4 text-center">Statut du Virement</th>
                          <th className="py-3.5 px-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200">
                        {filteredOrders.map((order) => {
                          const dateFormatted = new Date(order.createdAt).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })

                          const getBadgeColor = (status: Order['status']) => {
                            switch (status) {
                              case 'Paiement reçu':
                                return 'bg-green-100 text-green-800 border-green-300'
                              case 'Expédiée':
                                return 'bg-blue-100 text-blue-800 border-blue-300'
                              case 'Livrée':
                                return 'bg-purple-100 text-purple-800 border-purple-300'
                              case 'Annulée':
                                return 'bg-red-100 text-red-800 border-red-300'
                              case 'En attente de virement':
                              default:
                                return 'bg-amber-100 text-amber-800 border-amber-300'
                            }
                          }

                          return (
                            <tr key={order.id} className="hover:bg-stone-50 transition">
                              <td className="py-3.5 px-4 font-mono font-bold text-stone-900">
                                <span className="bg-stone-100 px-2 py-1 rounded border border-stone-200">
                                  {order.id}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-xs text-stone-500 whitespace-nowrap">
                                {dateFormatted}
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-stone-900">{order.customerName}</div>
                                <div className="text-xs text-stone-500">{order.customerEmail}</div>
                                <div className="text-xs text-stone-400">{order.customerPhone}</div>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-medium text-stone-800 line-clamp-1">
                                  {order.productName || 'Article Boutique'}
                                </div>
                                <div className="text-[11px] text-stone-400">
                                  {order.customerAddress}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-right font-bold text-stone-900 font-serif">
                                {Number(order.totalPrice || 0).toLocaleString('fr-FR', {
                                  style: 'currency',
                                  currency: 'EUR',
                                })}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <select
                                  value={order.status}
                                  onChange={(e) =>
                                    handleUpdateOrderStatus(order.id, e.target.value as Order['status'])
                                  }
                                  className={`text-xs font-bold px-2.5 py-1.5 rounded-full border outline-none cursor-pointer ${getBadgeColor(
                                    order.status
                                  )}`}
                                >
                                  <option value="En attente de virement">⏳ En attente de virement</option>
                                  <option value="Paiement reçu">✅ Paiement reçu</option>
                                  <option value="Expédiée">📦 Expédiée</option>
                                  <option value="Livrée">✨ Livrée</option>
                                  <option value="Annulée">❌ Annulée</option>
                                </select>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedOrder(order)}
                                    title="Voir le récapitulatif complet"
                                    className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-200 rounded transition"
                                  >
                                    👁️
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteOrder(order.id)}
                                    title="Supprimer la commande"
                                    className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })()}

            {/* Modal Détail Commande */}
            {selectedOrder && (
              <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={() => setSelectedOrder(null)}
              >
                <div
                  className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-stone-300 animate-fade-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center pb-3 border-b border-stone-200">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
                        Détail de la commande
                      </span>
                      <h3 className="font-serif text-xl font-bold text-stone-900">
                        {selectedOrder.id}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(null)}
                      className="text-stone-400 hover:text-stone-800 text-lg p-1"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-4 text-sm">
                    {/* Infos Client */}
                    <div className="bg-[#faf9f5] p-3.5 rounded-lg border border-[#e5dfd0]">
                      <div className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                        Coordonnées du Client
                      </div>
                      <div className="font-bold text-stone-900">{selectedOrder.customerName}</div>
                      <div className="text-stone-600 text-xs mt-0.5">📧 {selectedOrder.customerEmail}</div>
                      <div className="text-stone-600 text-xs mt-0.5">📞 {selectedOrder.customerPhone}</div>
                      <div className="text-stone-600 text-xs mt-0.5">📍 {selectedOrder.customerAddress}</div>
                    </div>

                    {/* Produit & Paiement */}
                    <div className="space-y-2">
                      <div className="flex justify-between py-2 border-b border-stone-100">
                        <span className="text-stone-500">Article :</span>
                        <span className="font-semibold text-stone-900">{selectedOrder.productName}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-stone-100">
                        <span className="text-stone-500">Moyen de règlement :</span>
                        <span className="font-semibold text-stone-900">{selectedOrder.paymentMethod || 'Virement Bancaire'}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-stone-100">
                        <span className="text-stone-500">Date de passage :</span>
                        <span className="text-stone-700">
                          {new Date(selectedOrder.createdAt).toLocaleString('fr-FR')}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 text-base font-bold">
                        <span className="text-stone-800 font-serif">Total à encaisser :</span>
                        <span className="text-[#166534] font-serif text-lg">
                          {Number(selectedOrder.totalPrice || 0).toLocaleString('fr-FR', {
                            style: 'currency',
                            currency: 'EUR',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Statut modifiable */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                        Changer le statut :
                      </label>
                      <select
                        value={selectedOrder.status}
                        onChange={(e) =>
                          handleUpdateOrderStatus(selectedOrder.id, e.target.value as Order['status'])
                        }
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white font-semibold outline-none focus:ring-2 focus:ring-[#b8c8a6]"
                      >
                        <option value="En attente de virement">⏳ En attente de virement</option>
                        <option value="Paiement reçu">✅ Paiement reçu (Fonds vérifiés sur compte)</option>
                        <option value="Expédiée">📦 Expédiée (Colis confié au transporteur)</option>
                        <option value="Livrée">✨ Livrée au client</option>
                        <option value="Annulée">❌ Annulée</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-stone-200 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(null)}
                      className="px-5 py-2 bg-[#20251f] text-white font-bold rounded-lg text-xs uppercase tracking-wider hover:bg-stone-800 transition"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* ONGLET 3: PARAMÈTRES, BANQUE & PIXELS                             */}
        {/* ================================================================= */}
        {tab === 'parametres' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-xl border border-[#d8d3c5] shadow-sm">
              <h1 className="font-serif text-2xl font-bold text-[#1c221d]">Paramètres Généraux du Site</h1>
              <p className="text-sm text-[#666] mt-1">
                Configurez les coordonnées bancaires pour les virements, vos pixels publicitaires, la bannière supérieure et l'accès admin.
              </p>
            </div>

            {/* Formulaire complet des paramètres */}
            <form onSubmit={handleSaveSettings} className="bg-white p-6 rounded-xl border border-[#d8d3c5] shadow-sm space-y-8">
              {/* 1. COORDONNÉES BANCAIRES POUR VIREMENT */}
              <div className="bg-[#faf9f5] border border-[#d8d1c2] p-5 rounded-xl space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-[#e5dfd0]">
                  <span className="text-2xl">🏦</span>
                  <div>
                    <h2 className="font-serif text-lg font-bold text-[#1c221d]">
                      Coordonnées Bancaires pour Virement Bancaire
                    </h2>
                    <p className="text-xs text-stone-500">
                      Ces coordonnées seront automatiquement présentées aux clients lorsqu'ils passent commande dans la boutique.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                      Nom de la Banque *
                    </label>
                    <input
                      type="text"
                      required
                      value={settings.bankName || ''}
                      onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
                      placeholder="ex: BNP Paribas, Crédit Agricole, Société Générale..."
                      className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#b8c8a6] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                      Titulaire du Compte (Bénéficiaire) *
                    </label>
                    <input
                      type="text"
                      required
                      value={settings.bankAccountHolder || ''}
                      onChange={(e) => setSettings({ ...settings, bankAccountHolder: e.target.value })}
                      placeholder="ex: MERCATUM SAS"
                      className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#b8c8a6] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                      IBAN *
                    </label>
                    <input
                      type="text"
                      required
                      value={settings.bankIban || ''}
                      onChange={(e) => setSettings({ ...settings, bankIban: e.target.value.toUpperCase() })}
                      placeholder="ex: FR76 3000 4001 2345 6789 0123 456"
                      className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm font-mono tracking-wider bg-white focus:ring-2 focus:ring-[#b8c8a6] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                      Code BIC / SWIFT *
                    </label>
                    <input
                      type="text"
                      required
                      value={settings.bankSwift || ''}
                      onChange={(e) => setSettings({ ...settings, bankSwift: e.target.value.toUpperCase() })}
                      placeholder="ex: BNPAFR2PXXX"
                      className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm font-mono tracking-wider bg-white focus:ring-2 focus:ring-[#b8c8a6] outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                      Consignes ou motif de virement pour le client
                    </label>
                    <input
                      type="text"
                      value={settings.bankInstructions || ''}
                      onChange={(e) => setSettings({ ...settings, bankInstructions: e.target.value })}
                      placeholder="ex: Veuillez mentionner votre référence de commande en libellé de virement."
                      className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#b8c8a6] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 2. PIXELS PUBLICITAIRES & MARKETING */}
              <div className="bg-[#faf9f5] border border-[#d8d1c2] p-5 rounded-xl space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-[#e5dfd0]">
                  <span className="text-2xl">🎯</span>
                  <div>
                    <h2 className="font-serif text-lg font-bold text-[#1c221d]">
                      Pixels Publicitaires & Tracking Marketing
                    </h2>
                    <p className="text-xs text-stone-500">
                      Connectez vos pixels pour suivre les visiteurs, mesurer le retour sur investissement publicitaire (ROAS) et optimiser vos campagnes.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                      🔵 Facebook / Meta Pixel ID
                    </label>
                    <input
                      type="text"
                      value={settings.facebookPixelId || ''}
                      onChange={(e) => setSettings({ ...settings, facebookPixelId: e.target.value })}
                      placeholder="ex: 1234567890123456"
                      className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm bg-white font-mono focus:ring-2 focus:ring-[#b8c8a6] outline-none"
                    />
                    <span className="text-[11px] text-stone-400 mt-1 block">
                      Suivi automatique des visites (PageView) et des commandes (Purchase).
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                      🎵 TikTok Pixel ID
                    </label>
                    <input
                      type="text"
                      value={settings.tiktokPixelId || ''}
                      onChange={(e) => setSettings({ ...settings, tiktokPixelId: e.target.value })}
                      placeholder="ex: C1234567890ABCDEF"
                      className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm bg-white font-mono focus:ring-2 focus:ring-[#b8c8a6] outline-none"
                    />
                    <span className="text-[11px] text-stone-400 mt-1 block">
                      Pour optimiser vos campagnes TikTok Ads et recibler vos visiteurs.
                    </span>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                      📊 Google Tag / Google Ads ID (GTAG)
                    </label>
                    <input
                      type="text"
                      value={settings.googleTagId || ''}
                      onChange={(e) => setSettings({ ...settings, googleTagId: e.target.value })}
                      placeholder="ex: G-XXXXXXXXXX ou AW-XXXXXXXXXX"
                      className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm bg-white font-mono focus:ring-2 focus:ring-[#b8c8a6] outline-none"
                    />
                    <span className="text-[11px] text-stone-400 mt-1 block">
                      Compatible Google Ads (conversions), Google Analytics 4 (GA4) et Google Tag Manager.
                    </span>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                      🏷️ Script ou Pixel Personnalisé (Snapchat, Pinterest ou balise HTML &lt;script&gt;)
                    </label>
                    <textarea
                      rows={4}
                      value={settings.customPixelScript || ''}
                      onChange={(e) => setSettings({ ...settings, customPixelScript: e.target.value })}
                      placeholder={'<!-- Collez ici tout code ou balise de pixel personnalisée -->'}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs font-mono bg-white focus:ring-2 focus:ring-[#b8c8a6] outline-none"
                    />
                    <span className="text-[11px] text-stone-400 mt-1 block">
                      Ce code sera injecté directement sur toutes les pages de votre site pour suivre votre audience.
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. BANNIÈRE D'ANNONCE */}
              <div>
                <h2 className="font-serif text-lg font-bold text-[#1c221d] mb-4 pb-2 border-b border-stone-200">
                  📢 Bannière d'Annonce Supérieure
                </h2>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                    Texte du bandeau en haut de toutes les pages
                  </label>
                  <input
                    type="text"
                    value={settings.announcement}
                    onChange={(e) => setSettings({ ...settings, announcement: e.target.value })}
                    placeholder="Livraison offerte dès 60 € en France métropolitaine · Retours sous 30 jours"
                    className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-[#b8c8a6] outline-none"
                  />
                  <span className="text-[11px] text-stone-400 mt-1 block">
                    Ce message s'affiche dans la barre noire en tout premier sur l'accueil et la boutique.
                  </span>
                </div>
              </div>

              {/* 4. COORDONNÉES DE CONTACT */}
              <div>
                <h2 className="font-serif text-lg font-bold text-[#1c221d] mb-4 pb-2 border-b border-stone-200">
                  📍 Coordonnées & Contact de la Maison
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                      Numéro de téléphone
                    </label>
                    <input
                      type="text"
                      value={settings.contactPhone}
                      onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                      placeholder="+33 1 42 56 12 00"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-[#b8c8a6] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                      Email de contact (Gmail ou domaine)
                    </label>
                    <input
                      type="email"
                      value={settings.contactEmail}
                      onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                      placeholder="contact@maisonlune.fr"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-[#b8c8a6] outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                      Adresse physique de la boutique
                    </label>
                    <input
                      type="text"
                      value={settings.contactAddress}
                      onChange={(e) => setSettings({ ...settings, contactAddress: e.target.value })}
                      placeholder="24 avenue Montaigne, 75008 Paris, France"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-[#b8c8a6] outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                      Horaires d'ouverture
                    </label>
                    <input
                      type="text"
                      value={settings.contactHours}
                      onChange={(e) => setSettings({ ...settings, contactHours: e.target.value })}
                      placeholder="Lundi – Vendredi : 10h – 19h · Samedi : 10h – 17h"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-[#b8c8a6] outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#1c221d] text-[#f4f0e9] font-bold rounded-lg text-sm hover:bg-[#2e3730] transition shadow"
                >
                  Enregistrer les paramètres, coordonnées & pixels
                </button>
              </div>
            </form>

            {/* Sécurité & Mot de passe */}
            <div className="bg-white p-6 rounded-xl border border-[#d8d3c5] shadow-sm space-y-4">
              <h2 className="font-serif text-lg font-bold text-[#1c221d] pb-2 border-b border-stone-200">
                🔐 Sécurité & Accès Admin
              </h2>
              <p className="text-xs text-stone-500">
                Modifiez le mot de passe nécessaire pour accéder à cet espace d'administration. (Par défaut : <code>admin1234</code>)
              </p>

              {passwordFeedback && (
                <div
                  className={`p-3 rounded-lg text-xs font-semibold ${
                    passwordFeedback.type === 'success'
                      ? 'bg-green-50 border border-green-200 text-green-800'
                      : 'bg-red-50 border border-red-200 text-red-800'
                  }`}
                >
                  {passwordFeedback.text}
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-3 max-w-md">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                    Nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-[#b8c8a6] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                    Confirmer le nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-[#b8c8a6] outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="px-5 py-2 bg-stone-800 text-white font-bold rounded-lg text-xs uppercase tracking-wider hover:bg-stone-900 transition"
                >
                  Mettre à jour le mot de passe
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
