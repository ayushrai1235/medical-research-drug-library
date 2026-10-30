import { spawn } from 'child_process';
import http from 'http';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(port, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`);
      if (res.status === 200) return true;
    } catch {}
    await sleep(500);
  }
  return false;
}

async function runRegression() {
  console.log('--- Starting Next.js Production Server on Port 3000 ---');
  const server = spawn('node', ['node_modules/next/dist/bin/next', 'start', '-H', '0.0.0.0', '-p', '3000'], {
    stdio: 'inherit',
    env: process.env,
  });

  const stopServer = () => {
    try {
      server.kill('SIGTERM');
    } catch {}
  };

  process.on('exit', stopServer);
  process.on('SIGINT', stopServer);
  process.on('SIGTERM', stopServer);

  const isUp = await waitForServer(3000);
  if (!isUp) {
    console.error('Failed to start Next.js server in time.');
    stopServer();
    process.exit(1);
  }

  console.log('Next.js server is ready. Executing test suite...\n');
  const results = [];

  // Test 1: Landing page content
  try {
    const res = await fetch('http://127.0.0.1:3000/');
    const text = await res.text();
    const hasResearchSection = text.includes('Research User Sign In');
    const hasContinueBtn = text.includes('Continue as Research User');
    const hasAdminQuestion = text.includes('Are you an Admin?');
    const hasAdminSignIn = text.includes('Admin Sign In');
    const hasAdminLoginHref = text.includes('href="/admin-login"');

    const passed = res.status === 200 && hasResearchSection && hasContinueBtn && hasAdminQuestion && hasAdminSignIn && hasAdminLoginHref;
    results.push({ name: '1. Landing Page Redesign', passed, details: `Status ${res.status}, hasResearchSection=${hasResearchSection}, hasAdminQuestion=${hasAdminQuestion}` });
  } catch (e) {
    results.push({ name: '1. Landing Page Redesign', passed: false, details: e.message });
  }

  // Test 2: Admin Login page
  try {
    const res = await fetch('http://127.0.0.1:3000/admin-login');
    const text = await res.text();
    const hasAdminHeader = text.includes('Administrator Portal');
    const hasEmailField = text.includes('type="email"') || text.includes('admin@medicalresearch.org') || text.includes('Email Address');
    const passed = res.status === 200 && hasAdminHeader;
    results.push({ name: '2. Admin Login Page Access', passed, details: `Status ${res.status}` });
  } catch (e) {
    results.push({ name: '2. Admin Login Page Access', passed: false, details: e.message });
  }

  // Test 3: Unauthorized Admin Protection
  try {
    const res = await fetch('http://127.0.0.1:3000/admin/dashboard', { redirect: 'manual' });
    const passed = res.status === 307 || res.status === 302 || res.status === 303;
    const location = res.headers.get('location');
    results.push({ name: '3. Admin Protection (Redirects unauthenticated)', passed: passed && location?.includes('/admin-login'), details: `Status ${res.status}, Location: ${location}` });
  } catch (e) {
    results.push({ name: '3. Admin Protection', passed: false, details: e.message });
  }

  // Test 4: Create Research Session
  let sessionCookie = '';
  try {
    const res = await fetch('http://127.0.0.1:3000/api/research/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: 'Dr. Regression Tester', language: 'en' }),
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      sessionCookie = setCookie.split(';')[0];
    }
    const data = await res.json();
    const passed = res.status === 200 && data.success && data.session?.displayName === 'Dr. Regression Tester';
    results.push({ name: '4. Research Session Initiation', passed, details: `Status ${res.status}, SessionId: ${data.session?.id}` });
  } catch (e) {
    results.push({ name: '4. Research Session Initiation', passed: false, details: e.message });
  }

  // Test 5: Fetch Drugs Catalog
  let sampleDrug1 = null;
  let sampleDrug2 = null;
  try {
    const res = await fetch('http://127.0.0.1:3000/api/drugs');
    const data = await res.json();
    const allDrugs = (data.categories || []).flatMap((c) => c.drugs || []);
    const passed = res.status === 200 && data.categories?.length === 7 && data.totalDrugs === 19;
    if (passed && allDrugs.length >= 2) {
      sampleDrug1 = allDrugs[0];
      sampleDrug2 = allDrugs[1];
    }
    results.push({ name: '5. Catalog 19 Drugs & 7 Categories', passed, details: `Categories: ${data.categories?.length}, Total Drugs: ${data.totalDrugs}` });
  } catch (e) {
    results.push({ name: '5. Catalog 19 Drugs', passed: false, details: e.message });
  }

  // Test 6: Access Library with Session
  try {
    const res = await fetch('http://127.0.0.1:3000/library', {
      headers: { Cookie: sessionCookie },
    });
    const text = await res.text();
    const hasMetformin = text.includes('Metformin');
    const passed = res.status === 200 && hasMetformin;
    results.push({ name: '6. Library View with Active Session', passed, details: `Status ${res.status}` });
  } catch (e) {
    results.push({ name: '6. Library View', passed: false, details: e.message });
  }

  // Test 7: Signed URL Generation
  let signedUrl = '';
  if (sampleDrug1) {
    try {
      const res = await fetch('http://127.0.0.1:3000/api/files/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
        body: JSON.stringify({ drugId: sampleDrug1.id }),
      });
      const data = await res.json();
      signedUrl = data.signedUrl;
      const passed = res.status === 200 && typeof signedUrl === 'string' && signedUrl.includes('token=');
      results.push({ name: '7. Signed URL Authorization', passed, details: `Status ${res.status}` });
    } catch (e) {
      results.push({ name: '7. Signed URL Authorization', passed: false, details: e.message });
    }
  }

  // Test 8: Individual PDF Download
  if (sampleDrug1) {
    try {
      const res = await fetch(`http://127.0.0.1:3000/api/download/individual?drugId=${sampleDrug1.id}`, {
        headers: { Cookie: sessionCookie },
      });
      const buffer = await res.arrayBuffer();
      const isPdf = Buffer.from(buffer).subarray(0, 4).toString() === '%PDF';
      results.push({ name: '8. Individual PDF Download', passed: res.status === 200 && isPdf, details: `Bytes: ${buffer.byteLength}, Magic: %PDF` });
    } catch (e) {
      results.push({ name: '8. Individual PDF Download', passed: false, details: e.message });
    }
  }

  // Test 9: Multi-PDF ZIP Generation
  if (sampleDrug1 && sampleDrug2) {
    try {
      const res = await fetch('http://127.0.0.1:3000/api/download/zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
        body: JSON.stringify({ drugIds: [sampleDrug1.id, sampleDrug2.id] }),
      });
      const buffer = await res.arrayBuffer();
      // ZIP magic bytes: PK (0x50 0x4B)
      const isZip = Buffer.from(buffer).subarray(0, 2).toString() === 'PK';
      results.push({ name: '9. Multi-PDF ZIP Download', passed: res.status === 200 && isZip, details: `Bytes: ${buffer.byteLength}, Magic: PK` });
    } catch (e) {
      results.push({ name: '9. Multi-PDF ZIP Download', passed: false, details: e.message });
    }
  }

  // Test 10: Combined Comparison PDF Generation
  if (sampleDrug1 && sampleDrug2) {
    try {
      const res = await fetch('http://127.0.0.1:3000/api/download/comparison', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
        body: JSON.stringify({ drugId1: sampleDrug1.id, drugId2: sampleDrug2.id }),
      });
      const buffer = await res.arrayBuffer();
      const isPdf = Buffer.from(buffer).subarray(0, 4).toString() === '%PDF';
      results.push({ name: '10. Combined Comparison PDF Generation', passed: res.status === 200 && isPdf, details: `Bytes: ${buffer.byteLength}, Magic: %PDF` });
    } catch (e) {
      results.push({ name: '10. Combined Comparison PDF Generation', passed: false, details: e.message });
    }
  }

  // Test 11: Activity Logging
  if (sampleDrug1) {
    try {
      const res = await fetch('http://127.0.0.1:3000/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
        body: JSON.stringify({
          action: 'pdf_viewed',
          drugId: sampleDrug1.id,
          details: { drugName: sampleDrug1.name, pageCount: 12 },
        }),
      });
      const data = await res.json();
      results.push({ name: '11. Activity Event Logging', passed: res.status === 200 && data.success, details: `Status ${res.status}` });
    } catch (e) {
      results.push({ name: '11. Activity Event Logging', passed: false, details: e.message });
    }
  }

  // Summary
  console.log('\n================ REGRESSION TEST RESULTS ================');
  let allPassed = true;
  for (const r of results) {
    const symbol = r.passed ? '✓' : '✗';
    console.log(`${symbol} ${r.name}: ${r.details}`);
    if (!r.passed) allPassed = false;
  }
  console.log('=========================================================\n');

  stopServer();
  process.exit(allPassed ? 0 : 1);
}

runRegression().catch((err) => {
  console.error('Fatal regression failure:', err);
  process.exit(1);
});
