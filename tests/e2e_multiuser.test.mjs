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

test('5-user concurrent workspace editing, custom panels, CSV uploads, insights, and RBAC isolation', async () => {
  const admin = await signIn('admin@pulselab.io', 'Admin@123456');
  assert.equal(admin.user.role, 'admin');

  const specs = [
    { name: 'Alice FW', email: 'alice@pulselab.io', pass: 'Alice@123456', role: 'fw_team', widgets: ['radar', 'personal_import'] },
    { name: 'Bob QA', email: 'bob@pulselab.io', pass: 'Bob@123456', role: 'qa_team', widgets: ['heatmap', 'scatter'] },
    { name: 'Charlie Dev', email: 'charlie@pulselab.io', pass: 'Charlie@123456', role: 'fw_team', widgets: ['rings', 'alerts'] },
    { name: 'David PM', email: 'david@pulselab.io', pass: 'David@123456', role: 'viewer', widgets: ['semantic_raw', 'radar'] },
    { name: 'Eve Ops', email: 'eve@pulselab.io', pass: 'Eve@123456', role: 'qa_team', widgets: ['scatter', 'personal_import'] },
  ];

  // 1. Register all 5 users
  for (const s of specs) {
    await ensureUser(admin.cookie, s.name, s.email, s.pass, s.role);
  }

  // 2. Sign in all 5 users in parallel
  const sessions = await Promise.all(specs.map((s) => signIn(s.email, s.pass)));

  // 3. Each user concurrently creates multi-page + multi-panel workspaces, uploads unique CSVs, and queries semantic API
  await Promise.all(
    sessions.map(async (sess, idx) => {
      const spec = specs[idx];

      // Non-admin RBAC check
      const adm = await fetch(`${BASE}/api/admin/datasources`, { headers: { Cookie: sess.cookie } });
      assert.equal(adm.status, 403, `${spec.email} must not access admin datasources`);

      // Save 2 Pages x 2 Panels in My Space
      const myPages = [
        {
          id: `${spec.name.split(' ')[0].toLowerCase()}-p1`,
          title: `${spec.name} 主看板`,
          panels: [
            { id: 'pn-1', title: 'Panel A', widgets: spec.widgets },
            { id: 'pn-2', title: 'Panel B', widgets: ['alerts'] },
          ],
        },
        {
          id: `${spec.name.split(' ')[0].toLowerCase()}-p2`,
          title: `${spec.name} 实验页`,
          panels: [{ id: 'pn-3', title: 'CSV 实验', widgets: ['personal_import'] }],
        },
      ];
      const wsRes = await fetch(`${BASE}/api/workspace`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: sess.cookie },
        body: JSON.stringify({ scope: 'myspace', pages: myPages }),
      });
      assert.equal(wsRes.status, 200);

      // Save custom page panel tabs
      const customScope = spec.role === 'fw_team' ? 'custom-fw' : 'custom-qa';
      const customRes = await fetch(`${BASE}/api/workspace`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: sess.cookie },
        body: JSON.stringify({
          scope: customScope,
          pages: [
            {
              id: 'page-1',
              title: customScope,
              panels: [
                { id: 'cp-1', title: `${spec.name} 子页 1`, widgets: ['placeholder'] },
                { id: 'cp-2', title: `${spec.name} 子页 2`, widgets: ['placeholder'] },
              ],
            },
          ],
        }),
      });
      assert.equal(customRes.status, 200);

      // Upload unique CSV-like dataset
      const dsRes = await fetch(`${BASE}/api/personal-datasets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: sess.cookie },
        body: JSON.stringify({
          name: `${spec.email.split('@')[0]}_dataset.csv`,
          rows: [
            { owner: spec.email, metric: 100 + idx * 50, temp: 55 + idx },
            { owner: spec.email, metric: 200 + idx * 50, temp: 60 + idx },
          ],
        }),
      });
      assert.equal(dsRes.status, 200);

      // Run semantic query
      const semRes = await fetch(`${BASE}/api/semantic/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: sess.cookie },
        body: JSON.stringify({
          dataset: 'ssd_runs',
          metrics: ['avg_bandwidth', 'efficiency'],
          groupBy: ['firmware'],
        }),
      });
      assert.equal(semRes.status, 200);
      const semJson = await semRes.json();
      assert.ok(semJson.rows.length > 0);
    })
  );

  // 4. Read back all 5 users' isolated state and verify ZERO cross-user contamination
  await Promise.all(
    sessions.map(async (sess, idx) => {
      const spec = specs[idx];
      const ws = await (
        await fetch(`${BASE}/api/workspace?scope=myspace`, { headers: { Cookie: sess.cookie } })
      ).json();
      assert.equal(ws.pages.length, 2);
      assert.equal(ws.pages[0].title, `${spec.name} 主看板`);
      assert.equal(ws.pages[1].title, `${spec.name} 实验页`);

      const ds = await (
        await fetch(`${BASE}/api/personal-datasets`, { headers: { Cookie: sess.cookie } })
      ).json();
      assert.equal(ds.dataset.name, `${spec.email.split('@')[0]}_dataset.csv`);
      assert.equal(ds.dataset.rows[0].owner, spec.email);
      assert.equal(ds.dataset.rows[0].metric, 100 + idx * 50);
    })
  );
});
