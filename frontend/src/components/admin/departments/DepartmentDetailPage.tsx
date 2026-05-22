// src/components/admin/departments/DepartmentDetailPage.tsx
import { useQuery } from '@tanstack/react-query';
import AppShell from '../../layout/AppShell';
import {
    Box,
    Breadcrumbs,
    Typography,
    Paper,
    CircularProgress,
    Alert,
    Divider,
    Chip,
    Stack,
} from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Link } from '@tanstack/react-router';
import { DepartmentTree } from './DepartmentTree';
import { fetchDepartmentById } from './departmentApi';
import { DEPARTMENT_TREE_QK } from './useDepartmentMutations';
import { formatToUkrDate } from '../../../utils/dateFormatter';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/capitalizeFirstLetter';

interface Props {
    departmentId: number;
}

export function DepartmentDetailPage({ departmentId }: Props) {
    const getString = useString({ str });

    const {
        data: dept,
        isLoading,
        error,
    } = useQuery({
        queryKey: [...DEPARTMENT_TREE_QK, 'detail', departmentId],
        queryFn: () => fetchDepartmentById(departmentId),
        staleTime: 2 * 60 * 1000,
    });

    return (
        <AppShell>
            <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1400, mx: 'auto' }}>
                {/* Breadcrumbs */}
                <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
                    <Link to="/admin" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography variant="body2" color="text.secondary">
                            {cfl(getString('admin') || 'Admin')}
                        </Typography>
                    </Link>
                    <Link to="/admin/structure" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography variant="body2" color="text.secondary">
                            {cfl(getString('structure') || 'Structure')}
                        </Typography>
                    </Link>
                    <Typography variant="body2" color="text.primary" fontWeight={600}>
                        {dept?.name ?? `#${departmentId}`}
                    </Typography>
                </Breadcrumbs>

                {/* Two-column layout: tree left, detail panel right */}
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', lg: '1fr 340px' },
                        gap: 3,
                        alignItems: 'start',
                    }}
                >
                    {/* ── Tree (left) ─────────────────────────────────────────────── */}
                    <DepartmentTree selectedId={departmentId} />

                    {/* ── Detail panel (right) ────────────────────────────────────── */}
                    <Paper
                        elevation={0}
                        sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 2,
                            p: 2.5,
                            position: 'sticky',
                            top: 80,
                        }}
                    >
                        {isLoading && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                                <CircularProgress size={28} />
                            </Box>
                        )}

                        {!isLoading && error && (
                            <Alert severity="error">{(error as Error).message}</Alert>
                        )}

                        {!isLoading && !error && dept && (
                            <Stack spacing={2}>
                                <Box>
                                    <Typography variant="overline" color="text.secondary" lineHeight={1.2}>
                                        {getString('department') || 'Department'}
                                    </Typography>
                                    <Typography variant="h6" fontWeight={700} mt={0.5}>
                                        {dept.name}
                                    </Typography>
                                </Box>

                                <Divider />

                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                    {/* ID */}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="body2" color="text.secondary">ID</Typography>
                                        <Typography variant="body2" fontFamily="monospace">#{dept.id}</Typography>
                                    </Box>

                                    {/* Status */}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="body2" color="text.secondary">
                                            {cfl(getString('status') || 'Status')}
                                        </Typography>
                                        <Chip
                                            label={dept.is_active
                                                ? (getString('active') || 'Active')
                                                : (getString('inactive') || 'Inactive')}
                                            size="small"
                                            color={dept.is_active ? 'success' : 'default'}
                                            variant="outlined"
                                        />
                                    </Box>

                                    {/* Type */}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="body2" color="text.secondary">
                                            {cfl(getString('departmentType') || 'Type')}
                                        </Typography>
                                        <Chip
                                            label={dept.department_type?.name ?? dept.department_type_id}
                                            size="small"
                                            color="info"
                                            variant="filled"
                                        />
                                    </Box>

                                    {/* Category */}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="body2" color="text.secondary">
                                            {cfl(getString('departmentCategory') || 'Category')}
                                        </Typography>
                                        <Chip
                                            label={dept.department_category?.name ?? dept.department_category_id}
                                            size="small"
                                            color="success"
                                            variant="filled"
                                        />
                                    </Box>

                                    {/* Parent */}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="body2" color="text.secondary">
                                            {cfl(getString('parentDepartment') || 'Parent')}
                                        </Typography>
                                        {dept.parent_id ? (
                                            <Link
                                                to="/admin/structure/$departmentId"
                                                params={{ departmentId: String(dept.parent_id) }}
                                                style={{ textDecoration: 'none' }}
                                            >
                                                <Typography variant="body2" color="primary">
                                                    #{dept.parent_id}
                                                </Typography>
                                            </Link>
                                        ) : (
                                            <Typography variant="body2" color="text.disabled">
                                                {getString('rootDepartment') || '— root'}
                                            </Typography>
                                        )}
                                    </Box>

                                    {/* Children count */}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="body2" color="text.secondary">
                                            {cfl(getString('children') || 'Children')}
                                        </Typography>
                                        <Typography variant="body2">{dept.children.length}</Typography>
                                    </Box>

                                    {/* Created at */}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="body2" color="text.secondary">
                                            {cfl(getString('createdAt') || 'Created')}
                                        </Typography>
                                        <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
                                            {formatToUkrDate(dept.created_at)}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Stack>
                        )}
                    </Paper>
                </Box>
            </Box>
        </AppShell>
    );
}