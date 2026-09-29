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

// Selected key distinct images
const imageFiles = [
  'media_1790696898669.jpg', // Main overall view
  'media_1790697110614.jpg', // Dimensions scheme
  'media_1790697119415.jpg', // Fabric texture detail
  'media_1790696983019.jpg', // Module side view
  'media_1790696983164.jpg', // Back view
  'media_1790697093707.jpg', // Connectors detail
  'media_1790697093719.jpg'  // Single seat module
];

async function main() {
  console.log('Reading selected Alice Sofa images...');
  const base64Images = [];

  for (const filename of imageFiles) {
    const fullPath = path.join(mediaDir, filename);
    if (fs.existsSync(fullPath)) {
      const buffer = fs.readFileSync(fullPath);
      const mimeType = 'image/jpeg';
      const b64 = `data:${mimeType};base64,${buffer.toString('base64')}`;
      base64Images.push(b64);
      console.log(`Loaded ${filename} (${(buffer.length / 1024).toFixed(1)} KB)`);
    }
  }

  if (base64Images.length === 0) {
    console.error('No images found!');
    process.exit(1);
  }

  const name = 'Sofá rinconera de 5 plazas con 2 chaiselongue Alice - Beige';
  const id = 'sofa-rinconera-5-plazas-2-chaiselongue-alice-beige';

  const description = `Sofá rinconera de 5 plazas compuesto por dos chaiselongues. Tapizado en un suave tejido de poliéster con acabado en ribete y estructura de madera. Un sofá amplio y cómodo de líneas rectas.

Medidas: 415 (ancho) x 87 (fondo) x 105 (alto) cm
Peso: 203 kg

MODELO: ALICE 001
REFERENCIA: 001012810970827
EAN: 2401937928067

CARACTERÍSTICAS GENERALES
Requiere montaje: No
Colección: Alice
Material principal: Tapizado
Composición tejido: 100% poliester
Tratamiento antimanchas: No

CARACTERÍSTICAS ESPECÍFICAS
Número de plazas: 5 Plazas
Suspensión: Cincha
Detalle partes:
- 'Patas': Número de componentes: 1
- 'Tapicería': 100% Poliester
- 'Estructura': Número de componentes: 1, 100% Madera
- 'Asiento': Número de componentes: 4, 100% Poliuretano recubierto de fibra
- 'Respaldo': Número de componentes: 4, 100% Fibra de poliéster siliconada
- 'Reposabrazos': Número de componentes: 2, 100% Poliuretano recubierto de fibra

OTROS DATOS DE INTERÉS
Recomendaciones: Por favor, asegúrese de que todos los accesos al domicilio tienen las medidas necesarias para la entrega de la mercancía. En caso de ser necesario desmontaje y montaje del artículo, poner una grúa o cualquier otra gestión adicional requerida para poder realizar la entrega, los costes de estos servicios serán asumidos por el cliente.
Conviene Saber: El fondo de la chaiselongue es de 180 cm.
Observaciones: Este producto es personalizado y no admite anulación, cambio o devolución.
Producto personalizado: Sí

PESOS Y MEDIDAS DEL EMBALAJE
Medidas: 4150 (ancho) x1800 (alto) x4150 (fondo) MM`;

  const product = {
    id,
    name,
    category: 'SOFAS',
    type: 'Sofás',
    price: '2970,00 €',
    raw_price: 2970.00,
    description,
    image: base64Images[0],
    images: base64Images,
    media: base64Images,
    tag: 'Oferta',
    rating: 5,
    reviews_count: 18,
    created_at: new Date().toISOString()
  };

  console.log(`Inserting product ${id}...`);
  const { data, error } = await supabase.from('products').upsert([product]);

  if (error) {
    console.error('Error inserting product:', error);
    process.exit(1);
  } else {
    console.log('SUCCESSFULLY_INSERTED_SOFA_ALICE_COMPACT');
  }
}

main().catch(err => {
  console.error('Unhandled exception:', err);
  process.exit(1);
});
