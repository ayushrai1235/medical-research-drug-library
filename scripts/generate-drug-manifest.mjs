import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const drugsDir = path.join(rootDir, 'drugs');

export const APPROVED_DRUGS = [
  // 1. Biguanides
  { category: 'Biguanides', categorySlug: 'biguanides', drug: 'Metformin', drugSlug: 'metformin' },

  // 2. DPP-4 Inhibitors
  { category: 'DPP-4 Inhibitors', categorySlug: 'dpp-4-inhibitors', drug: 'Sitagliptin', drugSlug: 'sitagliptin' },
  { category: 'DPP-4 Inhibitors', categorySlug: 'dpp-4-inhibitors', drug: 'Vildagliptin', drugSlug: 'vildagliptin' },
  { category: 'DPP-4 Inhibitors', categorySlug: 'dpp-4-inhibitors', drug: 'Linagliptin', drugSlug: 'linagliptin' },
  { category: 'DPP-4 Inhibitors', categorySlug: 'dpp-4-inhibitors', drug: 'Saxagliptin', drugSlug: 'saxagliptin' },

  // 3. TZDs (Thiazolidinediones)
  { category: 'TZDs (Thiazolidinediones)', categorySlug: 'tzd-thiazolidinediones', drug: 'Pioglitazone', drugSlug: 'pioglitazone' },

  // 4. Sulfonylureas
  { category: 'Sulfonylureas', categorySlug: 'sulfonylureas', drug: 'Glimepiride', drugSlug: 'glimepiride' },
  { category: 'Sulfonylureas', categorySlug: 'sulfonylureas', drug: 'Glipizide', drugSlug: 'glipizide' },
  { category: 'Sulfonylureas', categorySlug: 'sulfonylureas', drug: 'Glibenclamide', drugSlug: 'glibenclamide' },
  { category: 'Sulfonylureas', categorySlug: 'sulfonylureas', drug: 'Gliclazide', drugSlug: 'gliclazide' },

  // 5. Alpha-glucosidase Inhibitors
  { category: 'Alpha-glucosidase Inhibitors', categorySlug: 'alpha-glucosidase-inhibitors', drug: 'Acarbose', drugSlug: 'acarbose' },
  { category: 'Alpha-glucosidase Inhibitors', categorySlug: 'alpha-glucosidase-inhibitors', drug: 'Miglitol', drugSlug: 'miglitol' },
  { category: 'Alpha-glucosidase Inhibitors', categorySlug: 'alpha-glucosidase-inhibitors', drug: 'Voglibose', drugSlug: 'voglibose' },

  // 6. SGLT-2 Inhibitors
  { category: 'SGLT-2 Inhibitors', categorySlug: 'sglt-2-inhibitors', drug: 'Empagliflozin', drugSlug: 'empagliflozin' },
  { category: 'SGLT-2 Inhibitors', categorySlug: 'sglt-2-inhibitors', drug: 'Canagliflozin', drugSlug: 'canagliflozin' },
  { category: 'SGLT-2 Inhibitors', categorySlug: 'sglt-2-inhibitors', drug: 'Dapagliflozin', drugSlug: 'dapagliflozin' },

  // 7. Non-Sulphonylureas
  { category: 'Non-Sulphonylureas', categorySlug: 'non-sulphonylureas', drug: 'Nateglinide', drugSlug: 'nateglinide' },
  { category: 'Non-Sulphonylureas', categorySlug: 'non-sulphonylureas', drug: 'Repaglinide', drugSlug: 'repaglinide' },
  { category: 'Non-Sulphonylureas', categorySlug: 'non-sulphonylureas', drug: 'Semaglutide', drugSlug: 'semaglutide' },
];

function getAllPdfFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  function recurse(currentDir) {
    const list = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const item of list) {
      const fullPath = path.join(currentDir, item.name);
      if (item.isDirectory()) {
        recurse(fullPath);
      } else if (item.isFile() && item.name.toLowerCase().endsWith('.pdf')) {
        results.push(fullPath);
      }
    }
  }

  recurse(dir);
  return results;
}

export function generateManifest() {
  if (!fs.existsSync(drugsDir)) {
    console.error(`Error: Local drugs directory not found at: ${drugsDir}`);
    return { success: false, items: [], summary: { total: APPROVED_DRUGS.length, matched: 0, missing: APPROVED_DRUGS.length, ambiguous: 0, duplicate: 0 } };
  }

  const allPdfs = getAllPdfFiles(drugsDir);
  const manifestItems = [];
  const assignedFiles = new Set();

  let matchedCount = 0;
  let missingCount = 0;
  let ambiguousCount = 0;
  let duplicateCount = 0;

  for (const item of APPROVED_DRUGS) {
    const targetStoragePath = `drugs/${item.categorySlug}/${item.drug}.pdf`;

    // Filter matching PDF candidates
    const drugNormalized = item.drug.toLowerCase().replace(/[^a-z0-9]/g, '');
    const catSlugNormalized = item.categorySlug.toLowerCase().replace(/[^a-z0-9]/g, '');

    const candidates = allPdfs.filter((filePath) => {
      const fileName = path.basename(filePath, path.extname(filePath)).toLowerCase().replace(/[^a-z0-9]/g, '');
      const parentDir = path.basename(path.dirname(filePath)).toLowerCase().replace(/[^a-z0-9]/g, '');

      const nameMatch = fileName === drugNormalized;
      const catMatch = parentDir.includes(catSlugNormalized) || catSlugNormalized.includes(parentDir);

      return nameMatch && catMatch;
    });

    // Fallback if not matched in parent dir: strict name match anywhere
    let matchedPath = null;
    let status = 'missing';
    let localRelativePath = null;
    let fileSize = 0;

    if (candidates.length === 1) {
      matchedPath = candidates[0];
      status = 'matched';
    } else if (candidates.length > 1) {
      status = 'ambiguous';
      ambiguousCount++;
    } else {
      // Look for filename matches anywhere in drugsDir
      const looseCandidates = allPdfs.filter((filePath) => {
        const fileName = path.basename(filePath, path.extname(filePath)).toLowerCase().replace(/[^a-z0-9]/g, '');
        return fileName === drugNormalized;
      });

      if (looseCandidates.length === 1) {
        matchedPath = looseCandidates[0];
        status = 'matched';
      } else if (looseCandidates.length > 1) {
        status = 'ambiguous';
        ambiguousCount++;
      } else {
        status = 'missing';
        missingCount++;
      }
    }

    if (matchedPath) {
      if (assignedFiles.has(matchedPath)) {
        status = 'duplicate';
        duplicateCount++;
      } else {
        assignedFiles.add(matchedPath);
        matchedCount++;
      }
      localRelativePath = path.relative(rootDir, matchedPath).replace(/\\/g, '/');
      const stats = fs.statSync(matchedPath);
      fileSize = stats.size;
    }

    manifestItems.push({
      category: item.category,
      categorySlug: item.categorySlug,
      drug: item.drug,
      drugSlug: item.drugSlug,
      localRelativePath,
      fileSizeBytes: fileSize,
      targetStoragePath,
      mappingStatus: status,
      uploadStatus: 'pending',
    });
  }

  const summary = {
    total: APPROVED_DRUGS.length,
    matched: matchedCount,
    missing: missingCount,
    ambiguous: ambiguousCount,
    duplicate: duplicateCount,
    allFilesFound: allPdfs.length,
  };

  return { success: missingCount === 0 && ambiguousCount === 0 && duplicateCount === 0, items: manifestItems, summary };
}

// CLI Execution
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  console.log('--- Generating Drug PDF Manifest ---');
  const result = generateManifest();

  console.log('\nManifest Items:');
  console.table(
    result.items.map((i) => ({
      Category: i.category,
      Drug: i.drug,
      Status: i.mappingStatus,
      'Local File': i.localRelativePath || '(none)',
      Size: i.fileSizeBytes ? `${(i.fileSizeBytes / 1024 / 1024).toFixed(2)} MB` : '0',
      'Target Path': i.targetStoragePath,
    }))
  );

  console.log('\nSummary:');
  console.log(`  Total approved drugs: ${result.summary.total}`);
  console.log(`  Matched:             ${result.summary.matched}`);
  console.log(`  Missing:             ${result.summary.missing}`);
  console.log(`  Ambiguous:           ${result.summary.ambiguous}`);
  console.log(`  Duplicate:           ${result.summary.duplicate}`);
  console.log(`  Total PDFs found:    ${result.summary.allFilesFound}`);

  // Write manifest to JSON file
  const outputPath = path.join(rootDir, 'drug-manifest.json');
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`\nSaved manifest to: ${path.relative(rootDir, outputPath)}`);

  if (!result.success) {
    console.error('\nManifest generation completed with unresolved files.');
    process.exit(1);
  } else {
    console.log('\nAll 19 approved drug PDFs matched uniquely and successfully!');
    process.exit(0);
  }
}
