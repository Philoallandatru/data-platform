import React, { useState } from 'react';
import { AI_QUERY_PRESETS, AIQueryPreset, CategoryTab, EDGE_HUBS, EdgeHub } from '../data/radarData';
import { ArrowRight, Sparkles, X } from 'lucide-react';

interface RadarAIExplorerProps {
  onFocusHub: (hub: EdgeHub) => void;
  onSelectTab: (tab: CategoryTab) => void;
}

export const RadarAIExplorer: React.FC<RadarAIExplorerProps> = ({
  onFocusHub,
  onSelectTab,
}) => {
  const [query, setQuery] = useState('');
  const [activeResult, setActiveResult] = useState<AIQueryPreset | null>(null);

  const runQuery = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();

    const matched =
      AI_QUERY_PRESETS.find((p) => p.prompt.toLowerCase() === lower) ||
      (lower.includes('ddos') || lower.includes('attack') || lower.includes('apac')
        ? AI_QUERY_PRESETS[0]
        : lower.includes('ai') || lower.includes('bot') || lower.includes('crawler') || lower.includes('gpt')
        ? AI_QUERY_PRESETS[1]
        : lower.includes('http') || lower.includes('tls') || lower.includes('europe') || lower.includes('protocol')
        ? AI_QUERY_PRESETS[2]
        : {
            prompt: trimmed,
            headline: `Telemetry Synthesis: "${trimmed}"`,
            summary:
              'Global edge telemetry remains nominal at 94.2M req/sec across 330+ PoPs. Automated L7 mitigation is actively scrubbing 1.48 Tbps in APAC while AI crawler traffic accounts for 18.4% of automated requests.',
            metrics: [
              { label: 'Global RPS', value: '94.2M/s', accent: '#00B4D8' },
              { label: 'Mitigation', value: '99.99%', accent: '#10B981' },
              { label: 'Median p50', value: '12.4 ms', accent: '#FF6B2C' },
            ],
            focusHubId: 'nyc',
            recommendedTab: 'Overview' as CategoryTab,
          });

    setQuery(trimmed);
    setActiveResult(matched);

    if (matched.focusHubId) {
      const hub = EDGE_HUBS.find((h) => h.id === matched.focusHubId);
      if (hub) onFocusHub(hub);
    }
  };

  return (
    <div className="bento-card rounded-2xl p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          runQuery(query);
        }}
        className="flex items-center gap-2.5"
      >
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF6B2C] to-[#A855F7] flex items-center justify-center shrink-0 shadow-lg shadow-[#FF6B2C]/20">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask Radar AI (e.g. 'Why did APAC DDoS spike at 14:00?' or 'Compare AI crawlers')..."
          className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
        />
        <button
          type="submit"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--bg-subtle-hover)] hover:bg-[#FF6B2C] text-xs font-semibold text-[var(--text-primary)] hover:text-white transition cursor-pointer"
        >
          Analyze <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-2 mt-3">
        <span className="text-[11px] text-[var(--text-muted)]">Suggested:</span>
        {AI_QUERY_PRESETS.map((preset) => (
          <button
            key={preset.prompt}
            type="button"
            onClick={() => runQuery(preset.prompt)}
            className="px-2.5 py-1 rounded-full text-[11px] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] border border-[var(--border-card)] hover:border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
          >
            {preset.prompt}
          </button>
        ))}
      </div>

      {activeResult && (
        <div className="mt-3.5 pt-3.5 border-t border-[var(--border-card)]">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-[#FF6B2C] uppercase tracking-wider">
                Radar AI Insight
              </div>
              <h4 className="font-display text-sm font-bold text-[var(--text-primary)] mt-0.5">
                {activeResult.headline}
              </h4>
            </div>
            <button
              onClick={() => setActiveResult(null)}
              className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle-hover)] cursor-pointer"
              title="Close insight"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-1.5">{activeResult.summary}</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {activeResult.metrics.map((m) => (
                <div
                  key={m.label}
                  className="px-2.5 py-1 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-card)] text-[11px]"
                >
                  <span className="text-[var(--text-secondary)] mr-1.5">{m.label}:</span>
                  <span className="font-mono-num font-bold" style={{ color: m.accent }}>
                    {m.value}
                  </span>
                </div>
              ))}
            </div>
            {activeResult.recommendedTab && (
              <button
                onClick={() => onSelectTab(activeResult.recommendedTab!)}
                className="text-[11px] font-semibold text-[#00B4D8] hover:underline cursor-pointer"
              >
                Open {activeResult.recommendedTab} View →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
