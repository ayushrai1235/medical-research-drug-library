import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { generateManifest } from './generate-drug-manifest.mjs';

dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const isReplace = process.argv.includes('--replace');

if (!supabaseUrl || !serviceKey) {
  console.error('BLOCKER: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in .env.local.');
  console.error('Cannot proceed with upload without valid Supabase service credentials.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKET_NAME = 'research-pdfs';

async function ensureBucketExists() {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    throw new Error(`Failed to list storage buckets: ${error.message}`);
  }

  const found = buckets.find((b) => b.id === BUCKET_NAME || b.name === BUCKET_NAME);
  if (!found) {
    console.log(`Creating private bucket '${BUCKET_NAME}'...`);
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: false,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: ['application/pdf'],
    });
    if (createError) {
      throw new Error(`Failed to create bucket '${BUCKET_NAME}': ${createError.message}`);
    }
  }
}

async function verifyObjectExists(storagePath, expectedSize) {
  const dir = path.dirname(storagePath).replace(/\\/g, '/');
  const fileName = path.basename(storagePath);

  const { data: files, error } = await supabase.storage.from(BUCKET_NAME).list(dir, {
    search: fileName,
  });

  if (error) {
    return { verified: false, error: error.message };
  }

  const match = (files || []).find((f) => f.name.toLowerCase() === fileName.toLowerCase());
  if (!match) {
    return { verified: false, error: 'Object not found in storage listing' };
  }

  // If size is provided in metadata, verify size reasonable
  if (expectedSize && match.metadata?.size && match.metadata.size !== expectedSize) {
    return { verified: false, error: `Size mismatch: expected ${expectedSize}, got ${match.metadata.size}` };
  }

  return { verified: true, object: match };
}

async function main() {
  console.log('--- Supabase PDF Upload Script ---');
  console.log(`Target Bucket: ${BUCKET_NAME} (Private)`);
  console.log(`Mode: ${isReplace ? 'REPLACE (overwrite existing)' : 'SAFE (skip existing objects)'}`);

  await ensureBucketExists();

  const manifestResult = generateManifest();
  if (!manifestResult.success) {
    console.error('Error: Manifest contains unresolved or missing files. Aborting upload.');
    process.exit(1);
  }

  const results = {
    total: manifestResult.items.length,
    uploaded: 0,
    skipped: 0,
    failed: 0,
    missing: 0,
    ambiguous: 0,
  };

  for (const item of manifestResult.items) {
    console.log(`\nProcessing [${item.category}] ${item.drug}...`);

    if (item.mappingStatus !== 'matched' || !item.localRelativePath) {
      console.warn(`  Skipping: mapping status is '${item.mappingStatus}'`);
      if (item.mappingStatus === 'missing') results.missing++;
      if (item.mappingStatus === 'ambiguous') results.ambiguous++;
      continue;
    }

    const localFullPath = path.join(rootDir, item.localRelativePath);
    if (!fs.existsSync(localFullPath)) {
      console.error(`  Error: Local file missing at ${localFullPath}`);
      results.missing++;
      continue;
    }

    const fileBuffer = fs.readFileSync(localFullPath);
    const targetPath = item.targetStoragePath;

    // Check if file already exists in Storage
    const existingCheck = await verifyObjectExists(targetPath, fileBuffer.length);

    if (existingCheck.verified && !isReplace) {
      console.log(`  Already exists in Storage: ${targetPath}. Skipping (use --replace to overwrite).`);
      results.skipped++;

      // Ensure database has correct path and status
      await supabase
        .from('drugs')
        .update({
          pdf_storage_path: targetPath,
          pdf_status: 'uploaded',
          updated_at: new Date().toISOString(),
        })
        .eq('slug', item.drugSlug);

      continue;
    }

    // Upload
    console.log(`  Uploading ${item.drug} (${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB) -> ${targetPath}...`);
    const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(targetPath, fileBuffer, {
      contentType: 'application/pdf',
      upsert: isReplace,
    });

    if (uploadError) {
      console.error(`  Upload failed: ${uploadError.message}`);
      results.failed++;
      await supabase
        .from('drugs')
        .update({ pdf_status: 'failed', updated_at: new Date().toISOString() })
        .eq('slug', item.drugSlug);
      continue;
    }

    // Verify object in Storage
    console.log(`  Verifying uploaded object in Storage...`);
    const verifyResult = await verifyObjectExists(targetPath, fileBuffer.length);
    if (!verifyResult.verified) {
      console.error(`  Verification failed: ${verifyResult.error}`);
      results.failed++;
      await supabase
        .from('drugs')
        .update({ pdf_status: 'failed', updated_at: new Date().toISOString() })
        .eq('slug', item.drugSlug);
      continue;
    }

    // Update database record
    console.log(`  Updating database record for ${item.drug}...`);
    const { error: dbError } = await supabase
      .from('drugs')
      .update({
        pdf_storage_path: targetPath,
        pdf_status: 'uploaded',
        updated_at: new Date().toISOString(),
      })
      .eq('slug', item.drugSlug);

    if (dbError) {
      console.error(`  Failed to update database record: ${dbError.message}`);
      results.failed++;
    } else {
      console.log(`  Successfully uploaded and verified ${item.drug}!`);
      results.uploaded++;
    }
  }

  console.log('\n=========================================');
  console.log('UPLOAD SUMMARY:');
  console.log(`  Total Drugs: ${results.total}`);
  console.log(`  Uploaded:    ${results.uploaded}`);
  console.log(`  Skipped:     ${results.skipped}`);
  console.log(`  Failed:      ${results.failed}`);
  console.log(`  Missing:     ${results.missing}`);
  console.log(`  Ambiguous:   ${results.ambiguous}`);
  console.log('=========================================');

  if (results.failed > 0 || results.missing > 0 || results.ambiguous > 0) {
    console.error('Upload process finished with errors or unresolved items.');
    process.exit(1);
  } else {
    console.log('All drug PDFs are securely stored and verified in Supabase Storage!');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal upload error:', err);
  process.exit(1);
});

