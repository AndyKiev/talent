// src/components/employees/DepartmentsTab.tsx
import { useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Paper, Typography, Stack, Chip, Divider } from '@mui/material';
import { fetchEmployeeById } from './employeeApi';
import useString from '../../hooks/useString';
import str from '../../strings/str';
import cfl from '../../utils/helpers.ts';

export function DepartmentsTab() {
    const { employeeId } = useParams({ from: '/employees/$employeeId/departments/' });
    const id = Number(employeeId);
    const getString = useString({ str });

    const { data: employee } = useQuery({
        queryKey: ['employee', id],
        queryFn: () => fetchEmployeeById(id),
        staleTime: 5 * 60 * 1000,
    });

    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
                {cfl(getString('mainDepartment') || 'Main department')}
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mb: 2 }}>
                {(employee?.main_departments ?? []).length > 0
                    ? employee!.main_departments.map((d) => (
                          <Chip key={d.id} label={d.name} color="primary" variant="outlined" />
                      ))
                    : <Typography color="text.secondary">—</Typography>}
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" sx={{ mb: 1 }}>
                {cfl(getString('responsibilityDepts') || 'Responsibility departments')}
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap">
                {(employee?.extra_departments ?? []).length > 0
                    ? employee!.extra_departments.map((d) => (
                          <Chip key={d.id} label={d.name} variant="outlined" />
                      ))
                    : <Typography color="text.secondary">—</Typography>}
            </Stack>
        </Paper>
    );
}
