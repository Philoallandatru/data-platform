import React, { useState } from 'react';
import {
  AI_BOTS,
  ATTACK_VECTORS,
  EDGE_HUBS,
  EdgeHub,
  OUTAGE_INCIDENTS,
  PROTOCOL_METRICS,
} from '../data/radarData';
import { Bot, CheckCircle2, Lock, Radio, Shield, Zap } from 'lucide-react';

export const DDoSVectorsCard: React.FC = () => {
  return (
    <div className="bento-card rounded-2xl p-5 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#FF4D2E]" />
          <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
            Attack Vectors & L7 Mitigation
          </h3>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[11px] font-mono-num font-semibold bg-[#FF4D2E]/15 text-[#FF4D2E] border border-[#FF4D2E]/25">
          99.99% BLOCKED
        </span>
      </div>

      <div className="space-y-3.5">
        {ATTACK_VECTORS.map((v) => (
          <div key={v.name} className="group">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-medium text-[var(--text-primary)] transition">
                {v.name}
              </span>
              <div className="flex items-center gap-2.5 font-mono-num">
                <span className="text-[var(--text-secondary)]">{v.peakGbps} Gbps</span>
                <span className="font-semibold text-[var(--text-primary)] w-9 text-right">{v.share}%</span>
              </div>
            </div>
            <div className="w-full h-2 rounded-full bg-[var(--bg-subtle-hover)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${v.share * 2.2}%`,
                  maxWidth: '100%',
                  background: `linear-gradient(90deg, ${v.color}99, ${v.color})`,
                  boxShadow: `0 0 10px ${v.color}55`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--border-card)] flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
        <span>Autonomous Edge Scrubbing</span>
        <span className="font-mono-num text-emerald-500 font-semibold">0.3ms median overhead</span>
      </div>
    </div>
  );
};

export const AIBotLeaderboardCard: React.FC = () => {
  const [onlyVerified, setOnlyVerified] = useState(false);
  const bots = onlyVerified ? AI_BOTS.filter((b) => b.verified) : AI_BOTS;

  return (
    <div className="bento-card rounded-2xl p-5 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-[#A855F7]" />
          <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
            AI Crawlers & LLM Indexers
          </h3>
        </div>
        <button
          onClick={() => setOnlyVerified((v) => !v)}
          className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition cursor-pointer ${
            onlyVerified
              ? 'bg-[#A855F7]/20 border-[#A855F7]/40 text-[#A855F7]'
              : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          {onlyVerified ? 'Verified Only' : 'All Crawlers'}
        </button>
      </div>

      <div className="space-y-2.5">
        {bots.map((bot) => {
          const min = Math.min(...bot.sparkline);
          const max = Math.max(...bot.sparkline);
          const pts = bot.sparkline
            .map((val, idx) => {
              const x = (idx / (bot.sparkline.length - 1)) * 64;
              const y = 18 - ((val - min) / Math.max(1, max - min)) * 14;
              return `${x},${y}`;
            })
            .join(' ');

          return (
            <div
              key={bot.name}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-card)] hover:border-[var(--border-subtle)] transition"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: bot.color }} />
                  <span className="text-xs font-semibold text-[var(--text-primary)] truncate">{bot.name}</span>
                  {bot.verified && <CheckCircle2 className="w-3 h-3 text-[#00B4D8] shrink-0" />}
                </div>
                <div className="text-[10px] text-[var(--text-muted)] pl-3.5">
                  {bot.operator} • {bot.reqPerMin} req/m
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <svg width="64" height="20" className="overflow-visible">
                  <polyline
                    fill="none"
                    stroke={bot.color}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={pts}
                  />
                </svg>
                <div className="text-right w-14">
                  <div className="font-mono-num text-xs font-bold text-[var(--text-primary)]">{bot.share}%</div>
                  <div
                    className={`font-mono-num text-[10px] font-semibold ${
                      bot.delta >= 0 ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    {bot.delta >= 0 ? `+${bot.delta}%` : `${bot.delta}%`}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const ProtocolMixCard: React.FC = () => {
  const [activeIdx, setActiveIdx] = useState(0);
  const active = PROTOCOL_METRICS[activeIdx];

  return (
    <div className="bento-card rounded-2xl p-5 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#00B4D8]" />
          <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
            Protocol & Encryption Mix
          </h3>
        </div>
        <span className="text-[11px] font-mono-num text-[var(--text-muted)]">EDGE L4/L7</span>
      </div>

      <div className="flex items-center gap-4 my-auto">
        <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
          <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
            {PROTOCOL_METRICS.map((m, idx) => {
              const r = 56 - idx * 10;
              const circ = 2 * Math.PI * r;
              const dash = (m.value / 100) * circ;
              const isSelected = idx === activeIdx;
              return (
                <g key={m.name} className="cursor-pointer" onMouseEnter={() => setActiveIdx(idx)}>
                  <circle
                    cx="70"
                    cy="70"
                    r={r}
                    fill="none"
                    stroke="var(--chart-grid)"
                    strokeWidth="6.5"
                  />
                  <circle
                    cx="70"
                    cy="70"
                    r={r}
                    fill="none"
                    stroke={m.color}
                    strokeWidth={isSelected ? '7.5' : '6'}
                    strokeDasharray={`${dash} ${circ}`}
                    strokeLinecap="round"
                    style={{
                      opacity: isSelected ? 1 : 0.65,
                      transition: 'all 0.3s ease',
                    }}
                  />
                </g>
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="font-mono-num text-lg font-bold text-[var(--text-primary)]">{active.value}%</span>
            <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)]">{active.name}</span>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          {PROTOCOL_METRICS.map((m, idx) => (
            <button
              key={m.name}
              onMouseEnter={() => setActiveIdx(idx)}
              onClick={() => setActiveIdx(idx)}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg border transition cursor-pointer flex items-center justify-between ${
                idx === activeIdx
                  ? 'bg-[var(--bg-subtle-hover)] border-[var(--border-subtle)]'
                  : 'bg-transparent border-transparent hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                <span className="text-xs font-medium text-[var(--text-primary)] truncate">{m.name}</span>
              </div>
              <div className="font-mono-num text-xs font-semibold text-[var(--text-primary)] shrink-0">
                {m.value}% <span className="text-[10px] text-emerald-500">{m.delta}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-[var(--border-card)] text-[11px] text-[var(--text-secondary)] flex items-center justify-between">
        <span>{active.description}</span>
        <span className="font-mono-num text-[#00B4D8] font-semibold">{active.delta} YoY</span>
      </div>
    </div>
  );
};

interface OutageFeedCardProps {
  onFocusHub: (hub: EdgeHub) => void;
  selectedHubId?: string;
}

export const OutageFeedCard: React.FC<OutageFeedCardProps> = ({ onFocusHub, selectedHubId }) => {
  return (
    <div className="bento-card rounded-2xl p-5 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-amber-500" />
          <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
            BGP Anomalies & Network Outages
          </h3>
        </div>
        <span className="text-[11px] text-[var(--text-muted)]">Click to locate on 3D Globe</span>
      </div>

      <div className="space-y-2.5">
        {OUTAGE_INCIDENTS.map((inc) => {
          const hub = EDGE_HUBS.find((h) => h.id === inc.hubId);
          const isSelected = selectedHubId === inc.hubId;
          const badgeStyle =
            inc.severity === 'critical'
              ? 'bg-[#FF4D2E]/15 text-[#FF4D2E] border-[#FF4D2E]/35'
              : inc.severity === 'major'
              ? 'bg-amber-500/15 text-amber-500 border-amber-500/35'
              : 'bg-sky-500/15 text-sky-500 border-sky-500/30';

          return (
            <button
              key={inc.id}
              onClick={() => hub && onFocusHub(hub)}
              className={`w-full text-left p-3 rounded-xl border transition cursor-pointer ${
                isSelected
                  ? 'bg-[var(--bg-subtle-hover)] border-[#FF6B2C]/60 shadow-md'
                  : 'bg-[var(--bg-subtle)] border-[var(--border-card)] hover:border-[var(--border-subtle)] hover:bg-[var(--bg-subtle-hover)]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-xs font-semibold text-[var(--text-primary)] leading-snug">{inc.title}</div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border shrink-0 ${badgeStyle}`}>
                  {inc.severity}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-[var(--text-secondary)]">{inc.cause}</div>
              <div className="mt-2 flex items-center justify-between text-[10px] font-mono-num text-[var(--text-muted)]">
                <span>{inc.asn} • {inc.region}</span>
                <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                  <Zap className="w-3 h-3 text-amber-500" /> -{inc.dropPercent}% • {inc.timestamp}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
