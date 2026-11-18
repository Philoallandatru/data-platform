import React from 'react';
import { CustomPageConfig } from '../config/navigation';
import { PlaceholderSlot } from '../components/PlaceholderSlot';
import { FilePlus2, Sparkles } from 'lucide-react';

interface CustomBlankPageProps {
  page: CustomPageConfig;
  modelName: string;
  firmwareVersion: string;
}

export const CustomBlankPage: React.FC<CustomBlankPageProps> = ({
  page,
  modelName,
  firmwareVersion,
}) => {
  return (
    <div className="space-y-5">
      {/* Blank Workspace Header */}
      <div className="bento-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF6B2C]/15 border border-[#FF6B2C]/30 flex items-center justify-center text-[#FF6B2C] shrink-0">
            <FilePlus2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono-num font-bold bg-[#FF6B2C]/15 text-[#FF6B2C] border border-[#FF6B2C]/30">
                CUSTOM WORKSPACE • {page.badge}
              </span>
              <span className="text-xs font-mono-num text-[var(--text-muted)]">
                Owner: {page.ownerHint}
              </span>
            </div>
            <h2 className="font-display text-xl font-bold text-[var(--text-primary)] mt-1">
              {page.label}
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">{page.description}</p>
          </div>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-card)] text-xs font-mono-num text-[var(--text-secondary)] flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#00B4D8]" />
          Context: {modelName} • {firmwareVersion}
        </div>
      </div>

      {/* Blank Grid Canvas with Extensible Slots */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8">
          <PlaceholderSlot
            slotId={`${page.id}_primary_chart`}
            title="主可视化区域 (Primary Chart Canvas)"
            description="空白主画布：可从 VizLibrary 或 DataTable 中挑选任意组件挂载至此。"
            plannedWidgets={['Spline / Radar / Scatter', '3D WebGL Topology']}
            minHeight="min-h-[260px]"
          />
        </div>
        <div className="lg:col-span-4">
          <PlaceholderSlot
            slotId={`${page.id}_kpi_summary`}
            title="侧边指标卡 (KPI / Gauge)"
            description="空白侧边栏位：适合放置核心汇总数值、环形仪表或状态徽章。"
            plannedWidgets={['KPI Bento Tiles', 'Ring Gauge']}
            minHeight="min-h-[260px]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <PlaceholderSlot
          slotId={`${page.id}_secondary_left`}
          title="自定义明细区 (Table / Matrix)"
          description="可直接使用 <DataTable /> 挂载自定义 SQLite 表或对比矩阵。"
          plannedWidgets={['<DataTable />', 'Heatmap Matrix']}
          minHeight="min-h-[200px]"
        />
        <PlaceholderSlot
          slotId={`${page.id}_secondary_right`}
          title="扩展分析区 (Custom Analysis)"
          description="预留给团队成员扩展专属分析逻辑、导出脚本或告警规则。"
          plannedWidgets={['Custom Script', 'Alert Feed']}
          minHeight="min-h-[200px]"
        />
      </div>
    </div>
  );
};
