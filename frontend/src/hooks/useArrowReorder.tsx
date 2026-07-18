import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { IconButton, Stack, Tooltip, Typography } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import KeyboardDoubleArrowUpIcon from '@mui/icons-material/KeyboardDoubleArrowUp';
import KeyboardDoubleArrowDownIcon from '@mui/icons-material/KeyboardDoubleArrowDown';
import type { GridColDef } from '@mui/x-data-grid';
import type { GetStringFn } from '../../../types/getStringFn';

/** Any row that carries a numeric sort_order can be reordered by this hook. */
interface Orderable {
    id: number;
    sort_order: number;
}

interface Options<T extends Orderable> {
    /** Rows in their CURRENT display order (already sorted by sort_order). */
    rows: T[];
    /** Persist one row's new sort_order. */
    updateSortOrder: (id: number, sortOrder: number) => Promise<unknown>;
    /** Query keys to invalidate after a successful reorder. */
    invalidateKeys: QueryKey[];
    /** Resolved strings for the move-button tooltips. */
    getString: GetStringFn;
    onError?: (message: string) => void;
    /** Column header (kept "#" like the criteria grid by default). */
    headerName?: string;
}

/**
 * Shared up/down-arrow reordering for any DataGrid of `{id, sort_order}` rows
 * (criteria, dimensions, …). The order value is kept "under the hood": the grid
 * shows the 1-based position, and a reorder normalizes sort_order to the array
 * index, patching only the rows that actually moved.
 */
export function useArrowReorder<T extends Orderable>({
    rows,
    updateSortOrder,
    invalidateKeys,
    getString,
    onError,
    headerName = '#',
}: Options<T>): { orderColumn: GridColDef<T>; isReordering: boolean } {
    const qc = useQueryClient();

    const reorder = useMutation({
        mutationFn: async (ordered: T[]) => {
            await Promise.all(
                ordered
                    .map((r, i) => (r.sort_order === i ? null : updateSortOrder(r.id, i)))
                    .filter((p): p is Promise<unknown> => p !== null),
            );
        },
        onSuccess: async () => {
            for (const key of invalidateKeys) await qc.invalidateQueries({ queryKey: key });
        },
        onError: (err: Error) => onError?.(err.message),
    });

    // Move a row to top / up one / down one / bottom and persist the whole order.
    const move = (row: T, to: 'top' | 'up' | 'down' | 'bottom') => {
        const idx = rows.findIndex((r) => r.id === row.id);
        if (idx < 0) return;
        const target =
            to === 'top' ? 0 : to === 'bottom' ? rows.length - 1 : to === 'up' ? idx - 1 : idx + 1;
        if (target === idx || target < 0 || target >= rows.length) return;
        const next = [...rows];
        const [item] = next.splice(idx, 1);
        next.splice(target, 0, item);
        reorder.mutate(next);
    };

    const orderColumn: GridColDef<T> = {
        field: 'order',
        headerName,
        width: 178,
        sortable: false,
        renderCell: (params) => {
            const idx = rows.findIndex((r) => r.id === params.row.id);
            const isFirst = idx === 0;
            const isLast = idx === rows.length - 1;
            return (
                <Stack direction="row" alignItems="center" spacing={0.25}>
                    <Typography fontSize={13} sx={{ width: 20, textAlign: 'right', mr: 0.25 }}>
                        {idx + 1}
                    </Typography>
                    <Tooltip title={getString('moveToTop')}>
                        <span>
                            <IconButton
                                size="small"
                                onClick={() => move(params.row, 'top')}
                                disabled={isFirst || reorder.isPending}
                            >
                                <KeyboardDoubleArrowUpIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title={getString('moveUp')}>
                        <span>
                            <IconButton
                                size="small"
                                onClick={() => move(params.row, 'up')}
                                disabled={isFirst || reorder.isPending}
                            >
                                <ArrowUpwardIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title={getString('moveDown')}>
                        <span>
                            <IconButton
                                size="small"
                                onClick={() => move(params.row, 'down')}
                                disabled={isLast || reorder.isPending}
                            >
                                <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title={getString('moveToBottom')}>
                        <span>
                            <IconButton
                                size="small"
                                onClick={() => move(params.row, 'bottom')}
                                disabled={isLast || reorder.isPending}
                            >
                                <KeyboardDoubleArrowDownIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Stack>
            );
        },
    };

    return { orderColumn, isReordering: reorder.isPending };
}
