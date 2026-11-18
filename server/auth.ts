import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { betterAuth } from 'better-auth';
import { admin } from 'better-auth/plugins';
import { getMigrations } from 'better-auth/db/migration';

const dataDir = path.resolve(process.cwd(), 'data');
fs.mkdirSync(dataDir, { recursive: true });

const authDbPath = path.join(dataDir, 'auth.db');
export const authDb = new DatabaseSync(authDbPath);
authDb.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 3000;');

export const auth = betterAuth({
  database: authDb,
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:5180',
  secret: process.env.BETTER_AUTH_SECRET || 'pulse-lab-dev-secret-change-in-production-2026',
  trustedOrigins: ['http://localhost:5180', 'http://localhost:3001'],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  plugins: [
    admin({
      defaultRole: 'viewer',
      adminRoles: ['admin'],
    }),
  ],
});

export async function initAuthDatabase() {
  const { toBeCreated, toBeAdded, runMigrations } = await getMigrations(auth.options);
  if (toBeCreated.length > 0 || toBeAdded.length > 0) {
    await runMigrations();
  }

  const countRow = authDb.prepare('SELECT COUNT(*) as c FROM user').get() as { c: number };
  if ((countRow?.c ?? 0) === 0) {
    // Seed default Admin account
    await auth.api.signUpEmail({
      body: {
        name: 'System Admin',
        email: 'admin@pulselab.io',
        password: 'Admin@123456',
      },
    });
    authDb.prepare("UPDATE user SET role = 'admin' WHERE email = ?").run('admin@pulselab.io');

    // Seed default FW Engineer account
    await auth.api.signUpEmail({
      body: {
        name: 'FW Engineer',
        email: 'fw@pulselab.io',
        password: 'Engineer@123',
      },
    });
    authDb.prepare("UPDATE user SET role = 'fw_team' WHERE email = ?").run('fw@pulselab.io');

    console.log('[Auth] Seeded default accounts: admin@pulselab.io (admin) & fw@pulselab.io (fw_team)');
  }
}
