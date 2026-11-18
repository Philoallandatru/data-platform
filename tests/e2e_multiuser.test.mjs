/* global fetch, process */
import test from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3001';

async function signIn(email, password) {
  const res = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5180' },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(res.status, 200, `Sign-in failed for ${email}`);
  const cookie = res.headers.get('set-cookie');
  assert.ok(cookie, `Missing set-cookie for ${email}`);
  const body = await res.json();
  return { cookie: cookie.split(';')[0], user: body.user };
}

async function ensureUser(adminCookie, name, email, password, role) {
  const listRes = await fetch(`${BASE}/api/auth/admin/list-users?limit=100`, {
    headers: { Cookie: adminCookie },
  });
  const listJson = await listRes.json();
  const exists = (listJson.users || []).find((u) => u.email === email);
  if (exists) return exists;

  const createRes = await fetch(`${BASE}/api/auth/admin/create-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
      Origin: 'http://localhost:5180',
    },
    body: JSON.stringify({ name, email, password, role }),
  });
  assert.equal(createRes.status, 200, `Failed to create user ${email}`);
  const created = await createRes.json();
  return created.user;
}

test('Multi-user isolation, RBAC, and semantic queries work without cross-user leakage', async () => {
  const admin = await signIn('admin@pulselab.io', 'Admin@123456');
  assert.equal(admin.user.role, 'admin');

  // Create two distinct team members via Admin API
  await ensureUser(admin.cookie, 'Alice FW', 'alice@pulselab.io', 'Alice@123456', 'fw_team');
  await ensureUser(admin.cookie, 'Bob QA', 'bob@pulselab.io', 'Bob@123456', 'qa_team');

  const alice = await signIn('alice@pulselab.io', 'Alice@123456');
  const bob = await signIn('bob@pulselab.io', 'Bob@123456');

  assert.equal(alice.user.role, 'fw_team');
  assert.equal(bob.user.role, 'qa_team');

  // 1. Non-admins must be rejected on admin endpoints (403)
  const aliceAdminCheck = await fetch(`${BASE}/api/admin/datasources`, {
    headers: { Cookie: alice.cookie },
  });
  assert.equal(aliceAdminCheck.status, 403);

  // 2. Alice saves her own multi-page workspace & personal CSV
  const alicePages = [
    {
      id: 'alice-p1',
      title: 'Alice 固件对比',
      panels: [{ id: 'ap-1', title: 'Low-QD', widgets: ['radar'] }],
    },
  ];
  await fetch(`${BASE}/api/workspace`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: alice.cookie },
    body: JSON.stringify({ scope: 'myspace', pages: alicePages }),
  });
  await fetch(`${BASE}/api/personal-datasets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: alice.cookie },
    body: JSON.stringify({ name: 'alice_data.csv', rows: [{ job: 'alice_4k', bw: 410 }] }),
  });

  // 3. Bob saves his own distinct workspace & personal CSV
  const bobPages = [
    {
      id: 'bob-p1',
      title: 'Bob 高温压测',
      panels: [{ id: 'bp-1', title: 'Thermal', widgets: ['heatmap'] }],
    },
  ];
  await fetch(`${BASE}/api/workspace`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: bob.cookie },
    body: JSON.stringify({ scope: 'myspace', pages: bobPages }),
  });
  await fetch(`${BASE}/api/personal-datasets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: bob.cookie },
    body: JSON.stringify({ name: 'bob_thermal.csv', rows: [{ job: 'bob_75c', bw: 7500 }] }),
  });

  // 4. Verify Alice and Bob each read back ONLY their own workspace and dataset
  const aliceWs = await (await fetch(`${BASE}/api/workspace?scope=myspace`, { headers: { Cookie: alice.cookie } })).json();
  const bobWs = await (await fetch(`${BASE}/api/workspace?scope=myspace`, { headers: { Cookie: bob.cookie } })).json();
  assert.equal(aliceWs.pages[0].title, 'Alice 固件对比');
  assert.equal(bobWs.pages[0].title, 'Bob 高温压测');

  const aliceDs = await (await fetch(`${BASE}/api/personal-datasets`, { headers: { Cookie: alice.cookie } })).json();
  const bobDs = await (await fetch(`${BASE}/api/personal-datasets`, { headers: { Cookie: bob.cookie } })).json();
  assert.equal(aliceDs.dataset.name, 'alice_data.csv');
  assert.equal(bobDs.dataset.name, 'bob_thermal.csv');

  // 5. Verify Semantic Query works for both users
  const semRes = await fetch(`${BASE}/api/semantic/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: bob.cookie },
    body: JSON.stringify({
      dataset: 'ssd_runs',
      metrics: ['avg_bandwidth', 'efficiency'],
      groupBy: ['firmware'],
    }),
  });
  assert.equal(semRes.status, 200);
  const semJson = await semRes.json();
  assert.ok(semJson.rows.length > 0);
});
