// src/components/developer/db_tables/DbTablesPage.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Drawer,
    FormControlLabel,
    IconButton,
    InputAdornment,
    Paper,
    Snackbar,
    Stack,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import { useTheme } from '../../theme/ThemeContext';
import { useDataGridLocale } from '../../../hooks/useDataGridLocale';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import {
    autoDescribe,
    deleteTableRow,
    fetchColumnPrefs,
    fetchDbTables,
    fetchTableRows,
    refreshDbTables,
    saveColumnPrefs,
    updateDbTable,
    updateTableRow,
    type ColumnInfo,
    type ColumnPref,
    type DbTableInfo,
    type TableRowsResponse,
} from './dbTableApi';
import { DB_TABLES_QK } from '../../../utils/queryKeys';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function colorFromString(s: string): string {
    let hash = 0;
    for (let i = 0; i < s.length; i++) { hash = s.charCodeAt(i) + ((hash << 5) - hash); hash |= 0; }
    const h = ((hash % 360) + 360) % 360;
    return `hsl(${h}, ${50 + (hash % 20)}%, ${42 + (hash % 16)}%)`;
}

function buildFkColorMap(tables: DbTableInfo[]): Record<string, string> {
    const map: Record<string, string> = {};
    // One colour per FK‑target pair — both FK and PK columns use the same key
    for (const t of tables) {
        for (const col of t.columns) {
            if (col.is_foreign_key && col.fk_ref) {
                const key = `${col.fk_ref.table}.${col.fk_ref.column}`;
                if (!map[key]) map[key] = colorFromString(key);
            }
        }
    }
    return map;
}

/** Default column preferences — derived from the column definitions below. */
function defaultColumnPrefs(): ColumnPref[] {
    return [
        { field: 'table_name',      hidden: false, sortable: true,  filterable: true, width: null },
        { field: 'description_ru',  hidden: false, sortable: true,  filterable: true, width: null },
        { field: 'current_row_count', hidden: false, sortable: true, filterable: true, width: null },
        { field: 'prev_row_count',  hidden: false, sortable: true,  filterable: true, width: null },
        { field: 'delta_rows',      hidden: false, sortable: true,  filterable: true, width: null },
        { field: 'current_size',    hidden: false, sortable: true,  filterable: true, width: null },
        { field: 'previous_size',   hidden: false, sortable: true,  filterable: true, width: null },
        { field: 'delta_size',      hidden: false, sortable: true,  filterable: true, width: null },
        { field: 'columns_count',   hidden: false, sortable: true,  filterable: true, width: null },
        { field: 'sample_limit',    hidden: false, sortable: true,  filterable: true, width: null },
    ];
}

// ── Component ────────────────────────────────────────────────────────────────

export function DbTablesPage() {
    const { t: theme } = useTheme();
    const getString = useString({ str });
    const qc = useQueryClient();
    const localeText = useDataGridLocale();

    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [editingDesc, setEditingDesc] = useState<string | null>(null);
    const editingDescRef = useRef(editingDesc);
    editingDescRef.current = editingDesc;
    const descBufferRef = useRef<Record<string, string>>({});
    const [drawerOpen, setDrawerOpen] = useState(false);
    const widthSaveRef = useRef<ReturnType<typeof setTimeout>>();

    // CRUD mode per expanded table
    const [crudTables, setCrudTables] = useState<Set<string>>(new Set());
    const [editDialog, setEditDialog] = useState<{ tableName: string; pk: Record<string, unknown>; row: Record<string, unknown>; columns: string[]; pkCols: Set<string> } | null>(null);
    const [deleteDialog, setDeleteDialog] = useState<{ tableName: string; pk: Record<string, unknown> } | null>(null);

    // Multi-search
    const [filterText, setFilterText] = useState('');
    const [debouncedFilter, setDebouncedFilter] = useState('');
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();
    const handleFilterChange = useCallback((val: string) => {
        setFilterText(val);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setDebouncedFilter(val), 300);
    }, []);
    useEffect(() => () => clearTimeout(debounceRef.current), []);

    // ── Queries ────────────────────────────────────────────────────────────
    const { data, isLoading, error } = useQuery({
        queryKey: DB_TABLES_QK,
        queryFn: fetchDbTables,
        staleTime: 5 * 60 * 1000,
    });
    const { data: savedPrefs } = useQuery({
        queryKey: ['db_table_col_prefs'],
        queryFn: fetchColumnPrefs,
        staleTime: 60 * 1000,
    });

    const allTables: DbTableInfo[] = useMemo(() => data?.tables ?? [], [data]);
    // Filter: & = AND groups, | = OR within each group
    const tables: DbTableInfo[] = useMemo(() => {
        if (!debouncedFilter) return allTables;
        const andGroups = debouncedFilter.split('&').map((g) => g.trim()).filter(Boolean);
        if (andGroups.length === 0) return allTables;
        return allTables.filter((r) =>
            andGroups.every((group) => {
                const orTerms = group.split('|').map((s) => s.trim().toLowerCase()).filter(Boolean);
                if (orTerms.length === 0) return true;
                return orTerms.some((term) =>
                    r.table_name.toLowerCase().includes(term) ||
                    r.description_ru.toLowerCase().includes(term),
                );
            }),
        );
    }, [allTables, debouncedFilter]);

    const fkColorMap = useMemo(() => buildFkColorMap(allTables), [allTables]);

    // Merge saved prefs with defaults
    const defaults = useMemo(() => defaultColumnPrefs(), []);
    const columnPrefs: ColumnPref[] = useMemo(() => {
        if (!savedPrefs || savedPrefs.length === 0) return defaults;
        const map = new Map(defaults.map((d) => [d.field, d]));
        for (const p of savedPrefs) map.set(p.field, p);
        return [...map.values()];
    }, [savedPrefs, defaults]);

    const prefsByField = useMemo(
        () => Object.fromEntries(columnPrefs.map((p) => [p.field, p])),
        [columnPrefs],
    );

    // ── Helpers ────────────────────────────────────────────────────────────
    const fetchAndCache = useCallback((tableName: string, limit: number) => {
        setLoadingRows((s) => new Set(s).add(tableName));
        fetchTableRows(tableName, limit).then((res) => {
            rowDataCache.current[tableName] = res;
            setLoadingRows((s) => { const ns = new Set(s); ns.delete(tableName); return ns; });
            setRerender((n) => n + 1);
        }).catch(() => setLoadingRows((s) => { const ns = new Set(s); ns.delete(tableName); return ns; }));
    }, []);

    // ── Mutations ──────────────────────────────────────────────────────────
    const refreshMut = useMutation({
        mutationFn: refreshDbTables,
        onSuccess: (result) => {
            qc.setQueryData(DB_TABLES_QK, result);
            // Re-fetch expanded tables
            const expanded = expandedRows;
            rowDataCache.current = {};
            expanded.forEach((tname) => {
                const tbl = result.tables.find((t) => t.table_name === tname);
                if (tbl) fetchAndCache(tname, tbl.sample_limit);
            });
            setSnackbar({ open: true, message: `Refreshed: ${result.tables.length} tables`, severity: 'success' });
        },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });
    const descMut = useMutation({
        mutationFn: ({ tableName, desc }: { tableName: string; desc: string }) => updateDbTable(tableName, { description_ru: desc }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: DB_TABLES_QK }); setEditingDesc(null); },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });
    const limitMut = useMutation({
        mutationFn: ({ tableName, limit }: { tableName: string; limit: number }) => updateDbTable(tableName, { sample_limit: limit }),
        onSuccess: () => qc.invalidateQueries({ queryKey: DB_TABLES_QK }),
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });
    const prefsMut = useMutation({
        mutationFn: (prefs: ColumnPref[]) => saveColumnPrefs(prefs),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['db_table_col_prefs'] }),
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });
    const autoDescMut = useMutation({
        mutationFn: autoDescribe,
        onSuccess: (res) => {
            qc.invalidateQueries({ queryKey: DB_TABLES_QK });
            setSnackbar({ open: true, message: `Descriptions generated: ${res.described} tables`, severity: 'success' });
        },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    // ── Row CRUD mutations ─────────────────────────────────────────────────
    const updateRowMut = useMutation({
        mutationFn: ({ tableName, pk, data }: { tableName: string; pk: Record<string, unknown>; data: Record<string, unknown> }) =>
            updateTableRow(tableName, pk, data),
        onSuccess: (_res, vars) => {
            // Re-fetch expanded table data
            const tbl = allTables.find((t) => t.table_name === vars.tableName);
            fetchAndCache(vars.tableName, tbl?.sample_limit ?? 30);
            setEditDialog(null);
            setSnackbar({ open: true, message: 'Row updated', severity: 'success' });
        },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    const deleteRowMut = useMutation({
        mutationFn: ({ tableName, pk }: { tableName: string; pk: Record<string, unknown> }) =>
            deleteTableRow(tableName, pk),
        onSuccess: (_res, vars) => {
            const tbl = allTables.find((t) => t.table_name === vars.tableName);
            fetchAndCache(vars.tableName, tbl?.sample_limit ?? 30);
            setDeleteDialog(null);
            setSnackbar({ open: true, message: 'Row deleted', severity: 'success' });
        },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    // ── Lazy rows ──────────────────────────────────────────────────────────
    const rowDataCache = useRef<Record<string, TableRowsResponse>>({});
    const [loadingRows, setLoadingRows] = useState<Set<string>>(new Set());
    const [, setRerender] = useState(0);
    const toggleExpand = useCallback((tableName: string, sampleLimit: number) => {
        setExpandedRows((prev) => {
            const next = new Set(prev);
            if (next.has(tableName)) { next.delete(tableName); return next; }
            if (!rowDataCache.current[tableName]) fetchAndCache(tableName, sampleLimit);
            next.add(tableName);
            return next;
        });
    }, [fetchAndCache]);

    // ── Description edit ───────────────────────────────────────────────────
    const startEditDesc = useCallback((tableName: string, current: string) => { descBufferRef.current[tableName] = current; setEditingDesc(tableName); }, []);
    const cancelEditDesc = useCallback(() => setEditingDesc(null), []);
    const confirmEditDesc = useCallback((tableName: string) => { descMut.mutate({ tableName, desc: descBufferRef.current[tableName] ?? '' }); }, [descMut]);

    // ── Toggle a single column pref ────────────────────────────────────────
    const togglePref = useCallback((field: string, key: 'hidden' | 'sortable' | 'filterable') => {
        const next = columnPrefs.map((p) => p.field === field ? { ...p, [key]: !p[key] } : p);
        prefsMut.mutate(next);
    }, [columnPrefs, prefsMut]);

    // ── Column definitions ─────────────────────────────────────────────────
    const allColumns: GridColDef<DbTableInfo>[] = useMemo(() => [
        {
            field: 'table_name', headerName: getString('tableName') || 'Table',
            width: prefsByField.table_name?.width ?? 220,
            sortable: prefsByField.table_name?.sortable !== false,
            filterable: prefsByField.table_name?.filterable !== false,
            renderCell: (p: GridRenderCellParams<DbTableInfo>) => (
                <Stack direction="row" alignItems="center" spacing={0.5}>
                    <IconButton size="small" onClick={() => toggleExpand(p.row.table_name, p.row.sample_limit)}>
                        {expandedRows.has(p.row.table_name) ? <KeyboardArrowDownIcon sx={{ fontSize: 16 }} /> : <KeyboardArrowRightIcon sx={{ fontSize: 16 }} />}
                    </IconButton>
                    <Typography variant="body2" fontFamily="monospace" fontWeight={500} fontSize={13}>{p.row.table_name}</Typography>
                </Stack>
            ),
        },
        {
            field: 'description_ru', headerName: getString('descriptionRu') || 'Описание',
            width: prefsByField.description_ru?.width ?? 220,
            sortable: prefsByField.description_ru?.sortable !== false,
            filterable: prefsByField.description_ru?.filterable !== false,
            renderCell: (p: GridRenderCellParams<DbTableInfo>) => {
                if (editingDescRef.current === p.row.table_name) {
                    return (
                        <Stack direction="row" alignItems="center" spacing={0.25} sx={{ width: '100%' }}>
                            <TextField size="small" defaultValue={p.row.description_ru}
                                onChange={(e) => { descBufferRef.current[p.row.table_name] = e.target.value; }}
                                autoFocus inputProps={{ style: { padding: '2px 6px', fontSize: 12 } }}
                                onKeyDown={(e) => { if (e.key === 'Enter') confirmEditDesc(p.row.table_name); if (e.key === 'Escape') cancelEditDesc(); }}
                                sx={{ flex: 1 }} />
                            <IconButton size="small" color="success" onClick={() => confirmEditDesc(p.row.table_name)}><CheckIcon sx={{ fontSize: 16 }} /></IconButton>
                            <IconButton size="small" color="error" onClick={cancelEditDesc}><CloseIcon sx={{ fontSize: 16 }} /></IconButton>
                        </Stack>
                    );
                }
                return (
                    <Stack direction="row" alignItems="center" spacing={0.25}>
                        <Typography variant="body2" fontSize={12} sx={{ flex: 1 }}>{p.row.description_ru || '—'}</Typography>
                        <IconButton size="small" onClick={() => startEditDesc(p.row.table_name, p.row.description_ru)}><EditIcon sx={{ fontSize: 14 }} /></IconButton>
                    </Stack>
                );
            },
        },
        {
            field: 'current_row_count', headerName: getString('rowsNow') || 'Rows', type: 'number',
            width: prefsByField.current_row_count?.width ?? 85,
            sortable: prefsByField.current_row_count?.sortable !== false,
            filterable: prefsByField.current_row_count?.filterable !== false,
            valueGetter: (_v, row) => row.current.row_count,
            renderCell: (p: GridRenderCellParams<DbTableInfo>) => (
                <Typography variant="body2" fontFamily="monospace" fontSize={12}>{p.row.current.row_count.toLocaleString()}</Typography>
            ),
        },
        {
            field: 'prev_row_count', headerName: getString('rowsPrev') || 'Prv Rows', type: 'number',
            width: prefsByField.prev_row_count?.width ?? 85,
            sortable: prefsByField.prev_row_count?.sortable !== false,
            filterable: prefsByField.prev_row_count?.filterable !== false,
            valueGetter: (_v, row) => row.previous.row_count,
            renderCell: (p: GridRenderCellParams<DbTableInfo>) => (
                <Typography variant="body2" fontFamily="monospace" fontSize={12} color="text.secondary">{p.row.previous.row_count > 0 ? p.row.previous.row_count.toLocaleString() : '—'}</Typography>
            ),
        },
        {
            field: 'delta_rows', headerName: 'Δ ' + (getString('rowsNow') || 'Rows'), type: 'number',
            width: prefsByField.delta_rows?.width ?? 75,
            sortable: prefsByField.delta_rows?.sortable !== false,
            filterable: prefsByField.delta_rows?.filterable !== false,
            valueGetter: (_v, row) => row.current.row_count - row.previous.row_count,
            renderCell: (p: GridRenderCellParams<DbTableInfo>) => {
                const d = p.row.current.row_count - p.row.previous.row_count;
                if (!p.row.previous.row_count || d === 0) return <Typography variant="body2" fontSize={12} color="text.disabled">—</Typography>;
                return <Chip label={`${d > 0 ? '+' : ''}${d.toLocaleString()}`} size="small" color={d > 0 ? 'success' : 'error'} sx={{ height: 18, fontSize: 10 }} />;
            },
        },
        {
            field: 'current_size', headerName: getString('size') || 'Size',
            width: prefsByField.current_size?.width ?? 95,
            sortable: prefsByField.current_size?.sortable !== false,
            filterable: prefsByField.current_size?.filterable !== false,
            valueGetter: (_v, row) => row.current.size_bytes,
            renderCell: (p: GridRenderCellParams<DbTableInfo>) => (
                <Typography variant="body2" fontFamily="monospace" fontSize={12}>{p.row.current.size_pretty}</Typography>
            ),
        },
        {
            field: 'previous_size', headerName: getString('sizePrev') || 'Prv Size',
            width: prefsByField.previous_size?.width ?? 95,
            sortable: prefsByField.previous_size?.sortable !== false,
            filterable: prefsByField.previous_size?.filterable !== false,
            valueGetter: (_v, row) => row.previous.size_bytes,
            renderCell: (p: GridRenderCellParams<DbTableInfo>) => (
                <Typography variant="body2" fontFamily="monospace" fontSize={12} color="text.secondary">{p.row.previous.size_bytes > 0 ? p.row.previous.size_pretty : '—'}</Typography>
            ),
        },
        {
            field: 'delta_size', headerName: 'Δ ' + (getString('size') || 'Size'), type: 'number',
            width: prefsByField.delta_size?.width ?? 85,
            sortable: prefsByField.delta_size?.sortable !== false,
            filterable: prefsByField.delta_size?.filterable !== false,
            valueGetter: (_v, row) => row.current.size_bytes - row.previous.size_bytes,
            renderCell: (p: GridRenderCellParams<DbTableInfo>) => {
                const d = p.row.current.size_bytes - p.row.previous.size_bytes;
                if (!p.row.previous.size_bytes || d === 0) return <Typography variant="body2" fontSize={12} color="text.disabled">—</Typography>;
                const sign = d > 0 ? '+' : '';
                return <Chip label={`${sign}${formatBytes(Math.abs(d))}`} size="small" color={d > 0 ? 'warning' : 'success'} sx={{ height: 18, fontSize: 10 }} />;
            },
        },
        {
            field: 'columns_count', headerName: getString('fields') || 'Fields', type: 'number',
            width: prefsByField.columns_count?.width ?? 70,
            sortable: prefsByField.columns_count?.sortable !== false,
            filterable: prefsByField.columns_count?.filterable !== false,
            valueGetter: (_v, row) => row.columns.length,
        },
        {
            field: 'sample_limit', headerName: getString('sampleLimit') || 'Lim', type: 'number',
            width: prefsByField.sample_limit?.width ?? 65,
            sortable: prefsByField.sample_limit?.sortable !== false,
            filterable: prefsByField.sample_limit?.filterable !== false,
            renderCell: (p: GridRenderCellParams<DbTableInfo>) => (
                <TextField size="small" type="number" defaultValue={p.row.sample_limit}
                    inputProps={{ min: 1, max: 1000, style: { padding: '2px 4px', fontSize: 12 } }}
                    sx={{ width: 55 }}
                    onBlur={(e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v) && v >= 1 && v <= 1000 && v !== p.row.sample_limit) limitMut.mutate({ tableName: p.row.table_name, limit: v }); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
            ),
        },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ], [getString, expandedRows, toggleExpand, confirmEditDesc, cancelEditDesc, startEditDesc, limitMut, prefsByField]);

    // Filter out hidden columns
    const columns = useMemo(
        () => allColumns.filter((c) => !prefsByField[c.field]?.hidden),
        [allColumns, prefsByField],
    );

    // ── Expanded detail DataGrid ───────────────────────────────────────────
    const renderExpanded = (table: DbTableInfo) => {
        if (!expandedRows.has(table.table_name)) return null;
        const isLoadingRow = loadingRows.has(table.table_name);
        const rowData = rowDataCache.current[table.table_name];
        if (isLoadingRow) return <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}><CircularProgress size={20} /></Box>;
        if (!rowData) return <Box sx={{ p: 2 }}><Typography variant="body2" color="text.secondary">Failed to load rows.</Typography></Box>;

        const meta = rowData.column_meta?.length ? rowData.column_meta : null;
        const detailCols: GridColDef[] = (meta ?? rowData.columns).map((colMeta, ci) => {
            const colName = typeof colMeta === 'string' ? colMeta : colMeta.name;
            const colObj = typeof colMeta === 'string' ? null : colMeta;
            let hc: string | undefined;
            if (colObj?.is_foreign_key && colObj.fk_ref) {
                hc = fkColorMap[`${colObj.fk_ref.table}.${colObj.fk_ref.column}`];
            } else if (colObj?.is_primary_key) {
                // PK may share a color with FK columns that reference it
                hc = fkColorMap[`${table.table_name}.${colObj.name}`] || theme.accent;
            }
            // Build tooltip: data type + optional FK reference
            let tooltip = colObj ? colObj.data_type : '';
            if (colObj?.is_foreign_key && colObj.fk_ref) {
                tooltip += ` → ${colObj.fk_ref.table}.${colObj.fk_ref.column}`;
            }
            if (colObj?.is_primary_key) tooltip += ' (PK)';
            return {
                field: `c${ci}`, headerName: colName, width: Math.max(100, Math.min(250, colName.length * 9 + 40)),
                renderHeader: () => (
                    <Tooltip title={tooltip || colName} arrow>
                        <Stack direction="row" alignItems="center" spacing={0.3}>
                            {colObj?.is_primary_key && <VpnKeyIcon sx={{ fontSize: 12, color: theme.accent }} />}
                            <Typography variant="caption" fontWeight={600} fontSize={11} sx={hc ? { color: hc } : undefined}>{colName}</Typography>
                        </Stack>
                    </Tooltip>
                ),
                renderCell: (p: GridRenderCellParams) => {
                    if (p.value === null) return <Box component="span" sx={{ color: 'text.disabled', fontStyle: 'italic', fontSize: 11 }}>NULL</Box>;
                    return <Typography variant="body2" fontFamily="monospace" fontSize={11} sx={hc ? { color: hc } : undefined}>{String(p.value)}</Typography>;
                },
            };
        });
        // Identify PK columns for CRUD operations
        const pkCols: { name: string; index: number }[] = [];
        if (meta) {
            meta.forEach((col, ci) => {
                if (typeof col !== 'string' && col.is_primary_key) pkCols.push({ name: col.name, index: ci });
            });
        }
        const getPk = (row: (string | number | boolean | null)[]) => {
            const pk: Record<string, unknown> = {};
            pkCols.forEach(({ name, index }) => { pk[name] = row[index]; });
            return pk;
        };

        // Prepend Actions column if CRUD mode is on
        const isCrud = crudTables.has(table.table_name);
        if (isCrud) {
            detailCols.unshift({
                field: '_actions', headerName: '', width: 80, sortable: false, filterable: false,
                renderCell: (p: GridRenderCellParams) => {
                    const rowArr = rowData.rows[p.row.id as number];
                    const pk = getPk(rowArr);
                    const rowObj: Record<string, unknown> = { id: p.row.id };
                    rowArr.forEach((c, ci) => { rowObj[`c${ci}`] = c; });
                    return (
                        <Stack direction="row" spacing={0.25}>
                            <IconButton size="small" onClick={() => setEditDialog({ tableName: table.table_name, pk, row: rowObj, columns: rowData.columns, pkCols: new Set(pkCols.map(p => p.name)) })}
                                sx={{ p: 0.25 }}><EditIcon sx={{ fontSize: 14 }} /></IconButton>
                            <IconButton size="small" onClick={() => setDeleteDialog({ tableName: table.table_name, pk })}
                                sx={{ p: 0.25, color: 'error.main' }}><CloseIcon sx={{ fontSize: 14 }} /></IconButton>
                        </Stack>
                    );
                },
            });
        }

        const detailRows = rowData.rows.map((row, ri) => { const o: Record<string, unknown> = { id: ri }; row.forEach((c, ci) => { o[`c${ci}`] = c; }); return o; });
        return (
            <Box sx={{ height: Math.min(500, detailRows.length * 28 + 80), width: '100%' }}>
                <DataGrid rows={detailRows} columns={detailCols} rowHeight={24} density="compact"
                    hideFooterSelectedRowCount
                    initialState={{ pagination: { paginationModel: { page: 0, pageSize: 50 } } }}
                    pageSizeOptions={[20, 50, 100]}
                    sx={{ border: 'none', fontSize: 11, '& .MuiDataGrid-cell': { py: 0, px: 1 }, '& .MuiDataGrid-columnHeader': { py: 0.25, px: 1 } }} />
            </Box>
        );
    };

    // ── Drawer content ─────────────────────────────────────────────────────
    const drawerContent = (
        <Box sx={{ width: 320, p: 2.5 }}>
            <Typography variant="h6" fontWeight={600} mb={2}>{getString('columnSettings') || 'Column settings'}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                {getString('columnSettingsHint') || 'Toggle visibility, sorting, and filtering per column. Table name is always visible.'}
            </Typography>
            {defaults.map((def) => {
                const pref = prefsByField[def.field] ?? def;
                const isName = def.field === 'table_name';
                return (
                    <Box key={def.field} sx={{ mb: 1.5, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        <Typography variant="body2" fontWeight={600} fontSize={12} sx={{ mb: 0.5 }}>{def.field}</Typography>
                        <Stack direction="row" spacing={1}>
                            <FormControlLabel
                                control={<Checkbox size="small" checked={!pref.hidden} disabled={isName}
                                    onChange={() => togglePref(def.field, 'hidden')} />}
                                label={<Typography variant="caption" fontSize={11}>Show</Typography>}
                                sx={{ mr: 0 }}
                            />
                            <FormControlLabel
                                control={<Checkbox size="small" checked={pref.sortable}
                                    onChange={() => togglePref(def.field, 'sortable')} />}
                                label={<Typography variant="caption" fontSize={11}>Sort</Typography>}
                                sx={{ mr: 0 }}
                            />
                            <FormControlLabel
                                control={<Checkbox size="small" checked={pref.filterable}
                                    onChange={() => togglePref(def.field, 'filterable')} />}
                                label={<Typography variant="caption" fontSize={11}>Filter</Typography>}
                                sx={{ mr: 0 }}
                            />
                        </Stack>
                    </Box>
                );
            })}
        </Box>
    );

    return (
        <>
            <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                <Typography variant="h5" fontWeight={700} letterSpacing="-0.02em" color={theme.text} sx={{ flex: 1 }}>
                    {getString('dbTables') || 'DB Tables'}
                </Typography>
                <Button size="small" variant="outlined" onClick={() => autoDescMut.mutate()} disabled={autoDescMut.isPending}
                    sx={{ fontSize: 11, mr: 1 }}>
                    {getString('autoDescribe') || 'Auto-describe'}
                </Button>
                <IconButton onClick={() => setDrawerOpen(true)} size="small" sx={{ mr: 1 }}>
                    <SettingsIcon />
                </IconButton>
                <TextField size="small" placeholder={getString('filterTables') || 'Filter tables...'}
                    value={filterText} onChange={(e) => handleFilterChange(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18 }} /></InputAdornment> }}
                    sx={{ width: 240 }} />
                <Button variant="contained" startIcon={<RefreshIcon />} onClick={() => refreshMut.mutate()} disabled={refreshMut.isPending}>
                    {refreshMut.isPending ? (getString('refreshing') || '...') : (getString('refresh') || 'Refresh')}
                </Button>
            </Stack>

            {isLoading && <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}
            {!isLoading && error && <Alert severity="error" sx={{ mb: 2 }}>{(error as Error).message}</Alert>}

            {!isLoading && !error && (
                <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                    <DataGrid rows={tables} columns={columns} getRowId={(r) => r.table_name}
                        localeText={localeText} rowHeight={30} autoHeight hideFooterSelectedRowCount
                        initialState={{ pagination: { paginationModel: { page: 0, pageSize: 20 } } }}
                        pageSizeOptions={[10, 20, 50, 100]}
                        onColumnWidthChange={(params) => {
                            clearTimeout(widthSaveRef.current);
                            widthSaveRef.current = setTimeout(() => {
                                const next = columnPrefs.map((p) =>
                                    p.field === params.colDef.field ? { ...p, width: params.width } : p,
                                );
                                prefsMut.mutate(next);
                            }, 400);
                        }}
                        sx={{ border: 'none', fontSize: 12, '& .MuiDataGrid-row:hover': { bgcolor: 'action.hover' }, '& .MuiDataGrid-cell': { py: 0.25 } }} />
                    {tables.filter((r) => expandedRows.has(r.table_name)).map((r) => (
                        <Box key={r.table_name}>
                            <Box sx={{ px: 2, py: 0.5, bgcolor: 'action.selected', borderTop: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="subtitle2" fontFamily="monospace" fontSize={12}>{r.table_name}</Typography>
                                <Tooltip title={r.columns.some(c => c.is_primary_key) ? '' : (getString('noPkTooltip') || 'No PK metadata — run Refresh first')}>
                                    <FormControlLabel
                                        control={<Switch size="small" checked={crudTables.has(r.table_name)}
                                            disabled={!r.columns.some(c => c.is_primary_key)}
                                            onChange={() => setCrudTables((prev) => { const next = new Set(prev); if (next.has(r.table_name)) next.delete(r.table_name); else next.add(r.table_name); return next; })} />}
                                        label={<Typography variant="caption" fontSize={10}>{getString('crudMode') || 'CRUD'}</Typography>}
                                        sx={{ ml: 'auto', mr: 0 }}
                                    />
                                </Tooltip>
                            </Box>
                            {renderExpanded(r)}
                        </Box>
                    ))}
                </Paper>
            )}

            {!isLoading && !error && tables.length > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontSize: 11 }}>
                    {tables.length} {getString('tables') || 'tables'} ·{' '}
                    {tables.reduce((sum, r) => sum + r.current.row_count, 0).toLocaleString()} {getString('totalRows') || 'total rows'} ·{' '}
                    {tables.reduce((sum, r) => sum + r.current.size_bytes, 0) > 0
                        ? formatBytes(tables.reduce((sum, r) => sum + r.current.size_bytes, 0)) : '—'}
                </Typography>
            )}

            <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>{drawerContent}</Drawer>

            {/* ── Edit Row Dialog ─────────────────────────────────── */}
            <Dialog open={!!editDialog} onClose={() => setEditDialog(null)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontSize: 14, fontWeight: 600 }}>
                    Edit row — {editDialog?.tableName}
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={1.5} sx={{ mt: 1 }}>
                        {editDialog && editDialog.columns.map((col, ci) => {
                            const fieldKey = `c${ci}`;
                            const isPk = editDialog.pkCols.has(col);
                            return (
                                <TextField key={col} label={col} size="small" fullWidth
                                    disabled={isPk}
                                    defaultValue={String(editDialog.row[fieldKey] ?? '')}
                                    inputProps={{ style: { fontSize: 12 } }}
                                    InputLabelProps={{ style: { fontSize: 12 } }}
                                    inputRef={(el) => {
                                        if (el) (editDialog as Record<string, unknown>)[`_ref_${fieldKey}`] = el;
                                    }}
                                />
                            );
                        })}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button size="small" onClick={() => setEditDialog(null)}>{getString('cancel') || 'Cancel'}</Button>
                    <Button size="small" variant="contained" onClick={() => {
                        if (!editDialog) return;
                        const data: Record<string, unknown> = {};
                        editDialog.columns.forEach((col, ci) => {
                            if (editDialog.pkCols.has(col)) return;
                            const el = (editDialog as Record<string, unknown>)[`_ref_c${ci}`] as HTMLInputElement | undefined;
                            const newVal = el?.value ?? '';
                            const oldVal = String(editDialog.row[`c${ci}`] ?? '');
                            if (newVal !== oldVal) data[col] = newVal;
                        });
                        updateRowMut.mutate({ tableName: editDialog.tableName, pk: editDialog.pk, data });
                    }} disabled={updateRowMut.isPending}>Save</Button>
                </DialogActions>
            </Dialog>

            {/* ── Delete Confirmation Dialog ────────────────────────── */}
            <Dialog open={!!deleteDialog} onClose={() => setDeleteDialog(null)}>
                <DialogTitle sx={{ fontSize: 14, fontWeight: 600 }}>Delete row?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" fontSize={12}>
                        Delete row from <b>{deleteDialog?.tableName}</b>? PK: {deleteDialog && JSON.stringify(deleteDialog.pk)}. This cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button size="small" onClick={() => setDeleteDialog(null)}>{getString('cancel') || 'Cancel'}</Button>
                    <Button size="small" variant="contained" color="error" onClick={() => {
                        if (!deleteDialog) return;
                        deleteRowMut.mutate({ tableName: deleteDialog.tableName, pk: deleteDialog.pk });
                    }} disabled={deleteRowMut.isPending}>Delete</Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} sx={{ width: '100%' }}>{snackbar.message}</Alert>
            </Snackbar>
        </>
    );
}
