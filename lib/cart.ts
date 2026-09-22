import { Product } from './products'

export interface CartItem {
  id: string
  product: Product
  quantity: number
  selectedColor?: string
  selectedVolume?: string
  addedAt: number
}

const CART_STORAGE_KEY = 'mercatum_cart_items'

function isClient(): boolean {
  return typeof window !== 'undefined'
}

function notifyCartUpdate() {
  if (!isClient()) return
  try {
    window.dispatchEvent(new Event('mercatum:cart_updated'))
  } catch {}
}

export function getCart(): CartItem[] {
  if (!isClient()) return []
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveCart(items: CartItem[]) {
  if (!isClient()) return
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    notifyCartUpdate()
  } catch (err) {
    console.warn('Erreur sauvegarde panier localStorage:', err)
  }
}

export function addToCart(
  product: Product,
  quantity = 1,
  options?: { color?: string; volume?: string }
): CartItem[] {
  if (!product) return getCart()
  const items = getCart()
  const color = options?.color?.trim() || product.color?.trim() || ''
  const volume = options?.volume?.trim() || product.contenance?.trim() || ''
  const itemId = `${product.id}_${color}_${volume}`

  const existingIndex = items.findIndex((i) => i.id === itemId)
  if (existingIndex >= 0) {
    items[existingIndex].quantity += quantity
  } else {
    items.unshift({
      id: itemId,
      product,
      quantity,
      selectedColor: color || undefined,
      selectedVolume: volume || undefined,
      addedAt: Date.now(),
    })
  }

  saveCart(items)
  return items
}

export function updateCartQuantity(itemId: string, quantity: number): CartItem[] {
  const items = getCart()
  const index = items.findIndex((i) => i.id === itemId)
  if (index >= 0) {
    if (quantity <= 0) {
      items.splice(index, 1)
    } else {
      items[index].quantity = quantity
    }
    saveCart(items)
  }
  return items
}

export function removeFromCart(itemId: string): CartItem[] {
  const items = getCart().filter((i) => i.id !== itemId)
  saveCart(items)
  return items
}

export function clearCart() {
  saveCart([])
}

export function getCartCount(): number {
  const items = getCart()
  return items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0)
}

export function getCartTotal(): number {
  const items = getCart()
  return items.reduce((sum, item) => {
    const unitPrice = Number(item.product.rawPrice) || 0
    return sum + unitPrice * (Number(item.quantity) || 1)
  }, 0)
}

/**
 * Génère un produit consolidé à partir de tous les éléments du panier
 * pour l'injecter directement dans le CheckoutModal de virement bancaire.
 */
export function getCartConsolidatedProduct(): Product | null {
  const items = getCart()
  if (items.length === 0) return null

  if (items.length === 1) {
    const item = items[0]
    let name = item.product.name
    if (item.selectedVolume && !name.includes(item.selectedVolume)) {
      name += ` · ${item.selectedVolume}`
    }
    if (item.selectedColor && !name.includes(item.selectedColor)) {
      name += ` · ${item.selectedColor}`
    }
    return {
      ...item.product,
      name,
      color: item.selectedColor || item.product.color,
      contenance: item.selectedVolume || item.product.contenance,
    }
  }

  const totalRaw = getCartTotal()
  const namesSummary = items
    .map((i) => `${i.quantity}x ${i.product.name}${i.selectedColor ? ` (${i.selectedColor})` : ''}`)
    .join(' + ')

  return {
    id: `cart_${Date.now()}`,
    name: `Cesta MERCATUM (${items.length} artículos): ${namesSummary.slice(0, 100)}${namesSummary.length > 100 ? '...' : ''}`,
    category: 'Cesta de compra',
    type: `${items.length} artículos`,
    price: `${totalRaw.toFixed(2).replace('.', ',')} €`,
    rawPrice: totalRaw,
    description: namesSummary,
    image: items[0].product.image,
    images: items.map((i) => i.product.image).filter(Boolean),
    rating: 5.0,
    reviewsCount: 1,
  }
}
