'use client'

import { useState, useEffect, useMemo } from 'react'
import { Product, isVideoUrl } from '@/lib/products'
import { getSiteSettings, saveSiteSettings, DEFAULT_SETTINGS, saveOrder, type SiteSettings } from '@/lib/store'
import { createOrderInDb, markOrderPaymentConfirmedInDb } from '@/lib/supabaseService'
import { trackPixel } from '@/components/PixelTracker'

export const SPANISH_PROVINCES: { name: string; cities: string[] }[] = [
  { name: 'Álava', cities: ['Vitoria-Gasteiz', 'Llodio', 'Amurrio', 'Salvatierra', 'Oyón'] },
  { name: 'Albacete', cities: ['Albacete', 'Hellín', 'Villarrobledo', 'Almansa', 'La Roda', 'Caudete'] },
  { name: 'Alicante', cities: ['Alicante', 'Elche', 'Torrevieja', 'Orihuela', 'Benidorm', 'Alcoy', 'Elda', 'San Vicente del Raspeig', 'Dénia', 'Villena', 'Petrer', 'Santa Pola', 'Jávea', 'Calpe'] },
  { name: 'Almería', cities: ['Almería', 'Roquetas de Mar', 'El Ejido', 'Níjar', 'Vícar', 'Adra', 'Huércal-Overa', 'Berja'] },
  { name: 'Asturias', cities: ['Gijón', 'Oviedo', 'Avilés', 'Siero', 'Langreo', 'Mieres', 'Castrillón', 'San Martín del Rey Aurelio', 'Cangas del Narcea'] },
  { name: 'Ávila', cities: ['Ávila', 'Arévalo', 'Arenas de San Pedro', 'Las Navas del Marqués', 'Candeleda'] },
  { name: 'Badajoz', cities: ['Badajoz', 'Mérida', 'Don Benito', 'Almendralejo', 'Villanueva de la Serena', 'Zafra', 'Montijo', 'Villafranca de los Barros'] },
  { name: 'Barcelona', cities: ['Barcelona', 'L\'Hospitalet de Llobregat', 'Badalona', 'Terrassa', 'Sabadell', 'Mataró', 'Santa Coloma de Gramenet', 'Sant Cugat del Vallès', 'Cornellà de Llobregat', 'Sant Boi de Llobregat', 'Manresa', 'Rubí', 'Vilanova i la Geltrú', 'Viladecans', 'El Prat de Llobregat', 'Castelldefels', 'Granollers'] },
  { name: 'Burgos', cities: ['Burgos', 'Miranda de Ebro', 'Aranda de Duero', 'Briviesca', 'Medina de Pomar'] },
  { name: 'Cáceres', cities: ['Cáceres', 'Plasencia', 'Navalmoral de la Mata', 'Coria', 'Miajadas', 'Trujillo'] },
  { name: 'Cádiz', cities: ['Cádiz', 'Jerez de la Frontera', 'Algeciras', 'San Fernando', 'El Puerto de Santa María', 'Chiclana de la Frontera', 'Sanlúcar de Barrameda', 'La Línea de la Concepción', 'Puerto Real', 'Arcos de la Frontera', 'San Roque', 'Rota'] },
  { name: 'Cantabria', cities: ['Santander', 'Torrelavega', 'Castro-Urdiales', 'Camargo', 'Piélagos', 'El Astillero', 'Santa Cruz de Bezana', 'Laredo'] },
  { name: 'Castellón', cities: ['Castellón de la Plana', 'Vila-real', 'Burriana', 'La Vall d\'Uixó', 'Vinaròs', 'Benicarló', 'Almassora', 'Onda', 'Benicàssim'] },
  { name: 'Ciudad Real', cities: ['Ciudad Real', 'Puertollano', 'Tomelloso', 'Alcázar de San Juan', 'Valdepeñas', 'Manzanares', 'Daimiel', 'La Solana'] },
  { name: 'Córdoba', cities: ['Córdoba', 'Lucena', 'Puente Genil', 'Montilla', 'Priego de Córdoba', 'Palma del Río', 'Cabra', 'Baena'] },
  { name: 'Cuenca', cities: ['Cuenca', 'Tarancón', 'Quintanar del Rey', 'San Clemente', 'Las Pedroñeras'] },
  { name: 'Girona', cities: ['Girona', 'Figueres', 'Blanes', 'Lloret de Mar', 'Olot', 'Salt', 'Palafrugell', 'Sant Feliu de Guíxols', 'Roses', 'Palamós'] },
  { name: 'Granada', cities: ['Granada', 'Motril', 'Almuñécar', 'Armilla', 'Macarena', 'Baza', 'Loja', 'Maracena', 'Guadix', 'La Zubia'] },
  { name: 'Guadalajara', cities: ['Guadalajara', 'Azuqueca de Henares', 'Alovera', 'El Casar', 'Cabanillas del Campo'] },
  { name: 'Guipúzcoa', cities: ['San Sebastián', 'Irún', 'Errenteria', 'Eibar', 'Zarautz', 'Arrasate-Mondragón', 'Hernani', 'Tolosa', 'Lasarte-Oria'] },
  { name: 'Huelva', cities: ['Huelva', 'Lepe', 'Almonte', 'Moguer', 'Isla Cristina', 'Ayamonte', 'Cartaya', 'Punta Umbría'] },
  { name: 'Huesca', cities: ['Huesca', 'Monzón', 'Barbastro', 'Fraga', 'Jaca', 'Sabiñánigo'] },
  { name: 'Illes Balears', cities: ['Palma de Mallorca', 'Calvià', 'Ibiza', 'Manacor', 'Santa Eulària des Riu', 'Marratxí', 'Ciutadella de Menorca', 'Mahón', 'Llucmajor', 'Inca'] },
  { name: 'Jaén', cities: ['Jaén', 'Linares', 'Andújar', 'Úbeda', 'Martos', 'Alcalá la Real', 'Baeza', 'La Carolina'] },
  { name: 'La Coruña', cities: ['A Coruña', 'Santiago de Compostela', 'Ferrol', 'Narón', 'Oleiros', 'Carballo', 'Arteixo', 'Ribeira', 'Culleredo', 'Ames'] },
  { name: 'La Rioja', cities: ['Logroño', 'Calahorra', 'Arnedo', 'Haro', 'Alfaro', 'Nájera'] },
  { name: 'Las Palmas', cities: ['Las Palmas de Gran Canaria', 'Telde', 'Santa Lucía de Tirajana', 'Arrecife', 'San Bartolomé de Tirajana', 'Puerto del Rosario', 'Arucas', 'Agüimes', 'Gáldar', 'Teguise'] },
  { name: 'León', cities: ['León', 'Ponferrada', 'San Andrés del Rabanedo', 'Villaquilambre', 'Astorga', 'La Bañeza'] },
  { name: 'Lleida', cities: ['Lleida', 'Tàrrega', 'Balaguer', 'Mollerussa', 'La Seu d\'Urgell', 'Cervera'] },
  { name: 'Lugo', cities: ['Lugo', 'Monforte de Lemos', 'Viveiro', 'Vilalba', 'Sarria', 'Ribadeo', 'Burela'] },
  { name: 'Madrid', cities: ['Madrid', 'Móstoles', 'Alcalá de Henares', 'Fuenlabrada', 'Leganés', 'Getafe', 'Alcorcón', 'Torrejón de Ardoz', 'Parla', 'Alcobendas', 'Las Rozas de Madrid', 'San Sebastián de los Reyes', 'Rivas-Vaciamadrid', 'Pozuelo de Alarcón', 'Coslada', 'Valdemoro', 'Majadahonda', 'Collado Villalba', 'Aranjuez', 'Arganda del Rey', 'Boadilla del Monte', 'Pinto', 'Colmenar Viejo'] },
  { name: 'Málaga', cities: ['Málaga', 'Marbella', 'Mijas', 'Fuengirola', 'Vélez-Málaga', 'Torremolinos', 'Benalmádena', 'Estepona', 'Rincón de la Victoria', 'Antequera', 'Alhaurín de la Torre', 'Ronda'] },
  { name: 'Murcia', cities: ['Murcia', 'Cartagena', 'Lorca', 'Molina de Segura', 'Alcantarilla', 'Torre-Pacheco', 'Águilas', 'Cieza', 'Yecla', 'San Javier', 'Mazarrón', 'Totana'] },
  { name: 'Navarra', cities: ['Pamplona', 'Tudela', 'Barañáin', 'Valle de Egüés', 'Burlada', 'Zizur Mayor', 'Estella-Lizarra', 'Tafalla', 'Ansoáin'] },
  { name: 'Ourense', cities: ['Ourense', 'O Barco de Valdeorras', 'Verín', 'O Carballiño', 'Xinzo de Limia', 'Barbadás'] },
  { name: 'Palencia', cities: ['Palencia', 'Aguilar de Campoo', 'Guardo', 'Venta de Baños', 'Villamuriel de Cerrato'] },
  { name: 'Pontevedra', cities: ['Vigo', 'Pontevedra', 'Vilagarcía de Arousa', 'Redondela', 'Cangas', 'Marín', 'Ponteareas', 'A Estrada', 'Lalín', 'Moaña'] },
  { name: 'Salamanca', cities: ['Salamanca', 'Santa Marta de Tormes', 'Béjar', 'Ciudad Rodrigo', 'Villamayor', 'Carbajosa de la Sagrada'] },
  { name: 'Santa Cruz de Tenerife', cities: ['Santa Cruz de Tenerife', 'San Cristóbal de La Laguna', 'Arona', 'Adeje', 'La Orotava', 'Granadilla de Abona', 'Los Realejos', 'Puerto de la Cruz', 'Candelaria', 'Icod de los Vinos'] },
  { name: 'Segovia', cities: ['Segovia', 'Cuéllar', 'El Espinar', 'Real Sitio de San Ildefonso', 'Palazuelos de Eresma'] },
  { name: 'Sevilla', cities: ['Sevilla', 'Dos Hermanas', 'Alcalá de Guadaíra', 'Utrera', 'Mairena del Aljarafe', 'Écija', 'La Rinconada', 'Los Palacios y Villafranca', 'Coria del Río', 'Carmona', 'Morón de la Frontera', 'Lebrija', 'Camas', 'Tomares'] },
  { name: 'Soria', cities: ['Soria', 'Almazán', 'Burgo de Osma', 'Ólvega'] },
  { name: 'Tarragona', cities: ['Tarragona', 'Reus', 'El Vendrell', 'Tortosa', 'Cambrils', 'Salou', 'Calafell', 'Valls', 'Vilaseca', 'Amposta'] },
  { name: 'Teruel', cities: ['Teruel', 'Alcañiz', 'Andorra', 'Calamocha'] },
  { name: 'Toledo', cities: ['Toledo', 'Talavera de la Reina', 'Illescas', 'Seseña', 'Torrijos', 'Quintanar de la Orden', 'Sonseca', 'Fuensalida'] },
  { name: 'Valencia', cities: ['Valencia', 'Torrent', 'Gandia', 'Paterna', 'Sagunto', 'Alzira', 'Mislata', 'Burjassot', 'Ontinyent', 'Aldaia', 'Manises', 'Xirivella', 'Alaquàs', 'Cullera', 'Xàtiva', 'Catarroja', 'Sueca'] },
  { name: 'Valladolid', cities: ['Valladolid', 'Laguna de Duero', 'Medina del Campo', 'Arroyo de la Encomienda', 'Tordesillas', 'Tudela de Duero'] },
  { name: 'Vizcaya', cities: ['Bilbao', 'Barakaldo', 'Getxo', 'Portugalete', 'Santurtzi', 'Basauri', 'Leioa', 'Galdakao', 'Durango', 'Sestao', 'Erandio', 'Amorebieta-Etxano'] },
  { name: 'Zamora', cities: ['Zamora', 'Benavente', 'Toro', 'Morales del Vino'] },
  { name: 'Zaragoza', cities: ['Zaragoza', 'Calatayud', 'Utebo', 'Ejea de los Caballeros', 'Tarazona', 'Caspe', 'Cuarte de Huerva'] },
  { name: 'Ceuta', cities: ['Ceuta'] },
  { name: 'Melilla', cities: ['Melilla'] },
]

export const POSTAL_CODE_TO_PROVINCE: Record<string, string> = {
  '01': 'Álava',
  '02': 'Albacete',
  '03': 'Alicante',
  '04': 'Almería',
  '05': 'Ávila',
  '06': 'Badajoz',
  '07': 'Illes Balears',
  '08': 'Barcelona',
  '09': 'Burgos',
  '10': 'Cáceres',
  '11': 'Cádiz',
  '12': 'Castellón',
  '13': 'Ciudad Real',
  '14': 'Córdoba',
  '15': 'La Coruña',
  '16': 'Cuenca',
  '17': 'Girona',
  '18': 'Granada',
  '19': 'Guadalajara',
  '20': 'Guipúzcoa',
  '21': 'Huelva',
  '22': 'Huesca',
  '23': 'Jaén',
  '24': 'León',
  '25': 'Lleida',
  '26': 'La Rioja',
  '27': 'Lugo',
  '28': 'Madrid',
  '29': 'Málaga',
  '30': 'Murcia',
  '31': 'Navarra',
  '32': 'Ourense',
  '33': 'Asturias',
  '34': 'Palencia',
  '35': 'Las Palmas',
  '36': 'Pontevedra',
  '37': 'Salamanca',
  '38': 'Santa Cruz de Tenerife',
  '39': 'Cantabria',
  '40': 'Segovia',
  '41': 'Sevilla',
  '42': 'Soria',
  '43': 'Tarragona',
  '44': 'Teruel',
  '45': 'Toledo',
  '46': 'Valencia',
  '47': 'Valladolid',
  '48': 'Vizcaya',
  '49': 'Zamora',
  '50': 'Zaragoza',
  '51': 'Ceuta',
  '52': 'Melilla',
}

interface CheckoutModalProps {
  product: Product | null
  initialQuantity?: number
  onClose: () => void
  onSuccess: (product: Product) => void
}

export default function CheckoutModal({
  product,
  initialQuantity = 1,
  onClose,
  onSuccess,
}: CheckoutModalProps) {
  const [confirmed, setConfirmed] = useState(false)
  const [paymentDeclared, setPaymentDeclared] = useState(false)
  const [quantity, setQuantity] = useState(initialQuantity)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [street, setStreet] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [province, setProvince] = useState('')
  const [city, setCity] = useState('')
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS)
  const [selectedPayment, setSelectedPayment] = useState<'bizum' | 'transfer'>('bizum')
  const [copiedIban, setCopiedIban] = useState(false)
  const [copiedBizum, setCopiedBizum] = useState(false)
  const [orderRef, setOrderRef] = useState('')

  const handlePostalCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 5)
    setPostalCode(val)
    if (val.length >= 2) {
      const prefix = val.slice(0, 2)
      const matched = POSTAL_CODE_TO_PROVINCE[prefix]
      if (matched && !province) {
        setProvince(matched)
      }
    }
  }

  const suggestedCities = useMemo(() => {
    if (!province) return []
    const found = SPANISH_PROVINCES.find((p) => p.name.toLowerCase() === province.toLowerCase())
    return found ? found.cities : []
  }, [province])

  const fullAddress = [
    street.trim(),
    postalCode.trim() ? `CP ${postalCode.trim()}` : '',
    city.trim(),
    province.trim(),
  ]
    .filter(Boolean)
    .join(', ')

  const handleConfirmPaymentMade = () => {
    setPaymentDeclared(true)
    if (orderRef) {
      markOrderPaymentConfirmedInDb(orderRef).catch((err) => console.warn('Supabase status update error:', err))
    }
  }

  useEffect(() => {
    if (initialQuantity) {
      setQuantity(initialQuantity)
    }
  }, [initialQuantity, product])

  useEffect(() => {
    setSettings(getSiteSettings())
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && data.settings) {
          setSettings(data.settings)
          saveSiteSettings(data.settings)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (product) {
      trackPixel('InitiateCheckout', {
        id: product.id,
        name: product.name,
        price: product.rawPrice * quantity,
        quantity,
      })
    }
  }, [product?.id])

  if (!product) return null

  const getEffectiveUnitPrice = (p: any): number => {
    if (!p) return 0
    if (typeof p.rawPrice === 'number' && !isNaN(p.rawPrice) && p.rawPrice > 0) return p.rawPrice
    if (typeof p.raw_price === 'number' && !isNaN(p.raw_price) && p.raw_price > 0) return p.raw_price
    if (typeof p.raw_price === 'string') {
      const n = parseFloat(p.raw_price.replace(',', '.'))
      if (!isNaN(n) && n > 0) return n
    }
    if (typeof p.price === 'string') {
      const cleaned = p.price.replace(/[^\d.,]/g, '').replace(',', '.')
      const n = parseFloat(cleaned)
      if (!isNaN(n) && n > 0) return n
    }
    return 0
  }

  const unitPrice = getEffectiveUnitPrice(product)
  const numericTotal = Number((unitPrice * quantity).toFixed(2))
  const totalPrice = numericTotal > 0 ? numericTotal.toFixed(2).replace('.', ',') + ' €' : (product?.price || '0,00 €')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Génération d'une référence de commande unique
    const randomNum = Math.floor(100000 + Math.random() * 900000)
    const ref = `ML-${randomNum}`
    setOrderRef(ref)
    setConfirmed(true)

    // Enregistrer la commande dans le store local & Supabase
    const paymentMethodLabel = selectedPayment === 'bizum' ? 'Bizum' : 'Virement Bancaire'
    const finalOrderTotal = numericTotal > 0 ? numericTotal : (getEffectiveUnitPrice(product) * quantity)
    const newOrder = {
      id: ref,
      customerName: fullName,
      customerEmail: email,
      customerPhone: phone,
      customerAddress: fullAddress,
      productId: product.id,
      productName: `${quantity}x ${product.name}`,
      totalPrice: finalOrderTotal,
      currency: 'EUR',
      paymentMethod: paymentMethodLabel,
      status: (selectedPayment === 'bizum' ? 'En attente de paiement Bizum' : 'En attente de virement') as any,
      createdAt: new Date().toISOString(),
    }
    saveOrder(newOrder)
    createOrderInDb({
      id: ref,
      customerName: fullName,
      customerEmail: email,
      customerPhone: phone,
      customerAddress: fullAddress,
      productId: product.id,
      productName: `${quantity}x ${product.name}`,
      totalPrice: finalOrderTotal,
    }).catch((err) => console.warn('Erreur Supabase sync order:', err))

    onSuccess(product)

    // Événements de conversion pour les pixels publicitaires & Meta CAPI
    trackPixel('Purchase', {
      id: product.id,
      name: product.name,
      price: finalOrderTotal,
      value: finalOrderTotal,
      quantity,
      orderId: ref,
      userData: {
        email,
        phone,
        fullName,
        address: fullAddress,
        city,
        postalCode,
      },
    })
  }

  const handleCopyIban = () => {
    if (settings.bankIban && navigator.clipboard) {
      navigator.clipboard.writeText(settings.bankIban.replace(/\s+/g, ''))
      setCopiedIban(true)
      setTimeout(() => setCopiedIban(false), 2500)
    }
  }

  const handleCopyBizum = () => {
    const phoneToCopy = (settings.bizumPhone || '631 974 038').replace(/\s+/g, '')
    if (navigator.clipboard) {
      navigator.clipboard.writeText(phoneToCopy)
      setCopiedBizum(true)
      setTimeout(() => setCopiedBizum(false), 2500)
    }
  }



  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: confirmed ? '520px' : '460px',
          maxHeight: '92dvh',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <button className="modal-close" onClick={onClose} aria-label="Fermer">✕</button>

        {confirmed ? (
          <div className="space-y-4 text-left">
            <div className="text-center pb-2">
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: '#20251f',
                  color: '#b8c8a6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  margin: '0 auto 12px',
                }}
              >
                ✓
              </div>
              <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', margin: '0 0 6px', color: '#20251f' }}>
                ¡Pedido Registrado con Éxito!
              </h3>
              <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
                Gracias <strong>{fullName || 'Estimado/a Cliente/a'}</strong>. Su pedido de{' '}
                <strong>{quantity}x {product.name}</strong> ({totalPrice}) está registrado pendiente de pago por {selectedPayment === 'bizum' ? 'Bizum' : 'transferencia bancaria inmediata'}.
              </p>
            </div>

            {selectedPayment === 'bizum' ? (
              /* Encadré Bizum */
              <div
                style={{
                  background: '#ffffff',
                  border: '2px solid #00a5a2',
                  borderRadius: '10px',
                  padding: '18px',
                  boxShadow: '0 4px 14px rgba(0, 165, 162, 0.12)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid #e0f2f1', paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>📱</span>
                    <strong style={{ fontSize: '14px', color: '#00838f', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Pago por Bizum
                    </strong>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#00695c', background: '#e0f2f1', padding: '3px 10px', borderRadius: '6px' }}>
                    Importe : {totalPrice}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                  <div style={{ background: '#e0f7fa', padding: '10px 12px', borderRadius: '6px', borderLeft: '4px solid #00acc1' }}>
                    <span style={{ fontSize: '10.5px', textTransform: 'uppercase', color: '#00838f', display: 'block', fontWeight: 700 }}>
                      Teléfono Bizum oficial
                    </span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                      <strong style={{ fontSize: '20px', letterSpacing: '0.06em', color: '#006064' }}>
                        {settings.bizumPhone || '631 974 038'}
                      </strong>
                      <button
                        type="button"
                        onClick={handleCopyBizum}
                        style={{
                          background: copiedBizum ? '#00796b' : '#00838f',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '5px 12px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          transition: '0.2s',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {copiedBizum ? '✓ ¡Copiado!' : 'Copiar Número'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#777', display: 'block' }}>
                      Titular / Destinatario Bizum
                    </span>
                    <strong style={{ color: '#20251f', fontSize: '13.5px' }}>
                      {settings.bizumHolder || 'MARIA LLANOS GALLEGO MEDINA'}
                    </strong>
                  </div>

                  <div>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#777', display: 'block' }}>
                      Concepto obligatorio a poner en Bizum
                    </span>
                    <strong style={{ fontSize: '15px', color: '#991b1b', letterSpacing: '0.05em' }}>
                      {orderRef}
                    </strong>
                  </div>

                  <p style={{ fontSize: '11px', color: '#555', fontStyle: 'italic', margin: '4px 0 0', borderTop: '1px dashed #e5e5e5', paddingTop: '8px' }}>
                    💡 Abra su app bancaria (CaixaBank, Santander, BBVA, etc.), pulse en <strong>Bizum</strong>, envíe <strong>{totalPrice}</strong> al <strong>{(settings.bizumPhone || '631 974 038').replace(/\s+/g, '')}</strong> indicando el concepto <strong>{orderRef}</strong>.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Alerta Transferencia Inmediata Requerida */}
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1.5px solid #ef4444',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                  }}
                >
                  <span style={{ fontSize: '22px', lineHeight: 1 }}>⚡</span>
                  <div>
                    <strong style={{ fontSize: '12.5px', color: '#991b1b', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Aviso Importante: Transferencia Inmediata Requerida
                    </strong>
                    <p style={{ margin: '3px 0 0', fontSize: '11.5px', color: '#7f1d1d', lineHeight: '1.45' }}>
                      Al emitir el pago desde su app bancaria o banca online, seleccione la opción <strong>&quot;Transferencia Inmediata&quot;</strong>. Así recibiremos los fondos en segundos y su pedido será preparado y enviado hoy mismo en 24/48h.
                    </p>
                  </div>
                </div>

                {/* Encadré Coordonnées Bancaires */}
                <div
                  style={{
                    background: '#ffffff',
                    border: '2px solid #b8c8a6',
                    borderRadius: '8px',
                    padding: '16px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 'bold', color: '#20251f' }}>
                      ⚡ Transferencia Inmediata
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#166534', background: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
                      Importe : {totalPrice}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                    <div style={{ background: '#f0fdf4', padding: '8px 10px', borderRadius: '4px', borderLeft: '3px solid #166534' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#166534', display: 'block', fontWeight: 700 }}>
                        Modalidad obligatoria
                      </span>
                      <strong style={{ fontSize: '12.5px', color: '#14532d' }}>
                        ⚡ Transferencia Inmediata (Acreditación al instante)
                      </strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#888', display: 'block' }}>
                        Referencia obligatoria a indicar
                      </span>
                      <strong style={{ fontSize: '15px', color: '#991b1b', letterSpacing: '0.05em' }}>
                        {orderRef}
                      </strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#888', display: 'block' }}>
                        Beneficiario / Titular de la cuenta
                      </span>
                      <strong style={{ color: '#20251f' }}>{settings.bankAccountHolder}</strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#888', display: 'block' }}>
                        Banco
                      </span>
                      <span style={{ color: '#20251f' }}>{settings.bankName}</span>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#888' }}>
                          IBAN
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyIban}
                          style={{
                            background: copiedIban ? '#166534' : '#20251f',
                            color: '#f4f0e9',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '2px 8px',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: '0.2s',
                          }}
                        >
                          {copiedIban ? '✓ ¡Copiado!' : 'Copiar IBAN'}
                        </button>
                      </div>
                      <strong style={{ fontFamily: 'monospace', fontSize: '12px', color: '#20251f', letterSpacing: '0.05em', wordBreak: 'break-all' }}>
                        {settings.bankIban}
                      </strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#888', display: 'block' }}>
                        Código BIC / SWIFT
                      </span>
                      <strong style={{ fontFamily: 'monospace', fontSize: '12px', color: '#20251f' }}>
                        {settings.bankSwift}
                      </strong>
                    </div>

                    {settings.bankInstructions && (
                      <p style={{ fontSize: '11px', color: '#555', fontStyle: 'italic', margin: '4px 0 0', borderTop: '1px dashed #e5e5e5', paddingTop: '6px' }}>
                        💡 {settings.bankInstructions}
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Transmission du Justificatif de Virement / Bizum */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '12px 14px',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '16px' }}>📄</span>
                <strong style={{ fontSize: '12px', color: '#1e293b' }}>
                  ¿Cómo enviar su justificante de pago?
                </strong>
              </div>
              <p style={{ fontSize: '11px', color: '#475569', margin: '0 0 10px', lineHeight: '1.4' }}>
                Una vez realizado el pago ({selectedPayment === 'bizum' ? 'Bizum' : 'transferencia'}), envíenos su comprobante o captura con su referencia <strong>{orderRef}</strong>:
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <a
                  href={`mailto:${settings.contactEmail || 'contacto@mercatum-shop.app'}?subject=${encodeURIComponent(`Justificante de pago - Pedido ${orderRef} - ${fullName}`)}&body=${encodeURIComponent(`Hola,\n\nAdjunto el comprobante de pago (${selectedPayment === 'bizum' ? 'Bizum' : 'transferencia'}) para el pedido ${orderRef} por un importe de ${totalPrice}.\n\nNombre: ${fullName}\nTeléfono: ${phone}\nDirección de entrega: ${fullAddress}\n\nGracias.`)}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    background: '#1e293b',
                    color: '#ffffff',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    textDecoration: 'none',
                    flex: '1',
                    minWidth: '160px',
                  }}
                >
                  ✉️ Enviar por correo electrónico
                </a>
                {settings.contactPhone && (
                  <a
                    href={`https://wa.me/${settings.contactPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hola, aquí tiene mi comprobante de pago (${selectedPayment === 'bizum' ? 'Bizum' : 'transferencia'}) para el pedido ${orderRef} (${fullName} - ${totalPrice}).`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      background: '#166534',
                      color: '#ffffff',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      textDecoration: 'none',
                      flex: '1',
                      minWidth: '160px',
                    }}
                  >
                    💬 Enviar por WhatsApp
                  </a>
                )}
              </div>
            </div>

            <p style={{ fontSize: '11px', color: '#777', textAlign: 'center', margin: '8px 0 0' }}>
              📦 Su paquete será preparado y enviado inmediatamente tras la validación de su pago.
            </p>

            {paymentDeclared ? (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1.5px solid #22c55e',
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign: 'center',
                  marginTop: '12px',
                  marginBottom: '16px',
                  boxShadow: '0 4px 12px rgba(34, 197, 94, 0.15)',
                  animation: 'modalPop 0.25s ease-out',
                }}
              >
                <div style={{ fontSize: '30px', marginBottom: '6px' }}>🎉</div>
                <strong style={{ fontSize: '15px', color: '#14532d', display: 'block', marginBottom: '6px' }}>
                  ¡Transferencia Notificada con Éxito!
                </strong>
                <p style={{ fontSize: '12px', color: '#166534', margin: '0 0 12px', lineHeight: '1.5' }}>
                  Hemos registrado su confirmación para el pedido <strong>{orderRef}</strong>. Nuestro equipo verificará la acreditación bancaria y procederemos al embalaje y envío express de su pedido.
                </p>

                {settings.contactPhone && (
                  <a
                    href={`https://wa.me/${settings.contactPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hola, acabo de realizar la transferencia para mi pedido ${orderRef} (${fullName} - ${totalPrice}). Adjunto el comprobante bancario.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      background: '#166534',
                      color: '#ffffff',
                      padding: '10px 16px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      textDecoration: 'none',
                      width: '100%',
                      marginBottom: '10px',
                      boxShadow: '0 2px 6px rgba(22, 101, 52, 0.25)',
                    }}
                  >
                    💬 Enviar justificante por WhatsApp ahora
                  </a>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    background: '#20251f',
                    color: '#f4f0e9',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '10px 20px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    cursor: 'pointer',
                    width: '100%',
                  }}
                >
                  Entendido / Finalizar y Cerrar
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', paddingTop: '12px', paddingBottom: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleConfirmPaymentMade}
                  style={{
                    background: '#166534',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '14px 20px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    cursor: 'pointer',
                    width: '100%',
                    boxShadow: '0 4px 14px rgba(22, 101, 52, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: '16px' }}>✓</span>
                  <span>Confirmo que he realizado el pago</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    background: 'transparent',
                    color: '#666',
                    border: 'none',
                    fontSize: '11px',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                >
                  Cerrar y pagar más tarde
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            <span className="modal-eyebrow">Pago Seguro Oficial · Bizum o Transferencia Inmediata</span>
            <h3 className="modal-title">Comprar este artículo</h3>

            <div className="modal-product-summary">
              {isVideoUrl(product.image) ? (
                <video
                  src={product.image}
                  className="w-16 h-16 rounded object-cover flex-shrink-0"
                  muted
                  playsInline
                  autoPlay
                  loop
                />
              ) : (
                <img
                  src={product.image}
                  alt={product.name}
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).src = '/placeholder.svg'
                  }}
                />
              )}
              <div className="flex-1">
                <h4>{product.name}</h4>
                <p>{product.type}</p>
                <div className="flex items-center justify-between mt-2">
                  <div className="quantity-selector">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      -
                    </button>
                    <span>{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                  <span className="modal-product-price">{totalPrice}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Nombre y Apellidos *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ej: Carlos García"
                />
              </div>

              <div className="form-group">
                <label>Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ej: carlos.garcia@gmail.com"
                />
              </div>

              <div className="form-group">
                <label>Teléfono</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej: +34 612 34 56 78"
                />
              </div>

              {/* Dirección (Calle y número) */}
              <div className="form-group">
                <label>Calle, número y piso / puerta *</label>
                <input
                  type="text"
                  required
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Ej: Calle Gran Vía 28, 3º B"
                />
              </div>

              {/* Código Postal & Provincia en 2 columnas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '10px' }}>
                <div className="form-group">
                  <label>Código Postal *</label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    value={postalCode}
                    onChange={handlePostalCodeChange}
                    placeholder="Ej: 28013"
                  />
                </div>

                <div className="form-group">
                  <label>Provincia *</label>
                  <select
                    required
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    style={{
                      border: '1px solid #d8d1c6',
                      background: '#fff',
                      padding: '10px 12px',
                      fontSize: '13px',
                      borderRadius: '2px',
                      color: province ? '#20251f' : '#777',
                      width: '100%',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">Seleccione provincia...</option>
                    {SPANISH_PROVINCES.map((p) => (
                      <option key={p.name} value={p.name} style={{ color: '#20251f' }}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ciudad / Municipio */}
              <div className="form-group">
                <label>Ciudad / Municipio *</label>
                <input
                  type="text"
                  required
                  list="city-suggestions"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={province ? `Ej: ${suggestedCities[0] || 'Madrid'}` : 'Ej: Madrid, Barcelona, Valencia...'}
                />
                <datalist id="city-suggestions">
                  {suggestedCities.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div className="form-group">
                <label>Seleccione su método de pago</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                  {/* Option 1: BIZUM (Recommandé) */}
                  <button
                    type="button"
                    onClick={() => setSelectedPayment('bizum')}
                    style={{
                      border: selectedPayment === 'bizum' ? '2px solid #00a5a2' : '1px solid #d1d5db',
                      background: selectedPayment === 'bizum' ? '#e0f7fa' : '#ffffff',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: selectedPayment === 'bizum' ? '#006064' : '#1f2937' }}>
                        📱 Bizum
                      </span>
                      <span style={{ fontSize: '9px', fontWeight: 'bold', background: '#00838f', color: '#ffffff', padding: '1px 6px', borderRadius: '4px' }}>
                        Recomendado
                      </span>
                    </div>
                    <span style={{ fontSize: '10px', color: '#00695c' }}>
                      Instantáneo · 631 974 038
                    </span>
                  </button>

                  {/* Option 2: Transferencia Inmediata */}
                  <button
                    type="button"
                    onClick={() => setSelectedPayment('transfer')}
                    style={{
                      border: selectedPayment === 'transfer' ? '2px solid #166534' : '1px solid #d1d5db',
                      background: selectedPayment === 'transfer' ? '#f0fdf4' : '#ffffff',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: selectedPayment === 'transfer' ? '#14532d' : '#1f2937' }}>
                        ⚡ Transferencia
                      </span>
                      <span style={{ fontSize: '9px', fontWeight: 'bold', background: '#166534', color: '#ffffff', padding: '1px 6px', borderRadius: '4px' }}>
                        Bancaria
                      </span>
                    </div>
                    <span style={{ fontSize: '10px', color: '#166534' }}>
                      Banco a banco · IBAN
                    </span>
                  </button>
                </div>

                {selectedPayment === 'bizum' ? (
                  <div
                    style={{
                      background: '#e0f7fa',
                      border: '1px solid #80deea',
                      borderRadius: '6px',
                      padding: '9px 12px',
                      marginTop: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#006064', fontWeight: 'bold', fontSize: '11.5px', marginBottom: '2px' }}>
                      <span>📱</span>
                      <span>Pago Express por Bizum al {settings.bizumPhone || '631 974 038'}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#00838f', lineHeight: '1.45', display: 'block' }}>
                      Beneficiaria : <strong>{settings.bizumHolder || 'MARIA LLANOS GALLEGO MEDINA'}</strong>. Al confirmar, verá el resumen y el concepto exacto a indicar para preparar su envío en 24/48h.
                    </span>
                  </div>
                ) : (
                  <div
                    style={{
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                      borderRadius: '6px',
                      padding: '9px 12px',
                      marginTop: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b45309', fontWeight: 'bold', fontSize: '11.5px', marginBottom: '2px' }}>
                      <span>🛡️</span>
                      <span>Transferencia Bancaria Inmediata</span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#92400e', lineHeight: '1.45', display: 'block' }}>
                      Operación directa banco a banco con máxima protección. Al confirmar el pedido, obtendrá el IBAN oficial y la referencia para emitir la transferencia.
                    </span>
                  </div>
                )}
              </div>

              <button type="submit" className="button-confirm-buy" style={{ marginTop: '8px' }}>
                Confirmar mi pedido ({totalPrice}) →
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
