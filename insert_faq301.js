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
  'media_1790759327660.jpg'
];

async function main() {
  console.log('📸 Chargement de l\'image FAQ 301...');
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

  console.log(`\n${base64Images.length} image(s) chargée(s).`);

  const description = `Masajeador de cuero cabelludo unisex que utiliza tecnología de luz LED roja y masaje T-Sonic para estimular los folículos pilosos y fortalecer el cabello. Facilita la llegada de oxígeno y nutrientes al cuero cabelludo. Cuenta con varios niveles de intensidad y tratamientos preprogramados para un cuidado personalizado. Es resistente al agua, recargable y fácil de limpiar.
MODELO: F0273
REFERENCIA: 001026385300079
EAN: 7640260120273
CARACTERÍSTICAS GENERALES
Género
Unisex
Tipo de producto
Dispositivos capilares`;

  const product = {
    id: 'masajeador-led-de-cuero-cabelludo-faq-301-blue-emerald',
    name: 'Masajeador Led de Cuero Cabelludo FAQ™ 301 Blue Emerald',
    category: 'Belleza & cabello',
    type: 'Dispositivos capilares',
    price: '180,00 €',
    raw_price: 180.00,
    tag: 'Nuevo',
    description,
    image: base64Images[0] || '',
    images: base64Images,
    media: base64Images.map(url => ({ url, type: 'image' })),
    rating: 5.0,
    reviews_count: 16,
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

  console.log('✅ Masajeador FAQ 301 inséré avec succès dans Supabase !');
}

main().catch(err => {
  console.error('❌ Erreur fatale:', err.message);
  process.exit(1);
});
