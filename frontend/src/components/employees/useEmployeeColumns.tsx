// src/components/employees/useEmployeeColumns.tsx
import { useMemo } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { Box, Chip, Tooltip, Typography } from '@mui/material';
import type { Employee, TopOrgUnit } from './employeeApi';
import { formatToUkrDate } from '../../utils/dateFormatter';
import useString from '../../hooks/useString';
import str from '../../strings/str';
import cfl from '../../utils/helpers.ts';

// Theme-aware empty-cell placeholder. Kept as a lowercase render helper (NOT a
// component) so this file's only component-like export stays the hook, which
// keeps react-refresh/only-export-components happy.
const emptyDash = () => (
    <Typography component="span" sx={{ color: 'text.disabled' }}>
        —
    </Typography>
);

// De-duplicate resolved top org units by id, preserving order.
const uniqueTops = (tops: (TopOrgUnit | null | undefined)[]): TopOrgUnit[] => {
    const map = new Map<number, TopOrgUnit>();
    for (const t of tops) {
        if (t) map.set(t.id, t);
    }
    return Array.from(map.values());
};

export function useEmployeeColumns(): GridColDef<Employee>[] {
    const getString = useString({ str });

    return useMemo(
        () => [
            {
                field: 'code',
                headerName: cfl(getString('code') || 'Code'),
                width: 100,
                renderCell: ({ value }) => (
                    <Tooltip title={value}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{value}</span>
                    </Tooltip>
                ),
            },
            {
                field: 'name',
                headerName: cfl(getString('employeeName') || 'Employee name'),
                flex: 1,
                minWidth: 160,
            },
            {
                field: 'email',
                headerName: cfl(getString('email') || 'Email'),
                flex: 1,
                minWidth: 180,
                renderCell: ({ value }) =>
                    value ? (
                        <Typography
                            component="span"
                            sx={{ fontSize: '0.85rem', color: 'text.secondary' }}
                        >
                            {value}
                        </Typography>
                    ) : (
                        emptyDash()
                    ),
            },
            // ── NEW: derived top-level org unit (board / directorate / store) ──
            // Walked up the department tree on the backend. Precedes the specific
            // department column below.
            {
                field: 'main_department_top',
                headerName: cfl(getString('mainDepartment') || 'Main department'),
                flex: 1,
                minWidth: 170,
                sortable: false,
                valueGetter: (_value, row) =>
                    uniqueTops((row.main_departments ?? []).map((d) => d.top_department))
                        .map((t) => t.name)
                        .join(', ') || '—',
                renderCell: ({ row }) => {
                    const tops = uniqueTops((row.main_departments ?? []).map((d) => d.top_department));
                    if (tops.length === 0) return emptyDash();
                    return (
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center', py: 0.5 }}>
                            {tops.map((t) => (
                                <Chip key={t.id} label={t.name} size="small" color="success" variant="filled" />
                            ))}
                        </Box>
                    );
                },
            },
            // ── The specific assigned (is_main) department(s) ──
            {
                field: 'main_departments',
                headerName: cfl(getString('department') || 'Department'),
                flex: 1,
                minWidth: 180,
                sortable: false,
                valueGetter: (_value, row) =>
                    row.main_departments?.map((d) => d.name).join(', ') || '—',
                renderCell: ({ row }) => {
                    const depts = row.main_departments ?? [];
                    if (depts.length === 0) {
                        return emptyDash();
                    }
                    return (
                        <Box
                            sx={{
                                display: 'flex',
                                gap: 0.5,
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                py: 0.5,
                            }}
                        >
                            {depts.map((d) => (
                                <Chip
                                    key={d.id}
                                    label={d.name}
                                    size="small"
                                    color="success"
                                    variant="outlined"
                                />
                            ))}
                        </Box>
                    );
                },
            },
            {
                field: 'extra_departments',
                headerName: cfl(getString('responsibilityAreas') || 'Responsibility Areas'),
                flex: 1,
                minWidth: 180,
                sortable: false,
                valueGetter: (_value, row) =>
                    row.extra_departments?.map((d) => d.name).join(', ') || '—',
                renderCell: ({ row }) => {
                    const depts = row.extra_departments ?? [];
                    if (depts.length === 0) {
                        return emptyDash();
                    }
                    return (
                        <Box
                            sx={{
                                display: 'flex',
                                gap: 0.5,
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                py: 0.5,
                            }}
                        >
                            {depts.map((d) => (
                                <Chip
                                    key={d.id}
                                    label={d.name}
                                    size="small"
                                    color="default"
                                    variant="outlined"
                                />
                            ))}
                        </Box>
                    );
                },
            },
            {
                field: 'job',
                headerName: cfl(getString('job') || 'Job'),
                width: 160,
                valueGetter: (_value, row) => row.job?.name ?? '—',
                renderCell: ({ value }) =>
                    value !== '—' ? (
                        <Chip label={value} size="small" color="primary" variant="outlined" />
                    ) : (
                        emptyDash()
                    ),
            },
            {
                field: 'employee_status',
                headerName: cfl(getString('employeeStatus') || 'Employee Status'),
                width: 140,
                valueGetter: (_value, row) => row.status?.name ?? '—',
                renderCell: ({ row }) => {
                    const name = row.status?.name ?? '';
                    if (!name) return emptyDash();
                    const colorMap: Record<string, 'warning' | 'success' | 'error' | 'default'> = {
                        pending: 'warning',
                        working: 'success',
                        dismissed: 'error',
                    };
                    return (
                        <Chip
                            label={cfl(getString(name) || name)}
                            size="small"
                            color={colorMap[name] ?? 'default'}
                            variant="outlined"
                        />
                    );
                },
            },
            {
                field: 'created_at',
                headerName: cfl(getString('createdAt') || 'Created'),
                width: 130,
                valueFormatter: (value) => formatToUkrDate(value),
            },
        ],
        [getString],
    );
}
