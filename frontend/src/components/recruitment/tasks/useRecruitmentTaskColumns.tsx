import { Button, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DeleteIcon from '@mui/icons-material/Delete';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import type { GetStringFn } from '../../../types/getStringFn';
import { formatToUkrDate } from '../../../utils/dateFormatter';
import type { RecruitmentStatusKey, RecruitmentTask } from './recruitmentTaskApi';
import { NEXT_STATUSES, STATUS_COLOR, statusLabel, transitionColor, transitionLabel } from './recruitmentStatus';

interface Params {
    getString: GetStringFn;
    onOpen: (row: RecruitmentTask) => void;
    onTransition: (row: RecruitmentTask, target: RecruitmentStatusKey) => void;
    onDelete: (row: RecruitmentTask) => void;
    transitionPending: boolean;
    deletePending: boolean;
}

const fmtDate = (value: string | null): string => (value ? formatToUkrDate(value) : '—');

export function useRecruitmentTaskColumns({
    getString,
    onOpen,
    onTransition,
    onDelete,
    transitionPending,
    deletePending,
}: Params): GridColDef<RecruitmentTask>[] {
    return [
        {
            field: 'job',
            headerName: getString('job') || 'Job',
            flex: 1,
            minWidth: 180,
            sortable: false,
            renderCell: (params: GridRenderCellParams<RecruitmentTask>) => (
                <Typography variant="body2">{params.row.job?.name ?? params.row.job_id}</Typography>
            ),
        },
        {
            field: 'status',
            headerName: getString('status') || 'Status',
            width: 130,
            sortable: false,
            renderCell: (params: GridRenderCellParams<RecruitmentTask>) => {
                const key = params.row.status?.name;
                if (!key) return null;
                return <Chip size="small" label={statusLabel(key, getString)} color={STATUS_COLOR[key]} />;
            },
        },
        {
            field: 'requirement_group',
            headerName: getString('requirementGroup') || 'Requirement group',
            width: 180,
            sortable: false,
            renderCell: (params: GridRenderCellParams<RecruitmentTask>) => {
                const group = params.row.requirement_group;
                if (!group) {
                    return (
                        <Chip
                            size="small"
                            variant="outlined"
                            color="warning"
                            label={getString('noRequirementGroup') || 'No requirement group'}
                            onClick={() => onOpen(params.row)}
                        />
                    );
                }
                return <Typography variant="body2">{group.name}</Typography>;
            },
        },
        {
            field: 'department',
            headerName: getString('department') || 'Department',
            width: 160,
            sortable: false,
            renderCell: (params: GridRenderCellParams<RecruitmentTask>) => (
                <Typography variant="body2">{params.row.department?.name ?? '—'}</Typography>
            ),
        },
        {
            field: 'top_org_unit',
            headerName: getString('topOrgUnit') || 'Top unit',
            width: 150,
            sortable: false,
            renderCell: (params: GridRenderCellParams<RecruitmentTask>) => (
                <Typography variant="body2">{params.row.top_org_unit?.name ?? '—'}</Typography>
            ),
        },
        {
            field: 'target_deadline',
            headerName: getString('targetDeadline') || 'Target deadline',
            width: 130,
            sortable: true,
            renderCell: (params: GridRenderCellParams<RecruitmentTask>) => (
                <Typography variant="body2">{fmtDate(params.row.target_deadline)}</Typography>
            ),
        },
        {
            field: 'created_at',
            headerName: getString('createdAt') || 'Created at',
            width: 120,
            sortable: true,
            renderCell: (params: GridRenderCellParams<RecruitmentTask>) => (
                <Typography variant="body2">{fmtDate(params.row.created_at)}</Typography>
            ),
        },
        {
            field: 'creator',
            headerName: getString('createdBy') || 'Created by',
            width: 150,
            sortable: false,
            renderCell: (params: GridRenderCellParams<RecruitmentTask>) => (
                <Typography variant="body2">{params.row.creator?.name ?? '—'}</Typography>
            ),
        },
        {
            field: 'in_process_at',
            headerName: getString('inProcessAt') || 'In process since',
            width: 130,
            sortable: false,
            renderCell: (params: GridRenderCellParams<RecruitmentTask>) => (
                <Typography variant="body2">{fmtDate(params.row.in_process_at)}</Typography>
            ),
        },
        {
            field: 'closed_at',
            headerName: getString('closedAt') || 'Closed at',
            width: 130,
            sortable: false,
            renderCell: (params: GridRenderCellParams<RecruitmentTask>) => (
                <Typography variant="body2">{fmtDate(params.row.closed_at)}</Typography>
            ),
        },
        {
            field: '_actions',
            headerName: '',
            width: 230,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            renderCell: (params: GridRenderCellParams<RecruitmentTask>) => {
                const key = params.row.status?.name;
                const nexts = key ? NEXT_STATUSES[key] : [];
                return (
                    <Stack direction="row" spacing={0.5} alignItems="center">
                        {nexts.map((target) => (
                            <Button
                                key={target}
                                size="small"
                                variant="outlined"
                                color={transitionColor(target)}
                                onClick={() => onTransition(params.row, target)}
                                disabled={transitionPending}
                            >
                                {transitionLabel(target, getString)}
                            </Button>
                        ))}
                        <Tooltip title={getString('open') || 'Open'}>
                            <span>
                                <IconButton size="small" onClick={() => onOpen(params.row)}>
                                    <OpenInNewIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                        {key === 'created' && (
                            <Tooltip title={getString('delete') || 'Delete'}>
                                <span>
                                    <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => onDelete(params.row)}
                                        disabled={deletePending}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        )}
                    </Stack>
                );
            },
        },
    ];
}
