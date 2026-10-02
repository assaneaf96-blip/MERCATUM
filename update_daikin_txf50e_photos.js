process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { setGlobalDispatcher, Agent } = require('undici');
try {
  setGlobalDispatcher(new Agent({ connect: { rejectUnauthorized: false } }));
} catch (e) {}

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://suwesvmsbfxxtfyepsdv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_72bo4uT3XsLcuN1NwXtDlw_Y0f-M-p-';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const targetId = 'daikin-sensira-txf50e-inverter-split-gran-capacidad';

const rawUploadedFile = 'C:/Users/PC/.gemini/antigravity/brain/b72b250d-1068-4067-84ef-a75df07a73da/.user_uploaded/media_1790961927737.jpg';

async function main() {
  const destDir = path.join(__dirname, 'public', 'uploads', 'aires');
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  if (!fs.existsSync(rawUploadedFile)) {
    throw new Error(`File does not exist: ${rawUploadedFile}`);
  }

  const filename = 'daikin_txf50e_1.jpg';
  const destPath = path.join(destDir, filename);
  const buf = fs.readFileSync(rawUploadedFile);
  fs.writeFileSync(destPath, buf);

  const mainPath = `/uploads/aires/${filename}`;
  console.log(`Copied ${filename} (${buf.length} bytes) -> ${mainPath}`);

  const localGallery = [
    mainPath,
    '/uploads/aires/daikin_txf35e_2.webp',
    '/uploads/aires/daikin_txf35e_3.webp',
    '/uploads/aires/daikin_txf25e_1.jpg',
    '/uploads/aires/daikin_txf35e_4.webp'
  ];

  // 1. Update public/products.json
  const jsonPath = path.join(__dirname, 'public', 'products.json');
  const products = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const prodIndex = products.findIndex(p => p.id === targetId);

  if (prodIndex === -1) {
    console.error(`Product ${targetId} not found in public/products.json!`);
  } else {
    products[prodIndex].image = localGallery[0];
    products[prodIndex].images = localGallery;
    products[prodIndex].media = localGallery.map(url => ({ url, type: 'image' }));
    fs.writeFileSync(jsonPath, JSON.stringify(products, null, 2), 'utf8');
    console.log(`✓ Updated public/products.json for ${targetId}`);
  }

  // 2. Update Supabase
  const updatePayload = {
    image: localGallery[0],
    images: localGallery,
    media: localGallery.map(url => ({ url, type: 'image' }))
  };

  const { data, error } = await supabase
    .from('products')
    .update(updatePayload)
    .eq('id', targetId)
    .select('id, name, image, images');

  if (error) {
    console.error('Update error in Supabase:', error);
  } else {
    console.log(`✓ Successfully updated ${targetId} in Supabase!`);
    console.log('Returned data:', data);
  }

  console.log('Finished updating Daikin Sensira TXF50E images.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
