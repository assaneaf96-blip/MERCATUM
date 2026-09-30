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
  'media_1790758404390.jpg',
  'media_1790758421442.jpg',
  'media_1790758440177.jpg',
  'media_1790758467199.jpg',
  'media_1790758504388.jpg',
  'media_1790758524527.jpg',
  'media_1790758548405.jpg'
];

async function main() {
  console.log('📸 Chargement des 7 images Peach 2 Pro Max...');
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

  const description = `El dispositivo profesional de reducción de vello Peach 2 Pro Max de LUNA FOREO es un tratamiento corporal de depilación de grado clínico para todo tipo de piel y uso unisex. Cuenta con una ventana de tratamiento de tamaño profesional que permite cubrir una mayor área para realizar tratamientos más rápidos. Clínicamente probado, elimina hasta el 90% del vello en un mes, reduciendo la cantidad, longitud y densidad del vello, incluso después de interrumpir su uso. El 95% de los usuarios observa resultados visibles en dos semanas, con un crecimiento del vello más lento y reducido, y el 97% reporta menos vello encarnado. El dispositivo se activa y registra mediante una aplicación móvil. Para su uso, se debe rasurar la zona a tratar, aplicar un gel específico para preparar la piel y seleccionar la intensidad deseada. La ventana de tratamiento se coloca sobre el área a tratar, utilizando un modo de deslizamiento para zonas grandes o pulsaciones para áreas pequeñas. Tras el tratamiento, se recomienda limpiar la ventana con un paño húmedo.
MODELO: F2693
REFERENCIA: 001026334300071
EAN: 7350120792693
CARACTERÍSTICAS GENERALES
Género
Unisex
Tipo de piel
Todo tipo de piel
Tipo de producto
Tratamiento corporales`;

  const product = {
    id: 'dispositivo-profesional-de-reduccion-de-vello-peach-2-pro-max-foreo',
    name: 'Dispositivo Profesional De Reducción De Vello Peach™ 2 Pro Max Foreo',
    category: 'Cuidado & Rituales Corporales',
    type: 'Tratamiento corporales',
    price: '410,00 €',
    raw_price: 410.00,
    tag: 'Oferta -40%',
    description,
    image: base64Images[0] || '',
    images: base64Images,
    media: base64Images.map(url => ({ url, type: 'image' })),
    rating: 5.0,
    reviews_count: 22,
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

  console.log('✅ Dispositivo Peach 2 Pro Max inséré avec succès avec 7 photos dans Supabase !');
}

main().catch(err => {
  console.error('❌ Erreur fatale:', err.message);
  process.exit(1);
});
