import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Paper,
    Typography,
} from '@mui/material';
import EditNoteIcon from '@mui/icons-material/EditNote';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import AppShell from '../layout/AppShell.tsx';
import { fetchMyReviews, type ReviewSessionEmployeeList } from './peopleReviewApi';
import { useDataGridLocale } from '../../hooks/useDataGridLocale';
import useString from '../../hooks/useString';

export function MyReviewsPage() {
    const navigate = useNavigate();
    const localeText = useDataGridLocale();
    const getString = useString();

    const { data: rows = [], isLoading, error } = useQuery({
        queryKey: ['my_reviews'],
        queryFn: fetchMyReviews,
        staleTime: 30 * 1000,
    });

    const columns: GridColDef<ReviewSessionEmployeeList>[] = [
        { field: 'employee_name', headerName: getString('employee'), flex: 1 },
        { field: 'status', headerName: getString('status'), width: 120 },
        {
            field: 'actions',
            headerName: '',
            width: 160,
            sortable: false,
            renderCell: (params) => (
                <Button
                    size="small"
                    variant="contained"
                    startIcon={<EditNoteIcon />}
                    onClick={() =>
                        navigate({
                            to: '/people_review/$sessionId/employee/$employeeId',
                            params: {
                                sessionId: String(params.row.session_id),
                                employeeId: String(params.row.employee_id),
                            },
                        })
                    }
                >
                    {getString('fillEvaluation')}
                </Button>
            ),
        },
    ];

    return (
        <AppShell>
            <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 800, mx: 'auto' }}>
                <Typography variant="h5" fontWeight={600} sx={{ mb: 3 }}>
                    {getString('myPeopleReviews')}
                </Typography>

                {isLoading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                )}

                {!isLoading && error && (
                    <Alert severity="error">{(error as Error).message}</Alert>
                )}

                {!isLoading && !error && rows.length === 0 && (
                    <Alert severity="info">
                        {getString('noOpenReviews')}
                    </Alert>
                )}

                {!isLoading && !error && rows.length > 0 && (
                    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                        <DataGrid
                            rows={rows}
                            columns={columns}
                            disableRowSelectionOnClick
                            getRowId={(row) => row.id}
                            localeText={localeText}
                            hideFooterSelectedRowCount
                            hideFooter={rows.length <= 10}
                        />
                    </Paper>
                )}
            </Box>
        </AppShell>
    );
}
