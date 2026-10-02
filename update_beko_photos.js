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

const targetId = 'beko-ba312c-inverter-split-wifi';

const rawUploadedFiles = [
  'C:/Users/PC/.gemini/antigravity/brain/b72b250d-1068-4067-84ef-a75df07a73da/.user_uploaded/media_1790958145001.png',
  'C:/Users/PC/.gemini/antigravity/brain/b72b250d-1068-4067-84ef-a75df07a73da/.user_uploaded/media_1790958131938.png',
  'C:/Users/PC/.gemini/antigravity/brain/b72b250d-1068-4067-84ef-a75df07a73da/.user_uploaded/media_1790958164692.png',
  'C:/Users/PC/.gemini/antigravity/brain/b72b250d-1068-4067-84ef-a75df07a73da/.user_uploaded/media_1790958164627.png',
  'C:/Users/PC/.gemini/antigravity/brain/b72b250d-1068-4067-84ef-a75df07a73da/.user_uploaded/media_1790958164656.png'
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
    const filename = `beko_ba312c_${i + 1}.png`;
    const destPath = path.join(destDir, filename);
    const buf = fs.readFileSync(src);
    fs.writeFileSync(destPath, buf);

    const webPath = `/uploads/aires/${filename}`;
    localPaths.push(webPath);
    console.log(`Copied ${filename} (${buf.length} bytes) -> ${webPath}`);
  }

  // 1. Update public/products.json
  const jsonPath = path.join(__dirname, 'public', 'products.json');
  const products = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const prodIndex = products.findIndex(p => p.id === targetId);

  if (prodIndex === -1) {
    console.error(`Product ${targetId} not found in public/products.json!`);
  } else {
    products[prodIndex].image = localPaths[0];
    products[prodIndex].images = localPaths;
    products[prodIndex].media = localPaths.map(url => ({ url, type: 'image' }));
    fs.writeFileSync(jsonPath, JSON.stringify(products, null, 2), 'utf8');
    console.log(`✓ Updated public/products.json for ${targetId}`);
  }

  // 2. Update Supabase
  const updatePayload = {
    image: localPaths[0],
    images: localPaths,
    media: localPaths.map(url => ({ url, type: 'image' }))
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

  console.log('Finished updating Beko BA312C images.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
