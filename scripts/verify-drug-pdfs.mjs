import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('BLOCKER: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in .env.local.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKET_NAME = 'research-pdfs';

async function main() {
  console.log('--- Verifying Supabase Drug PDFs ---');

  const { data: drugs, error: drugsError } = await supabase
    .from('drugs')
    .select('id, name, slug, pdf_storage_path, pdf_status, category_id, categories(name, slug)')
    .order('sort_order');

  if (drugsError) {
    console.error(`Failed to fetch drugs from database: ${drugsError.message}`);
    process.exit(1);
  }

  console.log(`Found ${drugs.length} drug records in database.`);

  const report = [];
  let validCount = 0;
  let missingStorageCount = 0;
  let missingDbCount = 0;

  for (const drug of drugs) {
    const categoryName = drug.categories?.name || 'Unknown';
    const targetPath = drug.pdf_storage_path;

    if (!targetPath) {
      report.push({
        Drug: drug.name,
        Category: categoryName,
        Status: 'MISSING_PATH_IN_DB',
        Path: '(none)',
        StorageObject: 'NO',
        SignedUrl: 'NO',
      });
      missingDbCount++;
      continue;
    }

    // Verify storage object
    const dir = path.dirname(targetPath).replace(/\\/g, '/');
    const fileName = path.basename(targetPath);

    const { data: files, error: listError } = await supabase.storage.from(BUCKET_NAME).list(dir, {
      search: fileName,
    });

    const storageObj = (files || []).find((f) => f.name.toLowerCase() === fileName.toLowerCase());

    // Test signed URL generation
    let signedUrlOk = false;
    if (storageObj) {
      const { data: signedData, error: signError } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(targetPath, 60);

      if (!signError && signedData?.signedUrl) {
        signedUrlOk = true;
      }
    }

    if (storageObj && signedUrlOk && drug.pdf_status === 'uploaded') {
      validCount++;
      report.push({
        Drug: drug.name,
        Category: categoryName,
        Status: 'VERIFIED',
        Path: targetPath,
        StorageObject: 'YES',
        SignedUrl: 'YES',
      });
    } else {
      missingStorageCount++;
      report.push({
        Drug: drug.name,
        Category: categoryName,
        Status: !storageObj ? 'NOT_IN_STORAGE' : 'VERIFICATION_ERROR',
        Path: targetPath,
        StorageObject: storageObj ? 'YES' : 'NO',
        SignedUrl: signedUrlOk ? 'YES' : 'NO',
      });
    }
  }

  console.table(report);

  console.log('\n=========================================');
  console.log('VERIFICATION SUMMARY:');
  console.log(`  Total Drugs:               ${drugs.length}`);
  console.log(`  Verified & Ready:          ${validCount}`);
  console.log(`  Missing in DB Path:        ${missingDbCount}`);
  console.log(`  Missing in Storage Bucket: ${missingStorageCount}`);
  console.log('=========================================');

  if (validCount === drugs.length && drugs.length === 19) {
    console.log('All 19 approved drug PDFs verified in Supabase Storage and database!');
    process.exit(0);
  } else {
    console.warn(`Only ${validCount}/${drugs.length} drug PDFs are verified.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
