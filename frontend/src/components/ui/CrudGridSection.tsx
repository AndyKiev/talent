// src/components/ui/CrudGridSection.tsx
import type { ReactNode } from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DataGrid, type GridColDef, type GridValidRowModel } from '@mui/x-data-grid';
import { AsyncContent } from './AsyncContent';

interface CrudHeaderProps {
    title: ReactNode;
    addLabel: ReactNode;
    onAdd: () => void;
    /** Extra controls rendered between the title and the Add button. */
    children?: ReactNode;
}

/** Title row + Add button that every admin CRUD page opens with. */
export function CrudHeader({ title, addLabel, onAdd, children }: CrudHeaderProps) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="h6" fontWeight={600} sx={{ flex: 1 }}>
                {title}
            </Typography>
            {children}
            <Button variant="contained" size="medium" startIcon={<AddIcon />} onClick={onAdd}>
                {addLabel}
            </Button>
        </Box>
    );
}

/** Structural view of the useCrudGrid members this section reads. */
export interface CrudGridState<R extends GridValidRowModel> {
    rows: R[];
    isLoading: boolean;
    error: unknown;
    localeText: Record<string, unknown>;
    paginationModel: { page: number; pageSize: number };
    setPaginationModel: (m: { page: number; pageSize: number }) => void;
}

interface CrudDataGridProps<R extends GridValidRowModel> {
    crud: CrudGridState<R>;
    columns: GridColDef[];
    pageSizeOptions?: number[];
}

/**
 * The bordered Paper + DataGrid every admin CRUD page renders, wrapped in the
 * shared loading/error switch.
 */
export function CrudDataGrid<R extends GridValidRowModel>({
    crud,
    columns,
    pageSizeOptions = [5, 10, 25, 50],
}: CrudDataGridProps<R>) {
    return (
        <AsyncContent isLoading={crud.isLoading} error={crud.error}>
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <DataGrid
                    rows={crud.rows}
                    columns={columns}
                    paginationModel={crud.paginationModel}
                    onPaginationModelChange={crud.setPaginationModel}
                    pageSizeOptions={pageSizeOptions}
                    disableRowSelectionOnClick
                    getRowId={(row) => row.id}
                    getRowHeight={() => 'auto'}
                    localeText={crud.localeText}
                    hideFooterSelectedRowCount
                    sx={{ '& .MuiDataGrid-cell': { alignItems: 'center', py: 1 } }}
                />
            </Paper>
        </AsyncContent>
    );
}
