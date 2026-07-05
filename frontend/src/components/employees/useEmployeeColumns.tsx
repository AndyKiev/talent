// src/components/employees/useEmployeeColumns.tsx
import { useMemo } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { Box, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import type { Employee, TopOrgUnit } from './employeeApi';
import { formatToUkrDate } from '../../utils/dateFormatter';
import useString from '../../hooks/useString';
import { useEffectiveBooleanSetting } from '../../hooks/useAppSetting';
import str from '../../strings/str';
import cfl from '../../utils/helpers.ts';
import EmployeeAvatar from '../ui/EmployeeAvatar';

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

export function useEmployeeColumns(
    copyToClipboard?: (text: string) => Promise<boolean> | void,
): GridColDef<Employee>[] {
    const getString = useString({ str });
    // Per-surface photo flag (effective = this child AND the master). When OFF the
    // whole photo column is dropped (no empty placeholder), matching EmployeeAvatar.
    const { enabled: photosEnabled } = useEffectiveBooleanSetting('employee_photos_employees_menu');

    return useMemo(
        () => [
            // ── Photo (first column, elevator hover effect — reuses EmployeeAvatar DRY) ──
            ...(photosEnabled
                ? [
                      {
                          field: 'photo',
                          headerName: '',
                          width: 52,
                          sortable: false,
                          filterable: false,
                          disableColumnMenu: true,
                          renderCell: ({ row }: { row: Employee }) => (
                              <Box
                                  sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      height: '100%',
                                      '&:hover': { transform: 'scale(1.7)' },
                                      transition: 'transform 0.2s ease',
                                  }}
                              >
                                  <EmployeeAvatar employeeId={row.id} name={row.name} scope="employeesMenu" size={36} />
                              </Box>
                          ),
                      } satisfies GridColDef<Employee>,
                  ]
                : []),
            // ── Employee code (with copy-to-clipboard icon — DRY pattern from people review) ──
            {
                field: 'code',
                headerName: cfl(getString('code') || 'Code'),
                width: 130,
                renderCell: ({ value, row }) => (
                    <Stack direction="row" alignItems="center" spacing={0.25} height="100%">
                        <Typography fontSize={13} sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                            {value}
                        </Typography>
                        {copyToClipboard && (
                            <Tooltip title={cfl(getString('copyCode') || 'Copy code')}>
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        void copyToClipboard(row.code);
                                    }}
                                    sx={{ p: 0.25, color: 'text.secondary' }}
                                >
                                    <ContentCopyIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Stack>
                ),
            },
            {
                field: 'name',
                headerName: cfl(getString('employeeName') || 'Employee name'),
                flex: 1,
                minWidth: 160,
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
                    uniqueTops(
                        row.main_department ? [row.main_department.top_department] : [],
                    )
                        .map((t) => t.name)
                        .join(', ') || '—',
                renderCell: ({ row }) => {
                    const tops = uniqueTops(
                        row.main_department ? [row.main_department.top_department] : [],
                    );
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
            // ── The specific assigned MAIN department ──
            {
                field: 'main_department',
                headerName: cfl(getString('department') || 'Department'),
                flex: 1,
                minWidth: 180,
                sortable: false,
                valueGetter: (_value, row) => row.main_department?.name || '—',
                renderCell: ({ row }) => {
                    const depts = row.main_department ? [row.main_department] : [];
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
        [getString, copyToClipboard, photosEnabled],
    );
}