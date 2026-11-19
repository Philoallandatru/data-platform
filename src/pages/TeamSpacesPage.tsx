import React, { Suspense, useMemo, useState } from 'react';
import { REGISTERED_SPACES } from '../spaces/registry';
import { SpaceErrorBoundary } from '../components/SpaceErrorBoundary';
import { ArrowLeft, FolderGit2, Search, Users } from 'lucide-react';

interface TeamSpacesPageProps {
  activeSpaceId: string;
  onSelectSpace: (spaceId: string) => void;
}

export const TeamSpacesPage: React.FC<TeamSpacesPageProps> = ({
  activeSpaceId,
  onSelectSpace,
}) => {
  const [search, setSearch] = useState('');
  const selectedSpace = useMemo(
    () => REGISTERED_SPACES.find((s) => s.id === activeSpaceId),
    [activeSpaceId]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return REGISTERED_SPACES;
    return REGISTERED_SPACES.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.author.toLowerCase().includes(q) ||
        s.team.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [search]);

  if (selectedSpace) {
    const Comp = selectedSpace.Component;
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => onSelectSpace('directory')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] hover:border-[#FF6B2C] transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> 返回团队空间目录
          </button>
          <span className="text-xs font-mono-num text-[var(--text-muted)]">
            Author: {selectedSpace.author} ({selectedSpace.team}) • /spaces/{selectedSpace.id}
          </span>
        </div>

        <SpaceErrorBoundary key={selectedSpace.id} spaceName={selectedSpace.title}>
          <Suspense
            fallback={
              <div className="bento-card rounded-2xl p-6 text-xs font-mono-num text-[var(--text-muted)]">
                Loading {selectedSpace.title}...
              </div>
            }
          >
            <Comp />
          </Suspense>
        </SpaceErrorBoundary>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bento-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00B4D8]/15 border border-[#00B4D8]/30 flex items-center justify-center text-[#00B4D8]">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">
              团队插件化空间目录 (Team Spaces)
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              通过 <code className="text-[#FF6B2C]">src/spaces/*/</code> 自动扫描注册，每人独立目录互不冲突，并受 ErrorBoundary 隔离保护。
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-xs">
          <Search className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索作者、团队或标签..."
            className="bg-transparent w-48 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelectSpace(s.id)}
            className="bento-card rounded-2xl p-5 text-left flex flex-col justify-between gap-4 hover:border-[#00B4D8]/60 transition cursor-pointer"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono-num font-bold bg-[#00B4D8]/15 text-[#00B4D8]">
                  <FolderGit2 className="w-3 h-3" />
                  src/spaces/{s.id}
                </span>
                <span className="text-[11px] font-mono-num text-[var(--text-muted)]">
                  {s.author} • {s.team}
                </span>
              </div>
              <h3 className="font-display text-base font-bold text-[var(--text-primary)]">
                {s.title}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {s.description}
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[var(--border-card)]">
              {s.tags.map((t) => (
                <span
                  key={t}
                  className="px-2 py-0.5 rounded-md text-[10px] font-mono-num bg-[var(--bg-subtle)] border border-[var(--border-card)] text-[var(--text-muted)]"
                >
                  {t}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
