process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { setGlobalDispatcher, Agent } = require('undici');
setGlobalDispatcher(new Agent({ connect: { rejectUnauthorized: false } }));

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://suwesvmsbfxxtfyepsdv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_72bo4uT3XsLcuN1NwXtDlw_Y0f-M-p-';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const mediaDir = 'C:/Users/PC/.gemini/antigravity/brain/b72b250d-1068-4067-84ef-a75df07a73da/.user_uploaded';

// 5 photos du Sofá Modena BoConcept (uploadées le 30/09/2026 à 01:22)
const imageFiles = [
  'media_1790724095528.jpg',  // Vue principale face (fond blanc)
  'media_1790724128600.jpg',  // Vue salon ambiance
  'media_1790724128648.jpg',  // Texture tissu bouclé
  'media_1790724128645.jpg',  // Vue arrière
  'media_1790724128653.jpg',  // Vue 3/4
];

async function main() {
  console.log('📸 Lecture des images Modena...');
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

  const description = `Formas orgánicas y líneas minimalistas se reúnen en una expresión contemporánea e informal. Modena añade un aire acogedor que llama a disfrutar del descanso con su excelente comodidad. Los elegantes toques de diseño elevan la expresión general y, junto a su mullido confort, aseguran una butaca que pronto se convertirá en tu lugar de relajación favorito.

Tapizada en tela LAZIO bouclé (34% acrílico, 24% algodón, 14% lana, 12% viscosa, 12% poliéster y 4% lino) tiene la apariencia de una tela de bucle. Acércate para examinar su detallada composición y su variada mezcla de colores y aléjate para admirar la manera en que interactúa con la luz y las sombras. Es imposible resistirse a tocar esta exquisita tela, misma que embellece cualquier silueta aportándole una sensación de cobijo e inigualable suavidad. Tela diseñada por la reconocida firma italiana de textiles Mario Sirtori.

Estructura interior de madera maciza, contrachapado y tablero de partículas, asiento espuma de 30 kgs/m3. Patas de acero lacadas negro mate.

Medidas: 218 (ancho) x 91 (fondo) x 73 (alto) cm | Peso: 62 Kg
Modelo: MODENA | Referencia: 001013120300101 | EAN: 7427255533528

Diseñado por Morten Georgsen. BoConcept — más de 300 tiendas en más de 60 países.

Conviene Saber: Altura del asiento: 42 cm · Altura del reposabrazos: 65 cm · Altura de las patas: 16 cm

Recomendaciones: Limpieza en seco o aplica nuestro producto BoConcept.
NOTA: Este producto es personalizado y no admite anulación, cambio o devolución.`;

  const product = {
    id: 'sofa-modena-boconcept-beige',
    name: 'Sofá Modena de 3 plazas Lazio bouclé BoConcept - Beige',
    category: 'SOFAS',
    type: 'Sofá 3 plazas · Tela Lazio bouclé · BoConcept · Diseño danés',
    price: '1.520,00 €',
    raw_price: 1520.00,
    tag: 'Oferta',
    description,
    image: base64Images[0] || '',
    images: base64Images,
    media: base64Images.map(url => ({ url, type: 'image' })),
    rating: 4.9,
    reviews_count: 18,
  };

  console.log('\n🛋️  Insertion dans Supabase...');
  const { data, error } = await supabase
    .from('products')
    .upsert(product, { onConflict: 'id' });

  if (error) {
    console.error('❌ Erreur Supabase:', error.message);
    process.exit(1);
  }

  console.log('✅ Sofá Modena inséré avec succès !');
}

main().catch(err => {
  console.error('❌ Erreur fatale:', err.message);
  process.exit(1);
});
