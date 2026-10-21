const assert = require('assert');
const http = require('http');

const BASE_URL = 'http://localhost:3000';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function runTests() {
  console.log('====================================================');
  console.log('   RUNNING STUDIO GFX AUTOMATED INTEGRATION TESTS   ');
  console.log('====================================================\n');

  let adminToken = '';
  let staffToken = '';
  let testClientId = null;
  let testQuotationId = null;
  let testServiceId = null;
  let testEventTypeId = null;

  // Test 0: Server Health & Wi-Fi Network Info
  console.log('Test 0: Checking Server Health & Network Detection...');
  const health = await request('/api/health');
  assert.strictEqual(health.status, 200, 'Health endpoint should return 200');
  assert.strictEqual(health.data.status, 'connected', 'Database should be connected');
  console.log('✓ Server and SQLite database online.\n');

  // Test 1: Admin Authentication
  console.log('Test 1: Admin Authentication & Token Verification...');
  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'ChangeMe123!' })
  });
  assert.strictEqual(adminLogin.status, 200, 'Admin login should succeed');
  assert.strictEqual(adminLogin.data.user.role, 'ADMIN', 'Role should be ADMIN');
  adminToken = adminLogin.data.token;
  console.log('✓ Admin login successful. Token acquired.\n');

  // Test 2: Quotation Staff Authentication
  console.log('Test 2: Quotation Staff Authentication...');
  const staffLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'quotation', password: 'ChangeMe123!' })
  });
  assert.strictEqual(staffLogin.status, 200, 'Staff login should succeed');
  assert.strictEqual(staffLogin.data.user.role, 'QUOTATION_STAFF', 'Role should be QUOTATION_STAFF');
  staffToken = staffLogin.data.token;
  console.log('✓ Quotation staff login successful.\n');

  // Test 3: Backend Security & Role Enforcement (Section 3 & 49)
  console.log('Test 3: Backend Role Security Enforcement (Staff cannot access Admin APIs)...');
  const staffSettingsAttempt = await request('/api/settings', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({ studio_name: 'Hacked Name' })
  });
  assert.strictEqual(staffSettingsAttempt.status, 403, 'Staff must be forbidden from updating settings');

  const staffUsersAttempt = await request('/api/users', {
    method: 'GET',
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert.strictEqual(staffUsersAttempt.status, 403, 'Staff must be forbidden from managing users');

  const staffServiceCreateAttempt = await request('/api/services', {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({ category_id: 1, name: 'Illegal Service', price: 999 })
  });
  assert.strictEqual(staffServiceCreateAttempt.status, 403, 'Staff must be forbidden from adding master services');
  console.log('✓ Role security strictly enforced on backend (403 Forbidden verified).\n');

  const runId = Date.now();

  // Test 4: Admin creates master service & price
  console.log('Test 4: Admin Service & Master Price Creation...');
  const createSvc = await request('/api/services', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      category_id: 1,
      name: `4K Cinematic Drone Package ${runId}`,
      description: 'Dual drone synchronized coverage with pilot and spotter',
      unit: 'Event',
      price: 35000,
      sort_order: 10
    })
  });
  assert.strictEqual(createSvc.status, 201, 'Service creation should succeed');
  testServiceId = createSvc.data.service.id;
  console.log(`✓ Master Service created: ${createSvc.data.service.name} (₹35,000)\n`);

  // Test 5: Admin creates event type
  console.log('Test 5: Admin Event Type Management...');
  const createEt = await request('/api/event-types', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: `Destination Sangeet & Cocktail ${runId}`,
      description: 'Evening musical and cocktail ceremony'
    })
  });
  assert.strictEqual(createEt.status, 201, 'Event type creation should succeed');
  testEventTypeId = createEt.data.eventType.id;
  console.log(`✓ Event type created: ${createEt.data.eventType.name}\n`);

  // Test 6: Client Management & Duplicate Mobile Detection (Section 12)
  console.log('Test 6: Client Creation & Duplicate Mobile Check...');
  const testMobile = `98499${String(runId).slice(-5)}`;
  const clientCreate = await request('/api/clients', {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({
      name: 'Suresh Varma',
      mobile: testMobile,
      email: `suresh.${runId}@example.com`,
      city: 'Hyderabad',
      state: 'Telangana',
      notes: 'Luxury Wedding Client'
    })
  });
  assert.strictEqual(clientCreate.status, 201, 'Client creation should succeed');
  testClientId = clientCreate.data.client.id;
  assert.ok(clientCreate.data.client.client_code.startsWith('CL-'), 'Client code should have CL- prefix');

  // Check duplicate mobile detection
  const duplicateCheck = await request(`/api/clients/check-mobile?mobile=${testMobile}`, {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert.strictEqual(duplicateCheck.data.exists, true, 'Duplicate mobile number should be detected');
  console.log(`✓ Client created: ${clientCreate.data.client.name} (${clientCreate.data.client.client_code}). Duplicate check passed.\n`);

  // Test 7: Multi-Event Quotation Creation with Snapshot & Precise Math (Sections 14, 15, 17, 18, 19)
  console.log('Test 7: Creating Multi-Event Quotation with Calculation Precision...');
  const createQuote = await request('/api/quotations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({
      client_id: testClientId,
      quotation_date: '2026-10-15',
      valid_until: '2026-10-30',
      discount_type: 'percentage',
      discount_value: 10,
      additional_charges: 5000,
      tax_enabled: 1,
      tax_percentage: 18,
      notes: 'VIP coverage package with drone and multi-cam setup.',
      events: [
        {
          event_date: '2026-12-25',
          event_type: 'Sangeet',
          venue: 'Novotel Ballroom',
          items: [
            {
              service_id: 1,
              service_name: 'Traditional Photography',
              description: 'Still coverage',
              quantity: 1,
              unit: 'Event',
              unit_price: 15000
            },
            {
              service_id: 2,
              service_name: 'Candid Photography',
              description: 'Artistic primes',
              quantity: 1,
              unit: 'Event',
              unit_price: 25000
            }
          ]
        },
        {
          event_date: '2026-12-26',
          event_type: 'Grand Wedding',
          venue: 'Taj Krishna Ballroom',
          items: [
            {
              service_id: testServiceId,
              service_name: '4K Cinematic Drone Package',
              quantity: 1,
              unit: 'Event',
              unit_price: 35000
            },
            {
              service_id: 5,
              service_name: 'Traditional Videography',
              quantity: 1,
              unit: 'Event',
              unit_price: 18000
            }
          ]
        }
      ]
    })
  });

  assert.strictEqual(createQuote.status, 201, 'Quotation creation should succeed');
  testQuotationId = createQuote.data.quotationId;
  const quoteNumber = createQuote.data.quotationNumber;
  assert.ok(quoteNumber.startsWith('SGFX-'), 'Quotation number must have SGFX prefix');
  console.log(`✓ Quotation created successfully: ${quoteNumber} (ID: ${testQuotationId})\n`);

  // Verify stored calculations & snapshots
  console.log('Test 8: Verifying Snapshot Integrity & Currency Rounding...');
  const quoteDetails = await request(`/api/quotations/${testQuotationId}`, {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  const q = quoteDetails.data.quotation;
  // Subtotal = 15000 + 25000 + 35000 + 18000 = 93,000
  assert.strictEqual(q.subtotal, 93000, 'Subtotal must equal exactly 93,000');
  // Discount 10% = 9,300
  assert.strictEqual(q.discount_amount, 9300, 'Discount must be 9,300');
  // After discount + charges = 93000 - 9300 + 5000 = 88,700
  // Tax 18% of 88,700 = 15,966
  assert.strictEqual(q.tax_amount, 15966, 'Tax must be 15,966');
  // Grand Total = 88700 + 15966 = 104,666
  assert.strictEqual(q.grand_total, 104666, 'Grand total must be 104,666');
  
  // Verify multi-event grouping
  assert.strictEqual(quoteDetails.data.events.length, 2, 'Must have 2 events');
  assert.strictEqual(quoteDetails.data.paymentTerms.length, 5, 'Must have 5 default payment milestones');
  console.log(`✓ Calculations verified: Subtotal: ₹93,000 | Disc: -₹9,300 | GST: ₹15,966 | Grand Total: ₹1,04,666\n`);

  // Test 9: Duplication Workflow (Section 39)
  console.log('Test 9: Quotation Duplication (Section 39)...');
  const duplicateRes = await request(`/api/quotations/${testQuotationId}/duplicate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert.strictEqual(duplicateRes.status, 201, 'Duplication should succeed');
  assert.notStrictEqual(duplicateRes.data.quotationNumber, quoteNumber, 'Duplicate must get a new unique quotation number');
  console.log(`✓ Duplicated quotation created: ${duplicateRes.data.quotationNumber}\n`);

  // Test 10: Status Workflow & Audit Logs (Section 20 & 29)
  console.log('Test 10: Status Transitions & Audit Logging...');
  const statusUpdate = await request(`/api/quotations/${testQuotationId}/status`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({ status: 'Accepted', notes: 'Client confirmed package via WhatsApp' })
  });
  assert.strictEqual(statusUpdate.status, 200, 'Status update should succeed');

  const auditCheck = await request(`/api/audit-logs?entity=quotations`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.ok(auditCheck.data.logs.length > 0, 'Audit logs must record quotation actions');
  console.log('✓ Status changed to Accepted and verified in system audit trail.\n');

  // Test 11: Business Reports & Analytics (Section 28)
  console.log('Test 11: Admin Reports Summary...');
  const reports = await request('/api/reports/summary', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(reports.status, 200, 'Reports should return 200');
  assert.ok(reports.data.metrics.totalQuotations >= 2, 'Total quotations metric counted');
  assert.ok(reports.data.metrics.acceptedValue >= 104666, 'Accepted value metric includes confirmed quote');
  console.log(`✓ Reports computed: Total Value Quoted: ${reports.data.metrics.totalQuotationValue} | Accepted Value: ${reports.data.metrics.acceptedValue}\n`);

  // Test 12: JSON Database Export (Section 30)
  console.log('Test 12: Database Backup JSON Export...');
  const exportRes = await fetch(`${BASE_URL}/api/backup/export-json`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(exportRes.status, 200, 'Export JSON should return 200');
  const exportJson = await exportRes.json();
  assert.ok(exportJson.data.quotations.length > 0, 'Exported JSON must contain quotations');
  assert.ok(exportJson.data.clients.length > 0, 'Exported JSON must contain clients');
  console.log('✓ JSON backup verified with all relational tables.\n');

  console.log('====================================================');
  console.log('  ALL 12 AUTOMATED TESTS PASSED SUCCESSFULLY!  ');
  console.log('====================================================\n');
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err.message);
  process.exit(1);
});
