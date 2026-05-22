// SnapshotGrid.tsx

import { useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
} from 'ag-grid-community';
import type {
  ColDef,
  ColGroupDef,
  CellClassParams,
  CellStyle,
  ValueFormatterParams,
} from 'ag-grid-community';
import Box from '@mui/material/Box';
// import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
// import Tooltip from '@mui/material/Tooltip';
// import CalendarTodayIcon from '@mui/icons-material/CalendarTodayOutlined';
import {
  MOCK_SNAPSHOT,
  type Snapshot,
  type SnapshotRow,
  type JobGroupDef,
  type StatusFact,
  type JobStatusFact,
} from './snapshotMockData.ts';

// Register at module scope — covers SSR and non-split builds
ModuleRegistry.registerModules([AllCommunityModule]);

// Theme built once outside component — stable reference, no re-creation on render
const agTheme = themeQuartz.withParams({
  headerBackgroundColor:      '#BDD7EE',
  headerTextColor:            '#1F3864',
  headerFontSize:             11,
  headerFontWeight:           500,
  fontSize:                   12,
  rowHeight:                  26,
  headerHeight:               26,
  cellHorizontalPaddingScale: 0.5,
  borderColor:                '#BFBFBF',
  rowBorder:                  true,
  columnBorder:               true,
  oddRowBackgroundColor:      '#EBF3FB',
  backgroundColor:            '#FFFFFF',
  rowHoverColor:              '#CCE4F7',
  fontFamily:                 "'IBM Plex Sans', 'Segoe UI', sans-serif",
});

// ── Colour tokens ─────────────────────────────────────────────────────────────
const C = {
  h1Bg:    '#1F3864',
  h2Bg:    '#2E75B6',
  totalBg: '#FFF2CC',
  totalFg: '#7F6000',
  pctBg:   '#E2EFDA',
  pctFg:   '#375623',
  border:  '#BFBFBF',
} as const;

// ── Flat row type ─────────────────────────────────────────────────────────────
type FlatRow = Record<string, string | number | null | boolean>;

function flatKey(...parts: string[]): string {
  return parts.join('.');
}

function flattenRow(row: SnapshotRow, jobGroups: JobGroupDef[]): FlatRow {
  const out: FlatRow = {
    _isTotal:       row.label != null,
    _label:         row.label ?? null,
    org_unit_key:   row.org_unit_key   ?? '',
    department_key: row.department_key ?? '',
  };
  for (const jg of jobGroups) {
    const { id, config } = jg;
    const jgData = (row.job_groups ?? {})[id] ?? {};
    if (config.target_mode === 'total') {
      out[flatKey(id, 'target')] = (jgData.target as number) ?? null;
    } else {
      const t = jgData.target as StatusFact | undefined;
      out[flatKey(id, 'target', 'pa')] = t?.pa ?? null;
      out[flatKey(id, 'target', 'po')] = t?.po ?? null;
    }
    if (config.fact_mode === 'by_status') {
      const f = jgData.fact as StatusFact | undefined;
      out[flatKey(id, 'fact', 'pa')] = f?.pa ?? null;
      out[flatKey(id, 'fact', 'po')] = f?.po ?? null;
    } else {
      const f = jgData.fact as JobStatusFact | undefined;
      for (const job of config.jobs) {
        const jf = f?.[job.key];
        out[flatKey(id, 'fact', job.key, 'pa')] = jf?.pa ?? null;
        out[flatKey(id, 'fact', job.key, 'po')] = jf?.po ?? null;
      }
    }
    out[flatKey(id, 'pct')] = jgData.pct ?? null;
  }
  const s = row.summary ?? {};
  out['summary.base_target']   = s.base_target   ?? null;
  out['summary.object_target'] = s.object_target ?? null;
  out['summary.fact']          = s.fact          ?? null;
  out['summary.pct']           = s.pct           ?? null;
  return out;
}

// ── Cell styles ───────────────────────────────────────────────────────────────
function numCellStyle(p: CellClassParams): CellStyle {
  const isTotal = p.data?._isTotal as boolean;
  return {
    textAlign:  'center',
    fontWeight: isTotal ? 700 : 400,
    color:      isTotal ? C.totalFg : 'inherit',
    background: isTotal ? C.totalBg : 'transparent',
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
  };
}

function pctCellStyle(p: CellClassParams): CellStyle {
  const isTotal = p.data?._isTotal as boolean;
  return {
    textAlign:  'center',
    background: C.pctBg,
    color:      C.pctFg,
    fontWeight: isTotal ? 700 : 500,
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
  };
}

const pctFormatter = (p: ValueFormatterParams): string =>
    p.value != null ? `${Math.round((p.value as number) * 100)}%` : '—';

const numFormatter = (p: ValueFormatterParams): string =>
    p.value != null ? String(p.value) : '—';

// ── Column definitions ────────────────────────────────────────────────────────
function buildColumnDefs(jobGroups: JobGroupDef[]): (ColDef | ColGroupDef)[] {
  // const leaf = (headerName: string, field: string, isPct = false): ColDef => ({
  //   headerName,
  //   field,
  //   width:          isPct ? 66 : 52,
  //   minWidth:       isPct ? 56 : 44,
  //   valueFormatter: isPct ? pctFormatter : numFormatter,
  //   cellStyle:      isPct ? pctCellStyle : numCellStyle,
  //   sortable:       true,
  //   resizable:      true,
  // });
  const leaf = (headerName: string, field: string, isPct = false): ColDef => ({
    headerName,
    field,
    flex: isPct ? 1 : 1.5,   // distribute space
    minWidth: 70,
    valueFormatter: isPct ? pctFormatter : numFormatter,
    cellStyle: isPct ? pctCellStyle : numCellStyle,
    sortable: true,
    resizable: true,
  });

  const cols: (ColDef | ColGroupDef)[] = [];

  cols.push({
    headerName:  "Об'єкт",
    headerClass: 'hdr-l1',
    children: [
      {
        headerName:     'Підрозділ',
        field:          'org_unit_key',
        width:          110,
        pinned:         'left' as const,
        resizable:      true,
        sortable:       true,
        valueFormatter: (p: ValueFormatterParams) =>
            (p.data?._isTotal as boolean)
                ? (p.data._label as string ?? 'Всього')
                : (p.value as string ?? ''),
        cellStyle: (p: CellClassParams): CellStyle => ({
          fontWeight: (p.data?._isTotal as boolean) ? 700 : 600,
          color:      (p.data?._isTotal as boolean) ? C.totalFg : C.h2Bg,
          background: (p.data?._isTotal as boolean) ? C.totalBg : 'transparent',
        }),
      } as ColDef,
      {
        headerName:     'Відділ',
        field:          'department_key',
        width:          82,
        pinned:         'left' as const,
        resizable:      true,
        sortable:       true,
        valueFormatter: (p: ValueFormatterParams) =>
            (p.data?._isTotal as boolean) ? '' : (p.value as string ?? ''),
        cellStyle: numCellStyle,
      } as ColDef,
    ],
  } as ColGroupDef);

  for (const jg of jobGroups) {
    const { id, key, config } = jg;
    const hasSubJobs = config.jobs.length > 0;
    const l2: (ColDef | ColGroupDef)[] = [];

    if (config.target_mode === 'total') {
      const tLeaf = leaf('ціль', flatKey(id, 'target'));
      l2.push(hasSubJobs
          ? { headerName: 'ціль', headerClass: 'hdr-l2', children: [tLeaf] } as ColGroupDef
          : tLeaf);
    } else {
      l2.push({
        headerName: 'ціль', headerClass: 'hdr-l2',
        children: [
          leaf('Па', flatKey(id, 'target', 'pa')),
          leaf('По', flatKey(id, 'target', 'po')),
        ],
      } as ColGroupDef);
    }

    if (config.fact_mode === 'by_status') {
      l2.push({
        headerName: 'реалізовано', headerClass: 'hdr-l2',
        children: [
          leaf('Па', flatKey(id, 'fact', 'pa')),
          leaf('По', flatKey(id, 'fact', 'po')),
        ],
      } as ColGroupDef);
    } else {
      for (const job of config.jobs) {
        l2.push({
          headerName: job.key, headerClass: 'hdr-l2',
          children: [
            leaf('Па', flatKey(id, 'fact', job.key, 'pa')),
            leaf('По', flatKey(id, 'fact', job.key, 'po')),
          ],
        } as ColGroupDef);
      }
    }

    l2.push(leaf('% вик.', flatKey(id, 'pct'), true));
    cols.push({ headerName: key, headerClass: 'hdr-l1', children: l2 } as ColGroupDef);
  }

  cols.push({
    headerName: 'Всього', headerClass: 'hdr-l1',
    children: [
      leaf('ціль базова',   'summary.base_target'),
      leaf("ціль об'єкта",  'summary.object_target'),
      leaf('реалізовано',   'summary.fact'),
      leaf('% вик.',        'summary.pct', true),
    ],
  } as ColGroupDef);

  return cols;
}

// ── Row style ─────────────────────────────────────────────────────────────────
function getRowStyle(params: { data?: FlatRow; rowIndex: number }): CellStyle {
  if (params.data?._isTotal) return { background: C.totalBg, fontWeight: 700 };
  return params.rowIndex % 2 === 0 ? {} : { background: '#FFFFFF' };
}

// ── Header group CSS (themeQuartz params don't cover per-level group colours) ─
const HEADER_CSS = `
  .ag-theme-snapshot .ag-header-group-cell.hdr-l1,
  .ag-theme-snapshot .ag-header-group-cell.hdr-l1 .ag-header-group-cell-label {
    background: ${C.h1Bg} !important;
    color: #ffffff !important;
    font-weight: 700;
    justify-content: center;
  }
  .ag-theme-snapshot .ag-header-group-cell.hdr-l2,
  .ag-theme-snapshot .ag-header-group-cell.hdr-l2 .ag-header-group-cell-label {
    background: ${C.h2Bg} !important;
    color: #ffffff !important;
    font-weight: 600;
    justify-content: center;
  }
  .ag-theme-snapshot .ag-header-cell-label { justify-content: center; }
  .ag-theme-snapshot .ag-pinned-left-cols-container .ag-cell:last-child {
    border-right: 2px solid ${C.h2Bg} !important;
  }
`;

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  snapshot?: Snapshot;
}

export default function SnapshotGrid({ snapshot = MOCK_SNAPSHOT }: Props) {
  const gridRef = useRef<AgGridReact>(null);
  const { snapshot_meta, essences, grand_totals, data } = snapshot;
  const jobGroups = essences.job_groups;

  const columnDefs = useMemo(() => buildColumnDefs(jobGroups), [jobGroups]);

  const rowData = useMemo<FlatRow[]>(() => [
    flattenRow(grand_totals, jobGroups),
    ...data.map((r) => flattenRow(r, jobGroups)),
  ], [grand_totals, data, jobGroups]);

  const defaultColDef = useMemo<ColDef>(() => ({
    resizable: true,
    sortable:  true,
  }), []);

  // const periodLabel =
  //     `${snapshot_meta.period.year} / ${String(snapshot_meta.period.month).padStart(2, '0')}`;

  return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
        <style>{HEADER_CSS}</style>

        {/* Toolbar */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1, background: C.h1Bg, flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.875rem', letterSpacing: '0.03em' }}>
              Staffing Snapshot
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.7rem', mt: '1px' }}>
              {snapshot_meta.description}
            </Typography>
          </Box>
          {/*<Chip*/}
          {/*    icon={<CalendarTodayIcon sx={{ fontSize: '0.75rem !important', color: '#fff !important' }} />}*/}
          {/*    label={periodLabel}*/}
          {/*    size="small"*/}
          {/*    sx={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 600, fontSize: '0.72rem', border: '1px solid rgba(255,255,255,0.25)' }}*/}
          {/*/>*/}
          {/*<Chip*/}
          {/*    label={`${data.length} рядків`}*/}
          {/*    size="small"*/}
          {/*    sx={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.65)', fontSize: '0.7rem', border: '1px solid rgba(255,255,255,0.15)' }}*/}
          {/*/>*/}
        </Box>

        {/* Legend */}
        {/*<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 0.5, background: '#E8EDF2', borderBottom: `1px solid ${C.border}`, flexShrink: 0, flexWrap: 'wrap' }}>*/}
        {/*  {([*/}
        {/*    { bg: C.totalBg, label: "Всього по об'єктам" },*/}
        {/*    { bg: C.pctBg,   label: '% виконання'        },*/}
        {/*    { bg: '#EBF3FB', label: 'Рядок даних'        },*/}
        {/*  ] as const).map((item) => (*/}
        {/*      <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>*/}
        {/*        <Box sx={{ width: 10, height: 10, borderRadius: '2px', background: item.bg, border: `1px solid ${C.border}` }} />*/}
        {/*        <Typography sx={{ fontSize: '0.68rem', color: '#555' }}>{item.label}</Typography>*/}
        {/*      </Box>*/}
        {/*  ))}*/}
        {/*  <Box sx={{ ml: 'auto', display: 'flex', gap: 1.5 }}>*/}
        {/*    {([*/}
        {/*      { key: 'Па', tip: 'Paré — певна ймовірність утримання посади у вказаний період' },*/}
        {/*      { key: 'По', tip: 'Potential — здатен зайняти посаду у вказаний період'         },*/}
        {/*    ] as const).map((s) => (*/}
        {/*        <Tooltip key={s.key} title={s.tip} arrow placement="top">*/}
        {/*          <Typography sx={{ fontSize: '0.68rem', color: C.h2Bg, fontWeight: 700, cursor: 'help', borderBottom: `1px dashed ${C.h2Bg}` }}>*/}
        {/*            {s.key}*/}
        {/*          </Typography>*/}
        {/*        </Tooltip>*/}
        {/*    ))}*/}
        {/*  </Box>*/}
        {/*</Box>*/}

        {/* Grid */}
        <Box className="ag-theme-snapshot" sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <AgGridReact
              ref={gridRef}
              theme={agTheme}
              modules={[AllCommunityModule]}
              onGridReady={(params) => {
                params.api.sizeColumnsToFit();
              }}
              suppressFieldDotNotation={true}
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              getRowStyle={getRowStyle as never}
              animateRows
              enableCellTextSelection
              domLayout="normal"
              getRowId={(p) =>
                  (p.data as FlatRow)._isTotal
                      ? '__total__'
                      : `${(p.data as FlatRow).org_unit_key}__${(p.data as FlatRow).department_key}`
              }
          />
        </Box>
      </Box>
  );
}