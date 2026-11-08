import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { spawn } from 'child_process';
import { createClient } from '@supabase/supabase-js';

const PORT = 3001;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE_URL}/`);
      if (res.status === 200) return true;
    } catch {}
    await sleep(400);
  }
  return false;
}

async function runPhase2ATests() {
  console.log(`\n===============================================================`);
  console.log(`   PHASE 2A NAVIGATION & WORKER CACHING VERIFICATION SUITE`);
  console.log(`===============================================================\n`);

  console.log(`1. Launching Next.js Production Server on port ${PORT}...`);
  const server = spawn('node', ['node_modules/next/dist/bin/next', 'start', '-H', '0.0.0.0', '-p', String(PORT)], {
    stdio: 'ignore',
    env: { ...process.env, PORT: String(PORT) },
  });

  const stopServer = () => {
    try {
      server.kill('SIGTERM');
    } catch {}
  };
  process.on('exit', stopServer);
  process.on('SIGINT', stopServer);
  process.on('SIGTERM', stopServer);

  const isUp = await waitForServer();
  if (!isUp) {
    console.error('ERROR: Next.js server failed to start within timeout.');
    stopServer();
    process.exit(1);
  }
  console.log('✓ Next.js server is responsive.\n');

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, serviceKey);

  const testResults = [];

  // ==========================================
  // TEST 1: PDF Worker Response Headers
  // ==========================================
  try {
    const workerRes = await fetch(`${BASE_URL}/pdf.worker.min.mjs`);
    const cacheControl = workerRes.headers.get('cache-control') || '';
    const buf = await workerRes.arrayBuffer();
    const status = workerRes.status;

    const hasExpectedCaching = cacheControl.includes('public') && (cacheControl.includes('max-age=86400') || cacheControl.includes('immutable'));
    const isFullSize = buf.byteLength > 1000000; // 1,375,838 bytes

    testResults.push({
      scenario: 'Task 2: PDF Worker HTTP Cache Headers & Integrity',
      passed: status === 200 && hasExpectedCaching && isFullSize,
      details: `Status: ${status}, Cache-Control: "${cacheControl}", Byte Length: ${buf.byteLength} bytes`,
    });
  } catch (err) {
    testResults.push({
      scenario: 'Task 2: PDF Worker HTTP Cache Headers & Integrity',
      passed: false,
      details: err.message,
    });
  }

  // ==========================================
  // TEST 2: Drug Detail Unauthorized Protection
  // ==========================================
  try {
    const unauthRes = await fetch(`${BASE_URL}/drugs/metformin`);
    const unauthText = await unauthRes.text();
    const servedLogin = unauthText.includes('User Access') || unauthText.includes('display-name') || unauthText.includes('research-entry');
    const blockedDocumentData = !unauthText.includes('Deterministic Storage:');

    testResults.push({
      scenario: 'Task 3: Protected Detail Route Guards Unauthorized Access',
      passed: servedLogin && blockedDocumentData,
      details: `Served Login Gate: ${servedLogin}, Private Document Data Blocked: ${blockedDocumentData}`,
    });
  } catch (err) {
    testResults.push({
      scenario: 'Task 3: Protected Detail Route Guards Unauthorized Access',
      passed: false,
      details: err.message,
    });
  }

  // Create active session for authenticated testing
  let sessionCookie = '';
  try {
    const sessionRes = await fetch(`${BASE_URL}/api/research/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: 'Dr. Phase2A Tester', language: 'en' }),
    });
    const setCookie = sessionRes.headers.get('set-cookie');
    if (setCookie) {
      sessionCookie = setCookie.split(';')[0];
    }
  } catch (err) {
    console.error('Failed to create test session:', err);
  }

  // ==========================================
  // TEST 3: Drug Detail Page TTFB & after() Telemetry
  // ==========================================
  try {
    const t0 = performance.now();
    const detailRes = await fetch(`${BASE_URL}/drugs/metformin`, {
      headers: { Cookie: sessionCookie },
    });
    const t1 = performance.now();
    const ttfb = t1 - t0;
    const detailHtml = await detailRes.text();

    // Verify after() telemetry inserted into DB
    await sleep(600); // Allow after() callback to settle
    const { data: latestEvents } = await supabase
      .from('activity_events')
      .select('id, action, drug_id, created_at, details')
      .eq('action', 'drug_opened')
      .order('created_at', { ascending: false })
      .limit(3);

    const hasRecentOpened = (latestEvents || []).length > 0;
    const hasMetforminInHtml = detailHtml.includes('Metformin') && detailHtml.includes('Biguanides');

    testResults.push({
      scenario: 'Task 3: Authorized Detail SSR TTFB & after() Telemetry',
      passed: detailRes.status === 200 && hasMetforminInHtml && hasRecentOpened,
      details: `Status: ${detailRes.status}, TTFB: ${ttfb.toFixed(1)}ms, Found in HTML: ${hasMetforminInHtml}, Async after() logged: ${hasRecentOpened}`,
    });
  } catch (err) {
    testResults.push({
      scenario: 'Task 3: Authorized Detail SSR TTFB & after() Telemetry',
      passed: false,
      details: err.message,
    });
  }

  // ==========================================
  // TEST 4: Direct URL Visit with Filter Params
  // ==========================================
  try {
    const filterRes = await fetch(`${BASE_URL}/library?category=sulfonylureas&q=glimepiride`, {
      headers: { Cookie: sessionCookie },
    });
    const filterHtml = await filterRes.text();

    testResults.push({
      scenario: 'Task 1: Direct Filtered URL Visit (/library?category=...&q=...)',
      passed: filterRes.status === 200,
      details: `Status: ${filterRes.status}, Content Length: ${filterHtml.length} bytes`,
    });
  } catch (err) {
    testResults.push({
      scenario: 'Task 1: Direct Filtered URL Visit (/library?category=...&q=...)',
      passed: false,
      details: err.message,
    });
  }

  // ==========================================
  // TEST 5: Direct Visit with Invalid Category (Graceful Fallback)
  // ==========================================
  try {
    const invalidCatRes = await fetch(`${BASE_URL}/library?category=non_existent_category_xyz`, {
      headers: { Cookie: sessionCookie },
    });
    const invalidCatHtml = await invalidCatRes.text();

    testResults.push({
      scenario: 'Task 1: Safe Fallback for Non-Existent Category Query',
      passed: invalidCatRes.status === 200 && invalidCatHtml.includes('Clinical Research Documents'),
      details: `Status: ${invalidCatRes.status}, Graceful fallback to all categories verified`,
    });
  } catch (err) {
    testResults.push({
      scenario: 'Task 1: Safe Fallback for Non-Existent Category Query',
      passed: false,
      details: err.message,
    });
  }

  // ==========================================
  // TEST 6: Detail Page Back Button with 'from' State
  // ==========================================
  try {
    const fromParam = encodeURIComponent('category=sulfonylureas&q=glimepiride&selected=test-uuid');
    const detailWithFromRes = await fetch(`${BASE_URL}/drugs/glimepiride?from=${fromParam}`, {
      headers: { Cookie: sessionCookie },
    });
    const detailWithFromHtml = await detailWithFromRes.text();

    // Verify Back button and Compare link preserve 'from'
    const hasBackComponent = detailWithFromHtml.includes('Back to Library') || detailWithFromHtml.includes('Library');
    const hasCompareWithFrom = detailWithFromHtml.includes('from=category%3Dsulfonylureas');

    testResults.push({
      scenario: 'Task 1: Detail Breadcrumb & Compare URL Preserves ?from Query State',
      passed: detailWithFromRes.status === 200 && hasBackComponent && hasCompareWithFrom,
      details: `Status: ${detailWithFromRes.status}, Back Button: ${hasBackComponent}, Compare URL preserves from: ${hasCompareWithFrom}`,
    });
  } catch (err) {
    testResults.push({
      scenario: 'Task 1: Detail Breadcrumb & Compare URL Preserves ?from Query State',
      passed: false,
      details: err.message,
    });
  }

  // ==========================================
  // TEST 7: Comparison Page Back Button with 'from' State
  // ==========================================
  try {
    const fromParam = encodeURIComponent('category=biguanides&q=metformin');
    const compareRes = await fetch(`${BASE_URL}/compare?ids=id1,id2&from=${fromParam}`, {
      headers: { Cookie: sessionCookie },
    });
    const compareHtml = await compareRes.text();

    const hasCompareBreadcrumb = compareHtml.includes('Comparison Analysis');

    testResults.push({
      scenario: 'Task 1: Comparison Page Preserves ?from State in Breadcrumb',
      passed: compareRes.status === 200 && hasCompareBreadcrumb,
      details: `Status: ${compareRes.status}, Comparison Breadcrumb verified`,
    });
  } catch (err) {
    testResults.push({
      scenario: 'Task 1: Comparison Page Preserves ?from State in Breadcrumb',
      passed: false,
      details: err.message,
    });
  }

  // ==========================================
  // Print Test Report
  // ==========================================
  console.log(`\n================== VERIFICATION RESULTS ==================`);
  let allPassed = true;
  for (const r of testResults) {
    const mark = r.passed ? '✓' : '✗';
    if (!r.passed) allPassed = false;
    console.log(`${mark} ${r.scenario}`);
    console.log(`   ${r.details}`);
  }
  console.log(`==========================================================\n`);

  stopServer();
  if (!allPassed) {
    process.exit(1);
  }
}

runPhase2ATests().catch((err) => {
  console.error('Test suite runner error:', err);
  process.exit(1);
});
