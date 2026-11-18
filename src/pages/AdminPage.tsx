import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { authClient } from '../lib/authClient';
import { ColumnDef, DataTable } from '../components/DataTable';
import { CustomSelect } from '../components/CustomSelect';
import { Database, RefreshCw, Shield, UserPlus, Ban, CheckCircle } from 'lucide-react';

interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  banned: boolean;
  createdAt: string;
}

interface DataSourceItem {
  id: string;
  filename: string;
  sizeMB: number;
  active: boolean;
  tables: string[];
}

const ROLE_OPTIONS = [
  { value: 'admin', label: 'admin', badge: 'Full Access', dotColor: '#FF4D2E' },
  { value: 'fw_team', label: 'fw_team', badge: 'FW Pages', dotColor: '#00B4D8' },
  { value: 'qa_team', label: 'qa_team', badge: 'QA Pages', dotColor: '#A855F7' },
  { value: 'viewer', label: 'viewer', badge: 'Read-Only', dotColor: '#10B981' },
];

export const AdminPage: React.FC = () => {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [datasources, setDatasources] = useState<DataSourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  // Create user form
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('User@123456');
  const [newRole, setNewRole] = useState('fw_team');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const [uRes, dsRes] = await Promise.all([
      authClient.admin.listUsers({ query: { limit: 100 } }),
      fetch('/api/admin/datasources').then((r) => (r.ok ? r.json() : null)),
    ]);
    if (uRes.data?.users) {
      setUsers(
        uRes.data.users.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role || 'viewer',
          banned: Boolean(u.banned),
          createdAt: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-',
        }))
      );
    }
    if (dsRes?.datasources) {
      setDatasources(dsRes.datasources);
    }
    setLoading(false);
  }, []);

  const toggleDatasource = async (id: string) => {
    const currentActive = datasources.filter((d) => d.active).map((d) => d.id);
    const nextActive = currentActive.includes(id)
      ? currentActive.filter((x) => x !== id)
      : [...currentActive, id];

    const res = await fetch('/api/admin/datasources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activeIds: nextActive }),
    });
    const json = await res.json();
    if (json.datasources) {
      setDatasources(json.datasources);
      setMsg(`Updated active SQLite pool: ${nextActive.join(', ') || 'none'}`);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const res = await authClient.admin.createUser({
      name: newName.trim(),
      email: newEmail.trim(),
      password: newPassword,
      role: newRole as any,
    });
    if (res.error) {
      setMsg(`Error: ${res.error.message}`);
    } else {
      setMsg(`Created user ${newEmail.trim()} (${newRole})`);
      setNewName('');
      setNewEmail('');
      loadUsers();
    }
  };

  const handleChangeRole = async (userId: string, role: string) => {
    await authClient.admin.setRole({ userId, role: role as any });
    setMsg(`Updated role to ${role}`);
    loadUsers();
  };

  const handleToggleBan = async (u: AdminUserRow) => {
    if (u.banned) {
      await authClient.admin.unbanUser({ userId: u.id });
    } else {
      await authClient.admin.banUser({ userId: u.id, banReason: 'Admin action' });
    }
    loadUsers();
  };

  const handleSsdMaintenance = async () => {
    setMsg('Running WAL checkpoint & ANALYZE...');
    const res = await fetch('/api/admin/ssd-maintenance', { method: 'POST' });
    const data = await res.json();
    setMsg(data.message || data.error || 'Done');
  };

  const columns: ColumnDef<AdminUserRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'User',
        accessor: (u) => u.name,
        render: (u) => (
          <div>
            <div className="font-semibold text-[var(--text-primary)]">{u.name}</div>
            <div className="text-[11px] font-mono-num text-[var(--text-muted)]">{u.email}</div>
          </div>
        ),
      },
      {
        key: 'role',
        header: 'Role & Access',
        accessor: (u) => u.role,
        render: (u) => (
          <div onClick={(e) => e.stopPropagation()} className="w-40">
            <CustomSelect
              value={u.role}
              options={ROLE_OPTIONS}
              onChange={(val) => handleChangeRole(u.id, val)}
              align="left"
            />
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        accessor: (u) => (u.banned ? 'BANNED' : 'ACTIVE'),
        render: (u) => (
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
              u.banned
                ? 'bg-[#FF4D2E]/15 text-[#FF4D2E] border-[#FF4D2E]/30'
                : 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
            }`}
          >
            {u.banned ? 'BANNED' : 'ACTIVE'}
          </span>
        ),
      },
      {
        key: 'createdAt',
        header: 'Created',
        accessor: (u) => u.createdAt,
        render: (u) => <span className="font-mono-num text-[var(--text-secondary)]">{u.createdAt}</span>,
      },
      {
        key: 'actions',
        header: 'Action',
        sortable: false,
        align: 'right',
        accessor: (u) => u.id,
        render: (u) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleBan(u);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] border border-[var(--border-card)] text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            {u.banned ? (
              <>
                <CheckCircle className="w-3 h-3 text-emerald-500" /> Unban
              </>
            ) : (
              <>
                <Ban className="w-3 h-3 text-[#FF4D2E]" /> Ban
              </>
            )}
          </button>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-5">
      {/* Admin Header */}
      <div className="bento-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF6B2C]/15 border border-[#FF6B2C]/30 flex items-center justify-center text-[#FF6B2C]">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">
              Admin Console & RBAC Management
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Better Auth + 独立 data/auth.db • 管理账号、角色权限与 SQLite 运维
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSsdMaintenance}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] transition cursor-pointer"
          >
            <Database className="w-3.5 h-3.5 text-[#00B4D8]" />
            WAL Checkpoint & ANALYZE
          </button>
          <button
            onClick={loadUsers}
            className="p-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            title="Refresh users"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {msg && (
        <div className="px-4 py-2.5 rounded-xl bg-[#00B4D8]/12 border border-[#00B4D8]/30 text-xs font-mono-num text-[#00B4D8]">
          {msg}
        </div>
      )}

      {/* Multi-DB DataSource Pool Manager */}
      <div className="bento-card rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <Database className="w-4 h-4 text-[#00B4D8]" />
            Multi-DB SQLite Connection Pool (data/*.db)
          </div>
          <span className="text-[11px] font-mono-num text-[var(--text-muted)]">
            auth.db isolated • Toggle to activate/deactivate
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {datasources.map((ds) => (
            <div
              key={ds.id}
              className={`p-3.5 rounded-xl border transition flex flex-col justify-between gap-2 ${
                ds.active
                  ? 'bg-[#00B4D8]/8 border-[#00B4D8]/40'
                  : 'bg-[var(--bg-subtle)] border-[var(--border-card)] opacity-75'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-mono-num text-xs font-bold text-[var(--text-primary)]">
                    {ds.filename}
                  </div>
                  <div className="text-[10px] font-mono-num text-[var(--text-muted)]">
                    Alias: {ds.id} • {ds.sizeMB} MB
                  </div>
                </div>
                <button
                  onClick={() => toggleDatasource(ds.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono-num font-bold border transition cursor-pointer ${
                    ds.active
                      ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-500'
                      : 'bg-[var(--bg-input)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {ds.active ? 'ACTIVE' : 'INACTIVE'}
                </button>
              </div>
              {ds.active && ds.tables.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1.5 border-t border-[var(--border-card)]">
                  {ds.tables.map((t) => (
                    <span
                      key={t}
                      className="px-1.5 py-0.5 rounded text-[9px] font-mono-num bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border-card)]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Create User Card */}
      <form onSubmit={handleCreateUser} className="bento-card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-[var(--text-primary)]">
          <UserPlus className="w-4 h-4 text-[#FF6B2C]" />
          Create Team Member Account
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center">
          <input
            type="text"
            required
            placeholder="Name (e.g. QA Alice)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B2C]"
          />
          <input
            type="email"
            required
            placeholder="Email (e.g. qa@pulselab.io)"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B2C]"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B2C]"
          />
          <CustomSelect
            value={newRole}
            options={ROLE_OPTIONS}
            onChange={setNewRole}
            align="left"
          />
          <button
            type="submit"
            className="py-2 px-4 rounded-xl bg-[#FF6B2C] text-white text-xs font-semibold hover:opacity-90 transition cursor-pointer"
          >
            + Add User
          </button>
        </div>
      </form>

      {/* Reused DataTable for Users */}
      <DataTable
        title={`Registered Users (${users.length})`}
        subtitle="复用通用 <DataTable /> 组件：支持搜索、排序、多选导出 CSV 及即时修改角色"
        data={users}
        columns={columns}
        getRowId={(u) => u.id}
        quickFilters={[
          { label: 'Admins', value: 'admin', predicate: (u) => u.role === 'admin' },
          { label: 'FW Team', value: 'fw_team', predicate: (u) => u.role === 'fw_team' },
          { label: 'Banned', value: 'banned', predicate: (u) => u.banned },
        ]}
        exportFileName="pulselab_users.csv"
      />
    </div>
  );
};
