import { createClient } from '@supabase/supabase-js'
import { setGlobalDispatcher, Agent as UndiciAgent } from 'undici'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
try { setGlobalDispatcher(new UndiciAgent({ connect: { rejectUnauthorized: false } })) } catch {}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const JSON_FILE = path.join(__dirname, 'public', 'products.json')

const supabaseUrl = 'https://suwesvmsbfxxtfyepsdv.supabase.co'
const supabaseAnonKey = 'sb_publishable_72bo4uT3XsLcuN1NwXtDlw_Y0f-M-p-'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
  console.log('🔄 Démarrage de la synchronisation complète Supabase...')
  const batchSize = 100
  let allData = []
  let from = 0
  let hasMore = true

  while (hasMore) {
    const to = from + batchSize - 1
    const res = await supabase
      .from('products')
      .select('id, name, category, type, price, raw_price, image, tag, rating, reviews_count')
      .order('id', { ascending: true })
      .range(from, to)

    if (res.error) {
      console.error(`Erreur sur range ${from}-${to}:`, res.error.message)
      break
    }

    if (res.data && res.data.length > 0) {
      const mapped = res.data.map(d => {
        let img = (d.image || '').trim()
        if (!img || img.startsWith('data:')) {
          img = `/api/product-image?id=${encodeURIComponent(d.id)}&index=0`
        }
        return {
          id: d.id,
          name: d.name,
          category: d.category,
          type: d.type || '',
          price: d.price,
          raw_price: Number(d.raw_price) || 0,
          image: img,
          tag: d.tag || '',
          rating: Number(d.rating) || 5,
          reviews_count: Number(d.reviews_count) || 1,
          images: []
        }
      })
      allData.push(...mapped)
      console.log(`  ✓ Chargé ${from}-${to} (total en cours: ${allData.length})`)
      from += res.data.length
      if (res.data.length < batchSize) {
        hasMore = false
      }
    } else {
      hasMore = false
    }
  }

  console.log(`💾 Écriture de ${allData.length} produits dans public/products.json...`)
  fs.writeFileSync(JSON_FILE, JSON.stringify(allData, null, 2), 'utf8')
  console.log(`✅ Synchronisation terminée avec succès ! (${allData.length} produits enregistrés)`)
}

run().catch(err => {
  console.error('Erreur:', err)
  process.exit(1)
})
