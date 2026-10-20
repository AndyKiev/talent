// src/components/employees/talent_employees/useTalentEmployeeColumns.tsx
import { useMemo, type ReactNode } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { Badge, Box, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import type { GetStringFn } from '../../../types/getStringFn';
import cfl from '../../../utils/helpers.ts';
import { formatToUkrDate } from '../../../utils/dateFormatter';
import EmployeeAvatar from '../../ui/EmployeeAvatar';
import type { RosterRow, RosterTalent } from './talentEmployeesApi';
import { TalentRowActions } from './TalentRowActions';
import { TalentLineActions } from './TalentLineActions';
import { talentSourceTooltip, type TalentRowHandlers } from './talentRowHandlers';

// Every talent column renders one fixed-height line per talent, so when a row
// is expanded the lines of all talent columns stay aligned like a sub-table.
const LINE_HEIGHT = 34;

// Grid field → backend roster sort_field (server-side sorting).
export const SORT_FIELD_BY_COLUMN: Record<string, string> = {
    code: 'code',
    name: 'name',
    main_department_name: 'main_department_name',
    job_name: 'job_name',
    status_name: 'status_name',
    talentJob: 'main_talent_job',
    talentPeriod: 'main_talent_period',
};

const emptyDash = () => (
    <Typography component="span" sx={{ color: 'text.disabled' }}>
        —
    </Typography>
);

interface Args {
    getString: GetStringFn;
    photosEnabled: boolean;
    expandedIds: ReadonlySet<number>;
    onToggle: (employeeId: number) => void;
    handlers: TalentRowHandlers;
}

export function useTalentEmployeeColumns({
    getString,
    photosEnabled,
    expandedIds,
    onToggle,
    handlers,
}: Args): GridColDef<RosterRow>[] {
    return useMemo(() => {
        // Talents shown in a row: all when expanded, else only the main one.
        const shown = (row: RosterRow): RosterTalent[] =>
            expandedIds.has(row.employee_id) ? row.talents : row.talents.slice(0, 1);

        const lines = (row: RosterRow, render: (t: RosterTalent) => ReactNode) => {
            const talents = shown(row);
            if (talents.length === 0) return emptyDash();
            return (
                <Stack sx={{ width: '100%', py: talents.length > 1 ? 0.5 : 0 }}>
                    {talents.map((t, i) => (
                        <Box
                            key={t.talent_audit_job_id}
                            sx={{
                                height: LINE_HEIGHT,
                                display: 'flex',
                                alignItems: 'center',
                                minWidth: 0,
                                // Main talent bold, the rest separated by a hairline.
                                fontWeight: i === 0 ? 600 : 400,
                                borderTop: i > 0 ? '1px dashed' : 'none',
                                borderColor: 'divider',
                            }}
                        >
                            {render(t)}
                        </Box>
                    ))}
                </Stack>
            );
        };

        const columns: GridColDef<RosterRow>[] = [];
        if (photosEnabled) {
            columns.push({
                field: 'photo',
                headerName: '',
                width: 52,
                sortable: false,
                disableColumnMenu: true,
                renderCell: ({ row }) => (
                    <EmployeeAvatar employeeId={row.employee_id} name={row.name} scope="employeesMenu" size={36} />
                ),
            });
        }
        columns.push(
            {
                field: 'code',
                headerName: cfl(getString('code')),
                width: 120,
                renderCell: ({ value }) => (
                    <Typography fontSize={13} sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {value}
                    </Typography>
                ),
            },
            { field: 'name', headerName: cfl(getString('name')), flex: 1, minWidth: 180 },
            {
                field: 'main_department_name',
                headerName: cfl(getString('department')),
                flex: 1,
                minWidth: 160,
                renderCell: ({ value }) => value ?? emptyDash(),
            },
            {
                field: 'job_name',
                headerName: cfl(getString('job')),
                flex: 1,
                minWidth: 160,
                renderCell: ({ value }) => value ?? emptyDash(),
            },
            {
                field: 'status_name',
                headerName: cfl(getString('employeeStatus')),
                width: 120,
                renderCell: ({ value }) => (value ? cfl(getString(value)) : emptyDash()),
            },
            {
                field: '_expand',
                headerName: '',
                width: 48,
                sortable: false,
                disableColumnMenu: true,
                renderCell: ({ row }) => {
                    if (row.talents.length < 2) return null;
                    const open = expandedIds.has(row.employee_id);
                    return (
                        <Tooltip title={cfl(getString(open ? 'hideTalents' : 'showAllTalents'))}>
                            <IconButton size="small" onClick={() => onToggle(row.employee_id)}>
                                <Badge badgeContent={row.talents.length} color="primary">
                                    {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                                </Badge>
                            </IconButton>
                        </Tooltip>
                    );
                },
            },
            {
                field: 'talentJob',
                headerName: cfl(getString('targetJob')),
                flex: 1.2,
                minWidth: 180,
                renderCell: ({ row }) =>
                    lines(row, (t) => (
                        <Typography fontSize="inherit" fontWeight="inherit" noWrap title={t.job_name}>
                            {t.job_name}
                        </Typography>
                    )),
            },
            {
                field: 'talentStatus',
                headerName: cfl(getString('talentStatus')),
                width: 120,
                sortable: false,
                renderCell: ({ row }) =>
                    lines(row, (t) => (
                        <Tooltip title={talentSourceTooltip(t, getString)}>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                                <Chip label={t.talent_status_key} size="small" color="primary" variant="outlined" />
                                <Typography fontSize={10.5} color="text.secondary">
                                    {getString(t.is_hrs ? 'hrsShort' : 'hrmShort')}
                                </Typography>
                            </Stack>
                        </Tooltip>
                    )),
            },
            {
                field: 'talentPeriod',
                headerName: cfl(getString('talentPeriod')),
                width: 110,
                renderCell: ({ row }) => lines(row, (t) => t.talent_period_name),
            },
            {
                field: 'jobStatus',
                headerName: cfl(getString('jobStatus')),
                width: 120,
                sortable: false,
                renderCell: ({ row }) => lines(row, (t) => t.job_status_name),
            },
            {
                field: 'interviewDate',
                headerName: cfl(getString('interviewDate')),
                width: 120,
                sortable: false,
                renderCell: ({ row }) =>
                    lines(row, (t) => (t.interview_date ? formatToUkrDate(t.interview_date) : emptyDash())),
            },
            {
                field: '_talentActions',
                headerName: '',
                width: 84,
                sortable: false,
                disableColumnMenu: true,
                renderCell: ({ row }) =>
                    lines(row, (t) => <TalentLineActions row={row} talent={t} handlers={handlers} />),
            },
            {
                field: '_actions',
                headerName: cfl(getString('actions')),
                width: 124,
                sortable: false,
                disableColumnMenu: true,
                renderCell: ({ row }) => <TalentRowActions row={row} handlers={handlers} />,
            },
        );
        return columns;
    }, [getString, photosEnabled, expandedIds, onToggle, handlers]);
}
