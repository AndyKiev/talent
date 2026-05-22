// useTranslationColumns.tsx
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
    Box,
    Typography,
    Chip,
    IconButton,
    Stack,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import type {TableTranslation} from "../translations.ts";
import CopyButton from "../../../ui/CopyButton.tsx";



interface Lang {
    id: number;
    short_name: string;
}

interface UseTranslationColumnsParams {
    getString: (key: string, params?: any) => string;
    langs: Lang[] | undefined;
    onEditClick: (translation: TableTranslation) => void;
    onDeleteClick: (translation: TableTranslation) => void;
    handleCopyToClipboard: (text: string, message: string) => void;
}

export function useTranslationColumns({
                                          getString,
                                          langs,
                                          onEditClick,
                                          onDeleteClick,
                                          handleCopyToClipboard,
                                      }: UseTranslationColumnsParams): GridColDef[] {

    const keyColumn: GridColDef = {
        field: 'key',
        headerName: getString('key'),
        width: 280,
        renderCell: (params: GridRenderCellParams<TableTranslation>) => (
            <Stack
                direction="row"
                alignItems="center"
                spacing={0.5}
                sx={{ width: '100%', py: 0.5 }}
            >
                <Typography
                    variant="body2"
                    sx={{ whiteSpace: 'normal', wordWrap: 'break-word', flexGrow: 1 }}
                >
                    {params.row.key}
                </Typography>
                <CopyButton
                    textToCopy={params.row.key}
                    onCopy={handleCopyToClipboard}
                    successMessage={getString('keyCopiedToClipboard')}
                    title={getString('copyKeyToClipboard')}
                    size="small"
                    sx={{ ml: 'auto', flexShrink: 0 }}
                />
            </Stack>
        ),
        // renderCell: (params: GridRenderCellParams<TableTranslation>) => {
        //     const value = params.row[lang.short_name] as string | undefined;
        //     return value ? (
        //         <Typography
        //             variant="body2"
        //             sx={{
        //                 whiteSpace: 'normal',
        //                 wordWrap: 'break-word',
        //                 py: 0.5,
        //                 minHeight: 40,
        //                 display: 'flex',
        //                 alignItems: 'center',
        //             }}
        //         >
        //             {value}
        //         </Typography>
        //     ) : (
        //         <Box sx={{ minHeight: 40, display: 'flex', alignItems: 'center', py: 0.5 }}>
        //             <Chip label={getString('empty')} size="small" variant="outlined" />
        //         </Box>
        //     );
// },

    };

    const langColumns: GridColDef[] = (langs ?? []).map((lang) => ({
        field: lang.short_name,
        headerName: getString(lang.short_name),
        flex: 1,
        minWidth: 160,
        sortable: true,
        filterable: true,
        renderCell: (params: GridRenderCellParams<TableTranslation>) => {
            const value = params.row[lang.short_name] as string | undefined;
            return (
                <Typography
                    variant="body2"
                    sx={{
                        whiteSpace: 'normal',
                        wordWrap: 'break-word',
                        py: 0.5,
                        minHeight: 40,
                        display: 'flex',
                        alignItems: 'center',
                    }}
                >
                    {value || (
                        <Chip
                            label={getString('empty')}
                            size="small"
                            variant="outlined"
                        />
                    )}
                </Typography>
            );
        },
    }));

    const actionsColumn: GridColDef = {
        field: 'actions',
        headerName: getString('actions'),
        width: 100,
        sortable: false,
        filterable: false,
        renderCell: (params: GridRenderCellParams<TableTranslation>) => (
            <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton
                    size="small"
                    color="primary"
                    onClick={(e) => { e.stopPropagation(); onEditClick(params.row); }}
                >
                    <EditIcon />
                </IconButton>
                <IconButton
                    size="small"
                    color="error"
                    onClick={(e) => { e.stopPropagation(); onDeleteClick(params.row); }}
                >
                    <DeleteIcon />
                </IconButton>
            </Box>
        ),
    };

    return [keyColumn, ...langColumns, actionsColumn];
}