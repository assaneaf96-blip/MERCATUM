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

const imageFiles = [
  'media_1790697959460.jpg',
  'media_1790698261899.jpg', // Dimensions scheme 1
  'media_1790698261906.jpg', // Dimensions scheme 2
  'media_1790698210421.jpg',
  'media_1790698233261.jpg',
  'media_1790697991399.jpg',
  'media_1790697991403.jpg',
  'media_1790697991415.jpg',
  'media_1790697991417.jpg'
];

async function main() {
  console.log('Reading all Harvey Sofa images including newly uploaded photos...');
  const base64Images = [];

  for (const filename of imageFiles) {
    const fullPath = path.join(mediaDir, filename);
    if (fs.existsSync(fullPath)) {
      const buffer = fs.readFileSync(fullPath);
      const mimeType = 'image/jpeg';
      const b64 = `data:${mimeType};base64,${buffer.toString('base64')}`;
      base64Images.push(b64);
      console.log(`Loaded ${filename} (${(buffer.length / 1024).toFixed(1)} KB)`);
    } else {
      console.error(`File missing: ${filename}`);
    }
  }

  if (base64Images.length === 0) {
    console.error('No images found!');
    process.exit(1);
  }

  const name = 'Sofá rinconera con terminal derecho Harvey El Corte Inglés - Cemento';
  const id = 'sofa-rinconera-terminal-derecho-harvey-el-corte-ingles-cemento';

  const description = `Sofá rinconera con terminal que cuenta con estructura de madera de pino y aglomerado, patas metálicas y tapicería en tejido de poliéster. El tejido es resistente al peeling, al uso y a la abrasión, además de tener alta resistencia al desgaste por la incidencia de la luz. Presenta un diseño contemporáneo con líneas redondeadas y reposabrazos refinados. Incluye formas mullidas y grandes almohadones en los respaldos para mayor confort, con cojines y almohadones desenfundables.

Medidas: 295 (ancho) x 200 (fondo) x 102 (alto) cm
Peso: 100 kg

MODELO: HARVEY 001
REFERENCIA: 001012810918446
EAN: 2401782454315

CARACTERÍSTICAS GENERALES
Requiere montaje: Sí
Colección: Harvey
Material principal: Tapizado

CARACTERÍSTICAS ESPECÍFICAS
Número de plazas: 5 Plazas
Detalle partes:
- 'Patas': Número de componentes: 1 (100% Metal)
- 'Tapicería': 100% Poliéster
- 'Estructura': Número de componentes: 1 (100% Madera de pino y aglomerado)
- 'Asiento': Número de componentes: 4 (100% Poliuretano recubierto de fibra)
- 'Respaldo': Número de componentes: 4 (100% Fibra hueca siliconada)
- 'Reposabrazos': Número de componentes: 2 (100% Poliuretano recubierto de fibra)

OTROS DATOS DE INTERÉS
Recomendaciones: Por favor, asegúrese de que todos los accesos al domicilio tienen las medidas necesarias para la entrega de la mercancía. En caso de ser necesario desmontaje y montaje del artículo, poner una grúa o cualquier otra gestión adicional requerida para poder realizar la entrega, los costes de estos servicios serán asumidos por el cliente.
Sabías Que:
* La resistencia al peeling se mide en una escala del 1 al 5, siendo el 1 poco resistente.
** Para conocer la durabilidad de un sofá tapizado en tela, los tejidos son sometidos al Test Martindale. A partir de 30-50 ciclos se considera resistencia alta.
* La resistencia de un tejido a la incidencia de la luz se mide en una escala creciente.
Conviene Saber:
La altura del respaldo con cojín es de 102 cm, sin cojín es de 87 cm. El fondo del terminal es de 200 cm, el resto de los asientos tienen un fondo de 102 cm.
Altura del asiento: 44 cm. Altura del brazo: 60 cm. Ancho del brazo: 13 cm.
Este sofá es desenfundable.
Observaciones: Este producto es personalizado y no admite anulación, cambio o devolución.

PESOS Y MEDIDAS DEL EMBALAJE
Medidas: 1020 (ancho) x870 (alto) x2950 (fondo) MM`;

  const product = {
    id,
    name,
    category: 'SOFAS',
    type: 'Sofás',
    price: '1170,00 €',
    raw_price: 1170.00,
    description,
    image: base64Images[0],
    images: base64Images,
    media: base64Images,
    tag: 'Oferta',
    rating: 5,
    reviews_count: 24,
    created_at: new Date().toISOString()
  };

  console.log(`Updating product ${id} with 9 photos...`);
  const { data, error } = await supabase.from('products').upsert([product]);

  if (error) {
    console.error('Error updating product:', error);
    process.exit(1);
  } else {
    console.log('SUCCESSFULLY_UPDATED_SOFA_HARVEY_WITH_NEW_PHOTOS');
  }
}

main().catch(err => {
  console.error('Unhandled exception:', err);
  process.exit(1);
});
