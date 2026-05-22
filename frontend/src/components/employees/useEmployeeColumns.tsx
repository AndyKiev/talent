// src/components/employees/useEmployeeColumns.tsx
import { useMemo } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { Box, Chip, Tooltip } from '@mui/material';
import type { Employee } from './employeeApi';
import { formatToUkrDate } from '../../utils/dateFormatter';
import useString from '../../hooks/useString';
import str from '../../strings/str';
import cfl from '../../utils/capitalizeFirstLetter';

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
                headerName: cfl(getString('name') || 'Name'),
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
                        <span style={{ fontSize: '0.85rem', color: '#555' }}>{value}</span>
                    ) : (
                        <span style={{ color: '#bbb' }}>—</span>
                    ),
            },
            {
                field: 'main_departments',
                headerName: cfl(getString('mainDepartments') || 'Main Departments'),
                flex: 1,
                minWidth: 180,
                sortable: false,
                valueGetter: (_value, row) =>
                    row.main_departments?.map((d) => d.name).join(', ') || '—',
                renderCell: ({ row }) => {
                    const depts = row.main_departments ?? [];
                    if (depts.length === 0) {
                        return <span style={{ color: '#bbb' }}>—</span>;
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
                headerName: cfl(getString('extraDepartments') || 'Other Departments'),
                flex: 1,
                minWidth: 180,
                sortable: false,
                valueGetter: (_value, row) =>
                    row.extra_departments?.map((d) => d.name).join(', ') || '—',
                renderCell: ({ row }) => {
                    const depts = row.extra_departments ?? [];
                    if (depts.length === 0) {
                        return <span style={{ color: '#bbb' }}>—</span>;
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
                        <span style={{ color: '#bbb' }}>—</span>
                    ),
            },
            {
                field: 'is_active',
                headerName: cfl(getString('status') || 'Status'),
                width: 110,
                renderCell: ({ value }) => (
                    <Chip
                        label={
                            value
                                ? getString('active') || 'Active'
                                : getString('inactive') || 'Inactive'
                        }
                        size="small"
                        color={value ? 'success' : 'default'}
                        variant="outlined"
                    />
                ),
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