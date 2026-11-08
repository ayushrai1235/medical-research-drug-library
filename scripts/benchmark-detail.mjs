import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

const BUCKET_NAME = 'research-pdfs';

async function runBenchmark() {
  console.log('--- Benchmarking Drug Detail Page Server Operations ---');

  const slug = 'metformin';
  const runs = 5;
  const dbTimes = [];
  const logTimes = [];
  const signTimes = [];
  const totalSequentialTimes = [];

  for (let i = 0; i < runs; i++) {
    // 1. Drug Query
    const t0 = performance.now();
    const { data: drug, error: drugError } = await supabase
      .from('drugs')
      .select('id, name, slug, description, pdf_storage_path, pdf_status, is_active, categories(id, name, slug)')
      .eq('slug', slug)
      .single();
    const t1 = performance.now();
    const dbTime = t1 - t0;
    dbTimes.push(dbTime);

    if (drugError || !drug) {
      console.error('Drug not found:', drugError);
      return;
    }

    // 2. Blocking Activity Event
    const t2 = performance.now();
    await supabase.from('activity_events').insert({
      action: 'drug_opened',
      drug_id: drug.id,
      display_name_snapshot: 'Benchmark User',
      details: {
        drugName: drug.name,
        slug: drug.slug,
        category: drug.categories?.name,
        benchmark: true,
      },
    });
    const t3 = performance.now();
    const logTime = t3 - t2;
    logTimes.push(logTime);

    // 3. Storage Signed URL
    const t4 = performance.now();
    const { data: signData, error: signError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(drug.pdf_storage_path, 600);
    const t5 = performance.now();
    const signTime = t5 - t4;
    signTimes.push(signTime);

    const total = dbTime + logTime + signTime;
    totalSequentialTimes.push(total);

    console.log(`Run ${i + 1}: DB = ${dbTime.toFixed(1)}ms | Log = ${logTime.toFixed(1)}ms | SignedURL = ${signTime.toFixed(1)}ms | Total Sequential = ${total.toFixed(1)}ms`);
  }

  const avg = (arr) => (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1);
  console.log('\n--- BASELINE SUMMARY (Averages over 5 runs) ---');
  console.log(`Drug Query Avg:       ${avg(dbTimes)} ms`);
  console.log(`Activity Log Avg:     ${avg(logTimes)} ms (Currently BLOCKING in SSR)`);
  console.log(`Signed URL Avg:       ${avg(signTimes)} ms`);
  console.log(`Total Sequential Avg: ${avg(totalSequentialTimes)} ms`);
  console.log(`Potential with after(): ${(parseFloat(avg(dbTimes)) + parseFloat(avg(signTimes))).toFixed(1)} ms (${(parseFloat(avg(logTimes)) / parseFloat(avg(totalSequentialTimes)) * 100).toFixed(0)}% reduction in SSR wait time)`);
}

runBenchmark().catch(console.error);
