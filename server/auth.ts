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

const authSecret = process.env.BETTER_AUTH_SECRET;
if (process.env.NODE_ENV === 'production' && !authSecret) {
  throw new Error('[Auth] BETTER_AUTH_SECRET must be set in production');
}

export const auth = betterAuth({
  database: authDb,
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:5180',
  secret: authSecret || 'pulse-lab-dev-secret-change-in-production-2026',
  trustedOrigins: ['http://localhost:5180', 'http://localhost:3001'],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh daily on activity
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

  authDb.exec(`
    CREATE TABLE IF NOT EXISTS user_workspaces (
      user_id TEXT PRIMARY KEY,
      widgets_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  const countRow = authDb.prepare('SELECT COUNT(*) as c FROM user').get() as { c: number };
  if ((countRow?.c ?? 0) === 0) {
    if (process.env.NODE_ENV === 'production') {
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (adminEmail && adminPassword) {
        await auth.api.signUpEmail({
          body: { name: 'System Admin', email: adminEmail, password: adminPassword },
        });
        authDb.prepare("UPDATE user SET role = 'admin' WHERE email = ?").run(adminEmail);
        console.log(`[Auth] Bootstrapped production admin: ${adminEmail}`);
      } else {
        console.warn('[Auth] No users in auth.db. Set ADMIN_EMAIL & ADMIN_PASSWORD to bootstrap the first admin.');
      }
      return;
    }

    // Seed default dev accounts only outside production
    await auth.api.signUpEmail({
      body: {
        name: 'System Admin',
        email: 'admin@pulselab.io',
        password: 'Admin@123456',
      },
    });
    authDb.prepare("UPDATE user SET role = 'admin' WHERE email = ?").run('admin@pulselab.io');

    await auth.api.signUpEmail({
      body: {
        name: 'FW Engineer',
        email: 'fw@pulselab.io',
        password: 'Engineer@123',
      },
    });
    authDb.prepare("UPDATE user SET role = 'fw_team' WHERE email = ?").run('fw@pulselab.io');

    console.log('[Auth] Seeded dev accounts: admin@pulselab.io (admin) & fw@pulselab.io (fw_team)');
  }
}
