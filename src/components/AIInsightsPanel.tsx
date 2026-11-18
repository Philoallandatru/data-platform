import React from 'react';
import { AIInsight } from '../types/ssd';
import { Bot, Sparkles, Terminal, Trash2 } from 'lucide-react';

interface AIInsightsPanelProps {
  insights: AIInsight[];
  scope: string;
  onDeleted?: () => void;
}

/** Safe, zero-dependency React inline Markdown renderer (`code`, **bold**) */
function renderInlineMarkdown(text: string): React.ReactNode[] {
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return tokens.map((tok, i) => {
    if (tok.startsWith('`') && tok.endsWith('`') && tok.length >= 2) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 mx-0.5 rounded-md bg-[var(--bg-input)] border border-[var(--border-card)] font-mono-num text-[11px] text-[#FF6B2C]"
        >
          {tok.slice(1, -1)}
        </code>
      );
    }
    if (tok.startsWith('**') && tok.endsWith('**') && tok.length >= 4) {
      return (
        <strong key={i} className="font-semibold text-[var(--text-primary)]">
          {tok.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={i}>{tok}</React.Fragment>;
  });
}

function renderMarkdownBlock(md: string): React.ReactNode {
  const lines = md.split(/\r?\n/);
  return (
    <div className="space-y-1.5 text-xs text-[var(--text-secondary)] leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;
        if (trimmed.startsWith('### ')) {
          return (
            <div key={idx} className="font-display font-bold text-xs text-[var(--text-primary)] pt-1">
              {renderInlineMarkdown(trimmed.slice(4))}
            </div>
          );
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="text-[#00B4D8] mt-0.5">•</span>
              <span>{renderInlineMarkdown(trimmed.slice(2))}</span>
            </div>
          );
        }
        return <p key={idx}>{renderInlineMarkdown(line)}</p>;
      })}
    </div>
  );
}

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({
  insights,
  scope,
  onDeleted,
}) => {
  const filtered = insights.filter(
    (item) => scope === 'all' || item.scope === scope || item.scope === 'global'
  );

  const handleDelete = async (id: number) => {
    await fetch(`/api/insights/${id}`, { method: 'DELETE' }).catch(() => {});
    onDeleted?.();
  };

  return (
    <div className="bento-card rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#A855F7] to-[#00B4D8] flex items-center justify-center text-white shadow-md">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
                AI Agent 分析结论展板
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-num font-semibold bg-[#A855F7]/15 text-[#A855F7] border border-[#A855F7]/30">
                MCP / CLI AUTO-SYNC
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              由本地 OpenCode / 千问 Agent 通过 MCP 或 <code className="text-[#FF6B2C]">npm run ai:cli</code> 写入 SQLite 并自动上墙（Scope: <code className="text-[#00B4D8]">{scope}</code>）
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-card)] text-[11px] font-mono-num text-[var(--text-muted)]">
          <Terminal className="w-3.5 h-3.5 text-[#00B4D8]" />
          <span>npm run ai:cli -- publish --scope {scope}</span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border-subtle)] p-6 text-center text-xs text-[var(--text-muted)]">
          当前页面暂无 AI 分析结论。在终端让 OpenCode / 千问调用 MCP <code className="text-[#00B4D8]">publish_ai_insight</code> 或运行 <code className="text-[#FF6B2C]">npm run ai:cli -- publish --scope {scope}</code> 即可 5 秒内自动上墙。
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filtered.map((item) => {
            const sevStyle =
              item.severity === 'critical'
                ? 'bg-[#FF4D2E]/15 text-[#FF4D2E] border-[#FF4D2E]/30'
                : item.severity === 'warning'
                ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                : item.severity === 'improvement'
                ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                : 'bg-[#00B4D8]/15 text-[#00B4D8] border-[#00B4D8]/30';

            return (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-card)] hover:border-[var(--border-subtle)] transition flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono-num font-bold bg-[#A855F7]/15 text-[#A855F7]">
                        <Sparkles className="w-3 h-3" />
                        {item.agent_name}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono-num font-semibold uppercase border ${sevStyle}`}>
                        {item.severity}
                      </span>
                      <span className="text-[10px] font-mono-num text-[var(--text-muted)]">
                        #{item.scope}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-[var(--text-muted)] hover:text-[#FF4D2E] transition cursor-pointer p-1"
                      title="Delete insight"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h4 className="font-display text-sm font-bold text-[var(--text-primary)]">
                    {item.title}
                  </h4>

                  {renderMarkdownBlock(item.summary_md)}
                </div>

                <div className="pt-2.5 border-t border-[var(--border-card)] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {item.metrics.map((m, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-card)] text-[10px] font-mono-num"
                      >
                        <span className="text-[var(--text-muted)] mr-1">{m.label}:</span>
                        <strong className="text-[#00B4D8]">{m.value}</strong>
                      </span>
                    ))}
                  </div>
                  <span className="text-[10px] font-mono-num text-[var(--text-muted)]">
                    {item.created_at}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
