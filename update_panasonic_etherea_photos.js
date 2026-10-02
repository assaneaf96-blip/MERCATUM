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

const targetId = 'panasonic-etherea-z35xke-nanoex-inverter-split-wifi';

const rawUploadedFiles = [
  'C:/Users/PC/.gemini/antigravity/brain/b72b250d-1068-4067-84ef-a75df07a73da/.user_uploaded/media_1790973799541.jpg',
  'C:/Users/PC/.gemini/antigravity/brain/b72b250d-1068-4067-84ef-a75df07a73da/.user_uploaded/media_1790973820140.jpg'
];

async function main() {
  const destDir = path.join(__dirname, 'public', 'uploads', 'aires');
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const localPaths = [];

  for (let i = 0; i < rawUploadedFiles.length; i++) {
    const src = rawUploadedFiles[i];
    if (!fs.existsSync(src)) {
      throw new Error(`File does not exist: ${src}`);
    }
    const filename = `panasonic_etherea_z35_${i + 1}.jpg`;
    const destPath = path.join(destDir, filename);
    const buf = fs.readFileSync(src);
    fs.writeFileSync(destPath, buf);
    console.log(`Saved ${filename} (${buf.length} bytes) to ${destPath}`);
    localPaths.push(`/uploads/aires/${filename}`);
  }

  // Update public/products.json
  const productsJsonPath = path.join(__dirname, 'public', 'products.json');
  const products = JSON.parse(fs.readFileSync(productsJsonPath, 'utf8'));
  const prodIndex = products.findIndex(p => p.id === targetId);
  if (prodIndex === -1) {
    throw new Error(`Product ${targetId} not found in products.json`);
  }

  products[prodIndex].image = localPaths[0];
  products[prodIndex].images = localPaths;
  products[prodIndex].media = localPaths.map(u => ({ url: u, type: 'image' }));

  fs.writeFileSync(productsJsonPath, JSON.stringify(products, null, 2), 'utf8');
  console.log(`Updated public/products.json for ${targetId}`);

  // Update Supabase
  console.log('Updating Supabase...');
  const { data, error } = await supabase
    .from('products')
    .update({
      image: localPaths[0],
      images: localPaths,
      media: localPaths.map(u => ({ url: u, type: 'image' }))
    })
    .eq('id', targetId)
    .select('id, name, image, images');

  if (error) {
    console.error('Supabase update error:', error);
  } else {
    console.log('Supabase updated successfully:', data);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
