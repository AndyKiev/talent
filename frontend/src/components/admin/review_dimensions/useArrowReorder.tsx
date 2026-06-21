import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { IconButton, Stack, Typography } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import type { GridColDef } from '@mui/x-data-grid';

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

    const move = (row: T, dir: 'up' | 'down') => {
        const idx = rows.findIndex((r) => r.id === row.id);
        const swap = dir === 'up' ? idx - 1 : idx + 1;
        if (swap < 0 || swap >= rows.length) return;
        const next = [...rows];
        [next[idx], next[swap]] = [next[swap], next[idx]];
        reorder.mutate(next);
    };

    const orderColumn: GridColDef<T> = {
        field: 'order',
        headerName,
        width: 110,
        sortable: false,
        renderCell: (params) => {
            const idx = rows.findIndex((r) => r.id === params.row.id);
            return (
                <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Typography fontSize={13} sx={{ width: 20, textAlign: 'right' }}>
                        {idx + 1}
                    </Typography>
                    <IconButton
                        size="small"
                        onClick={() => move(params.row, 'up')}
                        disabled={idx === 0 || reorder.isPending}
                    >
                        <ArrowUpwardIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={() => move(params.row, 'down')}
                        disabled={idx === rows.length - 1 || reorder.isPending}
                    >
                        <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </Stack>
            );
        },
    };

    return { orderColumn, isReordering: reorder.isPending };
}
