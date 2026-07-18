// hooks/useDataGridStyles.ts
import { useTheme } from '@mui/material';

export const useDataGridStyles = () => {
    const theme = useTheme();

    return {
        '& .MuiDataGrid-row': {
            cursor: 'pointer'
        },
        '& .MuiDataGrid-row.Mui-selected': {
            backgroundColor: 'action.selected'
        },
        '& .MuiDataGrid-columnHeader': {
            backgroundColor: 'primary.light',
            color: theme.palette.mode === 'dark' ? 'black' : 'white',
        },
        '& .MuiDataGrid-columnHeaderTitle': {
            fontWeight: 'bold',
            color: theme.palette.mode === 'dark' ? 'black' : 'white',
        },
        '& .MuiDataGrid-columnHeader .MuiDataGrid-iconButtonContainer button, & .MuiDataGrid-columnHeader .MuiDataGrid-menuIcon button': {
            color: theme.palette.mode === 'dark' ? 'black' : 'white',
        },
        '& .MuiDataGrid-sortIcon': {
            color: theme.palette.mode === 'dark' ? 'white' : 'black',
            opacity: 0.9,
        },
        '& .MuiDataGrid-columnHeader:hover .MuiDataGrid-sortIcon': {
            opacity: 1,
        },
        '& .MuiDataGrid-filler': {
            backgroundColor: 'background.paper',
        },
        '& .MuiDataGrid-cell': {
            display: 'flex',
            alignItems: 'center',
            py: 0.5,
        },
        border: 'none',
    } as const;
};