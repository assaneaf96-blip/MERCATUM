process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { setGlobalDispatcher, Agent } = require('undici');
try { setGlobalDispatcher(new Agent({ connect: { rejectUnauthorized: false } })); } catch {}

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://suwesvmsbfxxtfyepsdv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_72bo4uT3XsLcuN1NwXtDlw_Y0f-M-p-';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const mediaDir = 'C:/Users/PC/.gemini/antigravity/brain/b72b250d-1068-4067-84ef-a75df07a73da/.user_uploaded';

const imageFiles = [
  'media_1790757414856.jpg',
  'media_1790757431847.jpg',
  'media_1790757452567.jpg',
  'media_1790757462574.jpg',
  'media_1790757470205.jpg'
];

async function main() {
  console.log('📸 Chargement des images FAQ Set...');
  const base64Images = [];

  for (const filename of imageFiles) {
    const fullPath = path.join(mediaDir, filename);
    if (fs.existsSync(fullPath)) {
      const buffer = fs.readFileSync(fullPath);
      const b64 = `data:image/jpeg;base64,${buffer.toString('base64')}`;
      base64Images.push(b64);
      console.log(`  ✅ ${filename} (${(buffer.length / 1024).toFixed(1)} KB)`);
    } else {
      console.warn(`  ⚠️  Fichier introuvable: ${filename}`);
    }
  }

  console.log(`\n${base64Images.length} images chargées.`);

  const description = `El set de rejuvenecimiento facial incluye un dispositivo que combina radiofrecuencia tensora y electroestimulación muscular para reducir arrugas. Contiene una máscara de silicona LED inalámbrica con ocho luces LED de espectro completo, incluyendo infrarrojos NIR, que ayudan a revitalizar la piel. Incluye una base de miel de Manuka con 17 aminoácidos antienvejecimiento y parches de micropunciones para la frente y el contorno de los ojos. Todos los dispositivos son recargables mediante USB y están fabricados con materiales de alta calidad. El conjunto ha sido clínicamente probado para mejorar la firmeza y elasticidad de la piel, igualar el tono y reducir arrugas y acné.
MODELO: F0372
REFERENCIA: 001026385101766
EAN: 7640260120372
CARACTERÍSTICAS GENERALES
Tipo de producto
Dispositivos faciales`;

  const product = {
    id: 'set-de-rejuvenecimiento-facial-faq',
    name: 'Set de rejuvenecimiento facial FAQ',
    category: 'Cuidado & Rituales Corporales',
    type: 'Dispositivos faciales',
    price: '810,00 €',
    raw_price: 810.00,
    tag: 'Oferta -30%',
    description,
    image: base64Images[0] || '',
    images: base64Images,
    media: base64Images.map(url => ({ url, type: 'image' })),
    rating: 5.0,
    reviews_count: 14,
    created_at: new Date().toISOString()
  };

  console.log('\n✨ Insertion dans Supabase...');
  const { data, error } = await supabase
    .from('products')
    .upsert(product, { onConflict: 'id' });

  if (error) {
    console.error('❌ Erreur Supabase:', error.message);
    process.exit(1);
  }

  console.log('✅ Set de rejuvenecimiento facial FAQ inséré avec succès dans Supabase !');
}

main().catch(err => {
  console.error('❌ Erreur fatale:', err.message);
  process.exit(1);
});
