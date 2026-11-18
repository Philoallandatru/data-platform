import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface SpaceErrorBoundaryProps {
  spaceName: string;
  children: React.ReactNode;
}

interface SpaceErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

/**
 * Isolates runtime exceptions inside individual space/page components
 * so one author's bug never crashes the main navigation or other spaces.
 */
export class SpaceErrorBoundary extends React.Component<
  SpaceErrorBoundaryProps,
  SpaceErrorBoundaryState
> {
  constructor(props: SpaceErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): SpaceErrorBoundaryState {
    return { hasError: true, errorMessage: error?.message || 'Unexpected render error' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bento-card rounded-2xl p-6 border border-[#FF4D2E]/40 space-y-3">
          <div className="flex items-center gap-2.5 text-[#FF4D2E]">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h3 className="font-display text-base font-bold">
              页面模块渲染异常（已安全隔离）：{this.props.spaceName}
            </h3>
          </div>
          <p className="text-xs font-mono-num text-[var(--text-secondary)] bg-[var(--bg-subtle)] p-3 rounded-xl border border-[var(--border-card)]">
            {this.state.errorMessage}
          </p>
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>ErrorBoundary 已拦截该模块崩溃，其余页面与导航栏不受影响。</span>
            <button
              onClick={() => this.setState({ hasError: false, errorMessage: '' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FF6B2C] text-white font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> 重试渲染
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
