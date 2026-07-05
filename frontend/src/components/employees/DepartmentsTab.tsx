// src/components/employees/DepartmentsTab.tsx
import { useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Box, Paper, Typography, Stack, Chip, Divider } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { fetchEmployeeById, type MainDepartment } from './employeeApi';
import useString from '../../hooks/useString';
import str from '../../strings/str';
import cfl from '../../utils/helpers.ts';

// One row: derived top-level unit (board / directorate / store) › specific dept.
function DeptRow({ dept }: { dept: MainDepartment }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
            {dept.top_department && (
                <>
                    <Chip
                        label={dept.top_department.name}
                        size="small"
                        color="success"
                        variant="filled"
                    />
                    <ChevronRightIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                </>
            )}
            <Chip label={dept.name} size="small" color="primary" variant="outlined" />
        </Box>
    );
}

export function DepartmentsTab() {
    const { employeeId } = useParams({ from: '/employees/$employeeId/departments/' });
    const id = Number(employeeId);
    const getString = useString({ str });

    const { data: employee } = useQuery({
        queryKey: ['employee', id],
        queryFn: () => fetchEmployeeById(id),
        staleTime: 5 * 60 * 1000,
    });

    const mainDepts = employee?.main_department ? [employee.main_department] : [];
    const extraDepts = employee?.responsibility_departments ?? [];

    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
                {cfl(getString('mainDepartment') || 'Main department')}
            </Typography>
            <Stack spacing={1} sx={{ mb: 2 }}>
                {mainDepts.length > 0
                    ? mainDepts.map((d) => <DeptRow key={d.id} dept={d} />)
                    : <Typography color="text.secondary">—</Typography>}
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" sx={{ mb: 1 }}>
                {cfl(getString('responsibilityDepts') || 'Responsibility departments')}
            </Typography>
            <Stack spacing={1}>
                {extraDepts.length > 0
                    ? extraDepts.map((d) => <DeptRow key={d.id} dept={d} />)
                    : <Typography color="text.secondary">—</Typography>}
            </Stack>
        </Paper>
    );
}
