'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  getProducts,
  saveProduct,
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
} from '@/lib/supabaseService'
import { type Product, type MediaItem, CATEGORIES } from '@/lib/products'

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
  const [addToNouveautesOnSave, setAddToNouveautesOnSave] = useState(false)

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
    siteName: 'Maison Lune',
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
    setProducts(getProducts())
    setNouveautes(getNouveautes())
    setSettings(getSiteSettings())
    const localOrders = getOrders()
    setOrders(localOrders)

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
            currency: item.currency || 'EUR',
            paymentMethod: item.paymentMethod || 'Virement Bancaire',
            status: item.status || 'En attente de virement',
            createdAt: item.createdAt || new Date().toISOString(),
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
    setIsEditing(false)
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
          type: /\.(mp4|webm|mov|avi|m4v|ogg)$/i.test(url) ? 'video' : 'image',
        }))
      : p.image
      ? [{ url: p.image, type: /\.(mp4|webm|mov|avi|m4v|ogg)$/i.test(p.image) ? 'video' : 'image' }]
      : []

    setFormProduct({
      ...p,
      media: mediaList,
      images: mediaList.map((m) => m.url),
    })
    setIsEditing(true)
    setAddToNouveautesOnSave(false)
    setShowForm(true)
    setShowUrlInput(false)
    setManualUrl('')
    setUploadError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // --- Gestion du téléversement de fichiers multiples (Carrousel) ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    setUploadError(null)

    const formData = new FormData()
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i])
    }

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        throw new Error(`Erreur du serveur (${res.status})`)
      }

      const data = await res.json()
      if (data.files && data.files.length > 0) {
        const newMedia: MediaItem[] = data.files.map((f: any) => ({
          url: f.url,
          type: f.type,
        }))

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

        showToast(`${newMedia.length} média(s) ajouté(s) au carrousel !`)
      }
    } catch (err: any) {
      console.error('Erreur upload:', err)
      setUploadError("Impossible de téléverser les fichiers. Vérifiez leur taille et réessayez.")
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
    const isVideo = /\.(mp4|webm|mov|avi|m4v|ogg)$/i.test(url)
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

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formProduct.name.trim()) {
      alert('Veuillez entrer le nom du produit.')
      return
    }

    const rawNum = parseFloat(String(formProduct.rawPrice)) || 0
    const priceFormatted = formProduct.price.trim() || `${rawNum.toFixed(2).replace('.', ',')} €`
    const generatedId = formProduct.id.trim() || slugify(formProduct.name) || `prod-${Date.now()}`

    const mediaList = formProduct.media || []
    const imagesList = mediaList.length > 0
      ? mediaList.map((m) => m.url)
      : formProduct.image ? [formProduct.image] : []

    const primaryImage =
      formProduct.image.trim() ||
      mediaList[0]?.url ||
      'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=900&q=85'

    const productToSave: Product = {
      ...formProduct,
      id: generatedId,
      price: priceFormatted,
      rawPrice: rawNum,
      rating: parseFloat(String(formProduct.rating)) || 5.0,
      reviewsCount: parseInt(String(formProduct.reviewsCount), 10) || 0,
      image: primaryImage,
      images: imagesList,
      media: mediaList,
    }

    saveProduct(productToSave)

    // Si on a cliqué sur "+ Créer un produit pour les Nouveautés"
    if (addToNouveautesOnSave) {
      const exists = nouveautes.some((n) => n.productId === productToSave.id)
      if (!exists) {
        const updatedNouv = [
          ...nouveautes,
          { productId: productToSave.id, customLabel: productToSave.tag || productToSave.type || 'Nouveauté' },
        ]
        saveNouveautes(updatedNouv)
      }
    }

    reloadData()
    setShowForm(false)
    showToast(
      isEditing
        ? `Produit « ${productToSave.name} » modifié avec succès`
        : `Produit « ${productToSave.name} » ajouté au catalogue !`
    )
  }

  const handleDeleteProduct = (id: string) => {
    deleteProduct(id)
    const updatedNouveautes = nouveautes.filter((n) => n.productId !== id)
    saveNouveautes(updatedNouveautes)
    setDeleteId(null)
    reloadData()
    showToast('Produit supprimé du catalogue')
  }

  const handleResetCatalog = () => {
    resetProductsToDefault()
    setShowResetConfirm(false)
    reloadData()
    showToast('Catalogue réinitialisé avec les produits par défaut')
  }

  // --- Actions Nouveautés ---
  const handleToggleNouveaute = (productId: string) => {
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
    showToast('Sélection des nouveautés mise à jour')
  }

  const handleMoveNouveaute = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= nouveautes.length) return
    const updated = [...nouveautes]
    const [moved] = updated.splice(index, 1)
    updated.splice(targetIndex, 0, moved)
    setNouveautes(updated)
    saveNouveautes(updated)
  }

  const handleUpdateNouveauteLabel = (productId: string, label: string) => {
    const updated = nouveautes.map((n) => (n.productId === productId ? { ...n, customLabel: label } : n))
    setNouveautes(updated)
    saveNouveautes(updated)
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

  const availableCategories = CATEGORIES.filter((c) => c !== 'Tous les produits')

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
            <span className="text-xl">🌙</span>
            <div>
              <span className="font-serif text-lg tracking-wider font-semibold text-[#f4f0e9] group-hover:text-[#b8c8a6] transition">
                Maison Lune
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                    Catégorie *
                  </label>
                  <select
                    value={formProduct.category}
                    onChange={(e) => setFormProduct({ ...formProduct, category: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-[#b8c8a6] outline-none bg-white"
                  >
                    {availableCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
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

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Description du produit *
                </label>
                <textarea
                  rows={3}
                  required
                  value={formProduct.description}
                  onChange={(e) => setFormProduct({ ...formProduct, description: e.target.value })}
                  placeholder="Décrivez les bienfaits, la texture et les actifs précieux..."
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-[#b8c8a6] outline-none"
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
                  disabled={uploading}
                  className="px-6 py-2 bg-[#1c221d] text-[#f4f0e9] font-bold rounded-lg text-sm hover:bg-[#2e3730] transition shadow disabled:opacity-50"
                >
                  {isEditing ? 'Enregistrer les modifications' : 'Créer et ajouter le produit'}
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
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

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
                                <img
                                  src={prod.image}
                                  alt={prod.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    ;(e.target as HTMLImageElement).src = '/placeholder.svg'
                                  }}
                                />
                                {mediaCount > 1 && (
                                  <span className="absolute bottom-0 right-0 bg-black/75 text-white text-[9px] font-bold px-1 rounded-tl">
                                    {mediaCount}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="font-bold text-stone-900">{prod.name}</div>
                              <div className="text-xs text-stone-500 line-clamp-1">{prod.type}</div>
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
                            <img
                              src={prod.image}
                              alt={prod.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                ;(e.target as HTMLImageElement).src = '/placeholder.svg'
                              }}
                            />
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
                      placeholder="ex: Maison Lune Paris SAS"
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
