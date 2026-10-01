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
  'media_1790761932228.jpg',
  'media_1790761944478.jpg',
  'media_1790761965113.jpg',
  'media_1790762023327.jpg',
  'media_1790762031640.jpg'
];

async function main() {
  console.log('📸 Chargement des 5 images Máscara FAQ 202...');
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

  const description = `Terapia avanzada de rejuvenecimiento para garantizar resultados profesionales desde casa
La máscara facial es un dispositivo inalámbrico para tratamientos antienvejecimiento que utiliza ocho luces LED de espectro completo, incluyendo luz infrarroja cercana, con 600 puntos de luz distribuidos uniformemente para terapia de rejuvenecimiento. Está fabricada en silicona óptica ultraligera y antibacteriana, con un diseño ergonómico que se adapta al contorno del rostro y cuenta con una apertura para los ojos que protege de la luz LED. Proporciona revitalización no invasiva de la piel, mejora líneas de expresión, manchas solares, arrugas y flacidez, reduce imperfecciones y equilibra el tono cutáneo. Ofrece múltiples longitudes de onda LED para tratar diversas preocupaciones de la piel, es recargable mediante USB y no requiere reemplazo de piezas.
MODELO: F0174
REFERENCIA: 001026385101063
EAN: 7640260120174
CARACTERÍSTICAS GENERALES
Género
Unisex
Tipo de piel
Todo tipo de piel
Tipo de producto
Dispositivos faciales
Formato viaje
Sí
Tipo de artículo
Tratamiento`;

  const product = {
    id: 'mascara-faq-202-silicona-luces-led-nir',
    name: 'Máscara FAQ™ 202 de silicona: 7 luces LED + NIR, inalámbrico y antienvejecimiento',
    category: 'Cuidado & Rituales Corporales',
    type: 'Dispositivos faciales',
    price: '460,00 €',
    raw_price: 460.00,
    tag: 'Nuevo',
    description,
    image: base64Images[0] || '',
    images: base64Images,
    media: base64Images.map(url => ({ url, type: 'image' })),
    rating: 5.0,
    reviews_count: 24,
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

  console.log('✅ Máscara FAQ™ 202 insérée avec succès avec 5 photos dans Supabase !');
}

main().catch(err => {
  console.error('❌ Erreur fatale:', err.message);
  process.exit(1);
});
