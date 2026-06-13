// TranslationGrid.tsx
import React from 'react';
import {
    Box,
    CircularProgress,
    Typography,
} from '@mui/material';
import { DataGrid, type GridRowParams, type GridRowSelectionModel } from '@mui/x-data-grid';
import { useTranslationColumns } from './useTranslationColumns.tsx';
import {useTranslations} from "../../../../hooks/useTranslations.ts";
import useString from "../../../../hooks/useString.ts";
import {useDataGridStyles} from "../../../../hooks/useDataGridStyles.ts";
import type {TableTranslation} from "../translations.ts";
import type {SelectedRows} from "../../../../store/tableStore.ts";
interface TranslationGridProps {
    filteredData: TableTranslation[];
    selectedRows: SelectedRows;
    tableName: string;
    isLoading: boolean;
    onRowClick: (translation: TableTranslation) => void;
    onEditClick: (translation: TableTranslation) => void;
    onDeleteClick: (translation: TableTranslation) => void;
    handleCopyToClipboard: (text: string, message: string) => void;
}

export const TranslationGrid: React.FC<TranslationGridProps> = ({
                                                                    filteredData,
                                                                    selectedRows,
                                                                    tableName,
                                                                    isLoading,
                                                                    onRowClick,
                                                                    onEditClick,
                                                                    onDeleteClick,
                                                                    handleCopyToClipboard,
                                                                }) => {
    // const theme = useTheme();
    const  getString  = useString();
    const { langs } = useTranslations();
    const dataGridStyles = useDataGridStyles();

    const [paginationModel, setPaginationModel] = React.useState({
        page: 0,
        pageSize: 10,
    });

    const selectedId = selectedRows[tableName]?.selectedId ?? null;

    const columns = useTranslationColumns({
        getString,
        langs,
        onEditClick,
        onDeleteClick,
        handleCopyToClipboard,
    });

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
            </Box>
        );
    }

    // console.log("filteredData", filteredData)

    return (
        <DataGrid
            rows={filteredData}
            columns={columns}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            hideFooterSelectedRowCount
            pageSizeOptions={[5, 10, 25, 50]}
            getRowId={(row) => row.id}
            getRowHeight={() => 'auto'}
            onRowClick={(params: GridRowParams<TableTranslation>) => onRowClick(params.row)}
            disableRowSelectionOnClick
            rowSelectionModel={
                selectedId
                    ? ({ type: 'include', ids: new Set([selectedId]) } as GridRowSelectionModel)
                    : ({ type: 'include', ids: new Set() } as GridRowSelectionModel)
            }
            slots={{
                noRowsOverlay: () => (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <Typography variant="body1" color="text.secondary">
                            {getString('noTranslationsFound')}
                        </Typography>
                    </Box>
                ),
            }}
            sx={dataGridStyles}

            slotProps={{
                pagination: {
                    labelRowsPerPage: getString('rowsPerPage'),
                    labelDisplayedRows: ({ from, to, count }: { from: number; to: number; count: number }) =>
                        `${from}-${to} ${getString('of')} ${count !== -1 ? count : `more than ${to}`}`,
                },
            }}
        />
    );
};