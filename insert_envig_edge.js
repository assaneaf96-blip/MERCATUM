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
  'media_1790761142642.jpg',
  'media_1790761167789.jpg',
  'media_1790761167805.jpg',
  'media_1790761167803.jpg',
  'media_1790761168229.jpg',
  'media_1790761193643.jpg'
];

async function main() {
  console.log('📸 Chargement des 6 images Envig Edge...');
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

  const description = `Dispositivo portátil que utiliza radiofrecuencia fraccional no invasiva para el rejuvenecimiento de la piel, emitiendo energía térmica en pulsos dirigidos a la epidermis y capas profundas para estimular la renovación celular, tensar la piel y fomentar la producción de colágeno. Se conecta a la red eléctrica para su alimentación y se aplica sobre el rostro dividido en áreas específicas durante el tratamiento facial.
MODELO: ENVIG EDGE
REFERENCIA: 001026385101618
EAN: 7290018007938
CARACTERÍSTICAS GENERALES
Alimentación
Red
GARANTÍA
Garantía
3 años`;

  const product = {
    id: 'dispositivo-portatil-envig-edge-tripollar-blanco',
    name: 'Dispositivo Portátil Envig Edge Tripollar - Blanco',
    category: 'Cuidado & Rituales Corporales',
    type: 'Dispositivos faciales',
    price: '350,00 €',
    raw_price: 350.00,
    tag: 'Nuevo',
    description,
    image: base64Images[0] || '',
    images: base64Images,
    media: base64Images.map(url => ({ url, type: 'image' })),
    rating: 5.0,
    reviews_count: 19,
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

  console.log('✅ Dispositivo Envig Edge inséré avec succès avec 6 photos dans Supabase !');
}

main().catch(err => {
  console.error('❌ Erreur fatale:', err.message);
  process.exit(1);
});
