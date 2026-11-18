import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CustomSelect } from './CustomSelect';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  Check,
  CheckSquare,
  Columns3,
  Copy,
  Download,
  Search,
  Square,
  MinusSquare,
  X,
} from 'lucide-react';

export interface ColumnDef<T> {
  key: string;
  header: string;
  accessor: (row: T) => string | number;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  visible?: boolean;
}

export interface QuickFilterOption<T> {
  label: string;
  value: string;
  predicate: (row: T) => boolean;
}

interface DataTableProps<T> {
  title: string;
  subtitle?: string;
  data: T[];
  columns: ColumnDef<T>[];
  getRowId: (row: T) => string | number;
  quickFilters?: QuickFilterOption<T>[];
  onRowClick?: (row: T) => void;
  selectedRowId?: string | number | null;
  defaultPageSize?: number;
  exportFileName?: string;
}

type SortDir = 'asc' | 'desc' | null;

export function DataTable<T>({
  title,
  subtitle,
  data,
  columns: initialColumns,
  getRowId,
  quickFilters = [],
  onRowClick,
  selectedRowId,
  defaultPageSize = 10,
  exportFileName = 'telemetry_export.csv',
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // Column order & visibility state (syncs when column schema changes)
  const initialColumnsRef = useRef(initialColumns);
  initialColumnsRef.current = initialColumns;
  const colSchemaKey = initialColumns.map((c) => c.key).join('|');
  const [colOrder, setColOrder] = useState<string[]>(() => initialColumns.map((c) => c.key));
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(
    () => new Set(initialColumns.filter((c) => c.visible === false).map((c) => c.key))
  );
  const [showColMenu, setShowColMenu] = useState(false);
  const [copiedAi, setCopiedAi] = useState(false);

  useEffect(() => {
    const cols = initialColumnsRef.current;
    setColOrder(cols.map((c) => c.key));
    setHiddenCols(new Set(cols.filter((c) => c.visible === false).map((c) => c.key)));
    setSortKey(null);
    setSortDir(null);
    setPage(1);
    setSelectedIds(new Set());
  }, [colSchemaKey]);

  const orderedColumns = useMemo(() => {
    const map = new Map(initialColumns.map((c) => [c.key, c]));
    return colOrder
      .map((k) => map.get(k))
      .filter((c): c is ColumnDef<T> => Boolean(c));
  }, [initialColumns, colOrder]);

  const visibleColumns = useMemo(
    () => orderedColumns.filter((c) => !hiddenCols.has(c.key)),
    [orderedColumns, hiddenCols]
  );

  // 1. Filter by quick filter & global search
  const filteredData = useMemo(() => {
    let rows = data;
    if (activeFilter !== 'ALL') {
      const f = quickFilters.find((q) => q.value === activeFilter);
      if (f) rows = rows.filter(f.predicate);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((row) =>
        orderedColumns.some((col) => String(col.accessor(row)).toLowerCase().includes(q))
      );
    }
    return rows;
  }, [data, activeFilter, quickFilters, search, orderedColumns]);

  // 2. Sort
  const sortedData = useMemo(() => {
    if (!sortKey || !sortDir) return filteredData;
    const col = orderedColumns.find((c) => c.key === sortKey);
    if (!col) return filteredData;

    return [...filteredData].sort((a, b) => {
      const va = col.accessor(a);
      const vb = col.accessor(b);
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va;
      }
      return sortDir === 'asc'
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
  }, [filteredData, sortKey, sortDir, orderedColumns]);

  // 3. Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedData = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, safePage, pageSize]);

  const handleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('desc');
    } else if (sortDir === 'desc') {
      setSortDir('asc');
    } else {
      setSortKey(null);
      setSortDir(null);
    }
  };

  // Multi-select logic
  const pageIds = pagedData.map(getRowId);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const somePageSelected = pageIds.some((id) => selectedIds.has(id)) && !allPageSelected;

  const toggleSelectPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    const allIds = sortedData.map(getRowId);
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
    setSelectedIds(allSelected ? new Set() : new Set(allIds));
  };

  const toggleRow = (id: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const moveColumn = (key: string, dir: -1 | 1) => {
    setColOrder((prev) => {
      const idx = prev.indexOf(key);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return copy;
    });
  };

  const toggleColVisibility = (key: string) => {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else if (visibleColumns.length > 1) next.add(key);
      return next;
    });
  };

  const exportCsv = () => {
    const targetRows =
      selectedIds.size > 0
        ? sortedData.filter((r) => selectedIds.has(getRowId(r)))
        : sortedData;
    const headers = visibleColumns.map((c) => `"${c.header}"`).join(',');
    const lines = targetRows.map((r) =>
      visibleColumns.map((c) => `"${String(c.accessor(r)).replace(/"/g, '""')}"`).join(',')
    );
    const blob = new Blob([[headers, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyForAi = async () => {
    const targetRows =
      selectedIds.size > 0
        ? sortedData.filter((r) => selectedIds.has(getRowId(r)))
        : sortedData.slice(0, 60);
    const headers = visibleColumns.map((c) => c.header);
    const mdHeader = `| ${headers.join(' | ')} |`;
    const mdSep = `| ${headers.map(() => '---').join(' | ')} |`;
    const mdRows = targetRows.map(
      (r) => `| ${visibleColumns.map((c) => String(c.accessor(r))).join(' | ')} |`
    );
    const prompt = [
      `### ${title} (${targetRows.length} rows)`,
      '请分析以下 SSD 遥测数据表的关键性能/功耗趋势、异常点并给出结论：',
      '',
      mdHeader,
      mdSep,
      ...mdRows,
    ].join('\n');

    await navigator.clipboard.writeText(prompt);
    setCopiedAi(true);
    setTimeout(() => setCopiedAi(false), 2000);
  };

  return (
    <div className="bento-card rounded-2xl p-5 space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">{subtitle}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 relative">
          {/* Search Input */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-xs">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Filter rows..."
              className="bg-transparent w-36 sm:w-44 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Column Config Popover */}
          <button
            onClick={() => setShowColMenu((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
          >
            <Columns3 className="w-3.5 h-3.5 text-[#00B4D8]" />
            Columns
          </button>

          {/* Copy Markdown Table for AI Agent */}
          <button
            onClick={copyForAi}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
            title="Copy filtered/selected rows as Markdown prompt for AI analysis"
          >
            {copiedAi ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500">Copied MD!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#A855F7]" />
                Copy for AI
              </>
            )}
          </button>

          {/* Export CSV */}
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
            title="Export filtered or selected rows to CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#FF6B2C]" />
            {selectedIds.size > 0 ? `Export (${selectedIds.size})` : 'Export CSV'}
          </button>

          {/* Column Reorder & Visibility Menu */}
          {showColMenu && (
            <div className="absolute right-0 top-10 z-30 w-64 rounded-xl bg-[var(--bg-tooltip)] border border-[var(--border-subtle)] p-3 shadow-2xl backdrop-blur-xl space-y-1.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border-card)] text-[11px] font-semibold text-[var(--text-primary)]">
                <span>Arrange & Toggle Columns</span>
                <button onClick={() => setShowColMenu(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {orderedColumns.map((col, idx) => {
                const isVis = !hiddenCols.has(col.key);
                return (
                  <div key={col.key} className="flex items-center justify-between gap-2 text-xs py-0.5">
                    <label className="flex items-center gap-2 cursor-pointer text-[var(--text-primary)] truncate">
                      <input
                        type="checkbox"
                        checked={isVis}
                        onChange={() => toggleColVisibility(col.key)}
                        className="accent-[#FF6B2C]"
                      />
                      <span className="truncate">{col.header}</span>
                    </label>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => moveColumn(col.key, -1)}
                        disabled={idx === 0}
                        className="p-1 rounded hover:bg-[var(--bg-subtle-hover)] disabled:opacity-30 cursor-pointer"
                        title="Move left"
                      >
                        <ArrowLeft className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => moveColumn(col.key, 1)}
                        disabled={idx === orderedColumns.length - 1}
                        className="p-1 rounded hover:bg-[var(--bg-subtle-hover)] disabled:opacity-30 cursor-pointer"
                        title="Move right"
                      >
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick Filter Pills & Selection Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {quickFilters.length > 0 && (
            <>
              <button
                onClick={() => {
                  setActiveFilter('ALL');
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition cursor-pointer ${
                  activeFilter === 'ALL'
                    ? 'bg-[#FF6B2C]/15 border-[#FF6B2C] text-[var(--text-primary)]'
                    : 'bg-[var(--bg-subtle)] border-[var(--border-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                All ({data.length})
              </button>
              {quickFilters.map((qf) => (
                <button
                  key={qf.value}
                  onClick={() => {
                    setActiveFilter(qf.value);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition cursor-pointer ${
                    activeFilter === qf.value
                      ? 'bg-[#FF6B2C]/15 border-[#FF6B2C] text-[var(--text-primary)]'
                      : 'bg-[var(--bg-subtle)] border-[var(--border-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {qf.label}
                </button>
              ))}
            </>
          )}
        </div>

        {/* Multi-Select Status Bar */}
        <div className="flex items-center gap-2 text-[11px] font-mono-num">
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#00B4D8]/12 border border-[#00B4D8]/30 text-[#00B4D8]">
              <span>{selectedIds.size} selected</span>
              <button
                onClick={toggleSelectAllFiltered}
                className="underline hover:text-[var(--text-primary)] cursor-pointer"
              >
                {selectedIds.size === sortedData.length ? 'Clear all' : `Select all ${sortedData.length}`}
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                title="Clear selection"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-card)] text-[10px] font-mono-num uppercase text-[var(--text-muted)]">
              <th className="py-2.5 pr-2 w-8">
                <button
                  onClick={toggleSelectPage}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer flex items-center"
                  title="Select / Deselect current page"
                >
                  {allPageSelected ? (
                    <CheckSquare className="w-4 h-4 text-[#FF6B2C]" />
                  ) : somePageSelected ? (
                    <MinusSquare className="w-4 h-4 text-[#FF6B2C]" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </th>
              {visibleColumns.map((col) => {
                const isSorted = sortKey === col.key;
                const alignCls =
                  col.align === 'right'
                    ? 'text-right justify-end'
                    : col.align === 'center'
                    ? 'text-center justify-center'
                    : 'text-left justify-start';
                return (
                  <th key={col.key} className={`py-2.5 px-2.5 whitespace-nowrap`}>
                    {col.sortable !== false ? (
                      <button
                        onClick={() => handleSort(col.key)}
                        className={`w-full flex items-center gap-1 font-semibold hover:text-[var(--text-primary)] transition cursor-pointer ${alignCls} ${
                          isSorted ? 'text-[#FF6B2C]' : ''
                        }`}
                      >
                        <span>{col.header}</span>
                        {isSorted && sortDir === 'asc' ? (
                          <ArrowUp className="w-3 h-3" />
                        ) : isSorted && sortDir === 'desc' ? (
                          <ArrowDown className="w-3 h-3" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-45" />
                        )}
                      </button>
                    ) : (
                      <div className={`flex items-center ${alignCls}`}>{col.header}</div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--border-card)] text-xs">
            {pagedData.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + 1}
                  className="py-8 text-center text-[var(--text-muted)]"
                >
                  No matching rows found.
                </td>
              </tr>
            ) : (
              pagedData.map((row) => {
                const id = getRowId(row);
                const isChecked = selectedIds.has(id);
                const isFocused = selectedRowId !== undefined && selectedRowId === id;
                return (
                  <tr
                    key={id}
                    onClick={() => onRowClick?.(row)}
                    className={`transition ${onRowClick ? 'cursor-pointer' : ''} ${
                      isFocused
                        ? 'bg-[#FF6B2C]/12'
                        : isChecked
                        ? 'bg-[#00B4D8]/8'
                        : 'hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    <td className="py-2.5 pr-2">
                      <button
                        onClick={(e) => toggleRow(id, e)}
                        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer flex items-center"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-[#FF6B2C]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    {visibleColumns.map((col) => (
                      <td
                        key={col.key}
                        className={`py-2.5 px-2.5 ${
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                        }`}
                      >
                        {col.render ? col.render(row) : String(col.accessor(row))}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border-card)] text-[11px] font-mono-num text-[var(--text-secondary)]">
        <div className="flex items-center gap-2">
          <span>
            Showing {sortedData.length === 0 ? 0 : (safePage - 1) * pageSize + 1}–
            {Math.min(safePage * pageSize, sortedData.length)} of {sortedData.length} rows
          </span>
          <CustomSelect
            value={String(pageSize)}
            onChange={(val) => {
              setPageSize(Number(val));
              setPage(1);
            }}
            align="left"
            className="w-28"
            options={[10, 25, 50, 100].map((sz) => ({
              value: String(sz),
              label: `${sz} / page`,
            }))}
          />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="px-2.5 py-1 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-card)] disabled:opacity-35 hover:text-[var(--text-primary)] cursor-pointer"
          >
            Prev
          </button>
          <span className="px-2">
            {safePage} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="px-2.5 py-1 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-card)] disabled:opacity-35 hover:text-[var(--text-primary)] cursor-pointer"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
