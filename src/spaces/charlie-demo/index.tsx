import React, { useState } from 'react';
import { Bug } from 'lucide-react';

const CrashTrigger: React.FC<{ shouldCrash: boolean }> = ({ shouldCrash }) => {
  if (shouldCrash) {
    throw new Error('Simulated TypeError: Cannot read properties of undefined (reading "map") in CharlieSpace');
  }
  return (
    <div className="text-xs text-emerald-500 font-mono-num">
      当前状态正常。点击右上角按钮可模拟组件抛出未捕获异常，验证 ErrorBoundary 是否能保住主站不白屏。
    </div>
  );
};

const CharlieSpace: React.FC = () => {
  const [crash, setCrash] = useState(false);

  return (
    <div className="bento-card rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
            Charlie — 运行时故障隔离演练页
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            独立插件目录：src/spaces/charlie-demo/
          </p>
        </div>
        <button
          onClick={() => setCrash(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FF4D2E] text-white text-xs font-semibold cursor-pointer"
        >
          <Bug className="w-3.5 h-3.5" /> 模拟组件崩溃
        </button>
      </div>
      <CrashTrigger shouldCrash={crash} />
    </div>
  );
};

export default CharlieSpace;
