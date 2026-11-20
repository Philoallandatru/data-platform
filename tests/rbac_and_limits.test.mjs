/* global fetch, process */
import test from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3001';

async function signIn(email, password) {
  const res = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: BASE },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(res.status, 200, `Sign-in failed for ${email} (status ${res.status})`);
  const cookie = res.headers.get('set-cookie');
  assert.ok(cookie, `Missing set-cookie for ${email}`);
  return cookie.split(';')[0];
}

test('Unauthenticated requests to protected endpoints return 401', async () => {
  const endpoints = [
    { method: 'GET', path: '/api/ssd-telemetry' },
    { method: 'GET', path: '/api/semantic/catalog' },
    { method: 'POST', path: '/api/semantic/query' },
    { method: 'GET', path: '/api/workspace' },
    { method: 'PUT', path: '/api/workspace' },
    { method: 'GET', path: '/api/personal-datasets' },
    { method: 'POST', path: '/api/personal-datasets' },
    { method: 'GET', path: '/api/admin/datasources' },
    { method: 'POST', path: '/api/admin/datasources' },
    { method: 'POST', path: '/api/admin/ssd-maintenance' },
  ];

  for (const ep of endpoints) {
    const res = await fetch(`${BASE}${ep.path}`, { method: ep.method });
    assert.equal(res.status, 401, `${ep.method} ${ep.path} should return 401 without session`);
  }
});

test('RBAC blocks non-admin users, malformed JSON returns 400, and payload limits hold', async () => {
  const adminCookie = await signIn('admin@pulselab.io', 'Admin@123456');

  // Ensure a non-admin viewer exists
  const viewerEmail = 'rbac_viewer@pulselab.io';
  const viewerPass = 'Viewer@123456';
  const listRes = await fetch(`${BASE}/api/auth/admin/list-users?limit=100`, {
    headers: { Cookie: adminCookie },
  });
  const listJson = await listRes.json();
  if (!(listJson.users || []).some((u) => u.email === viewerEmail)) {
    const createRes = await fetch(`${BASE}/api/auth/admin/create-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie, Origin: BASE },
      body: JSON.stringify({ name: 'RBAC Viewer', email: viewerEmail, password: viewerPass, role: 'viewer' }),
    });
    assert.equal(createRes.status, 200);
  }

  const viewerCookie = await signIn(viewerEmail, viewerPass);

  // Non-admin must receive 403 on all admin-only endpoints
  for (const ep of [
    { method: 'GET', path: '/api/admin/datasources' },
    { method: 'POST', path: '/api/admin/datasources', body: '{}' },
    { method: 'POST', path: '/api/admin/ssd-maintenance' },
    { method: 'DELETE', path: '/api/insights/999999' },
  ]) {
    const res = await fetch(`${BASE}${ep.path}`, {
      method: ep.method,
      headers: { Cookie: viewerCookie, 'Content-Type': 'application/json', Origin: BASE },
      body: ep.body,
    });
    assert.equal(res.status, 403, `${ep.method} ${ep.path} should return 403 for viewer`);
  }

  // Malformed JSON must return 400 (never 500)
  for (const ep of [
    { method: 'POST', path: '/api/admin/datasources' },
    { method: 'PUT', path: '/api/workspace' },
    { method: 'POST', path: '/api/personal-datasets' },
  ]) {
    const res = await fetch(`${BASE}${ep.path}`, {
      method: ep.method,
      headers: { Cookie: adminCookie, 'Content-Type': 'application/json', Origin: BASE },
      body: '{bad-json',
    });
    assert.equal(res.status, 400, `${ep.method} ${ep.path} should return 400 on malformed JSON`);
  }

  // >5MB personal dataset returns 413
  const oversized = JSON.stringify({
    name: 'huge.csv',
    rows: [{ payload: 'x'.repeat(5 * 1024 * 1024 + 1024) }],
  });
  const bigRes = await fetch(`${BASE}/api/personal-datasets`, {
    method: 'POST',
    headers: { Cookie: viewerCookie, 'Content-Type': 'application/json', Origin: BASE },
    body: oversized,
  });
  assert.equal(bigRes.status, 413);

  // >5000 rows personal dataset truncates to 5000
  const manyRows = Array.from({ length: 5050 }, (_, i) => ({ i }));
  const truncRes = await fetch(`${BASE}/api/personal-datasets`, {
    method: 'POST',
    headers: { Cookie: viewerCookie, 'Content-Type': 'application/json', Origin: BASE },
    body: JSON.stringify({ name: 'many.csv', rows: manyRows }),
  });
  assert.equal(truncRes.status, 200);
  const truncJson = await truncRes.json();
  assert.equal(truncJson.truncated, true);
  assert.equal(truncJson.rowCount, 5000);
});
