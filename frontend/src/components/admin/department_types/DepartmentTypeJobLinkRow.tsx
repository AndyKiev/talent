// src/components/admin/department_types/DepartmentTypeJobLinkRow.tsx
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Box,
    Chip,
    CircularProgress,
    Collapse,
    IconButton,
    Switch,
    Tooltip,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';

import type { DepartmentType } from './departmentTypeApi';
import type { JobWithLinkId } from './departmentTypeJobLinkApi';
import type { Job } from '../jobs/jobApi';
import { fetchJobsByDepartmentType } from './departmentTypeJobLinkApi';
import { deptTypeJobsQK } from './useDepartmentTypeJobLinkMutations';
import type { UseMutationResult } from '@tanstack/react-query';
import type {
    DepartmentTypeJobLinkCreate,
    MutationResponse,
    DepartmentTypeJobLink,
} from './departmentTypeJobLinkApi';
import { DepartmentTypeJobLinkDialog } from './DepartmentTypeJobLinkDialog';
import { formatToUkrDate } from '../../../utils/dateFormatter';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';

interface Props {
    type: DepartmentType;
    allJobs: Job[];
    createLinkMutation: UseMutationResult<
        MutationResponse<DepartmentTypeJobLink>,
        Error,
        DepartmentTypeJobLinkCreate
    >;
    onDeleteLink: (linkId: number, departmentTypeId: number) => void;
    onToggleLink: (linkId: number, currentIsActive: boolean) => void;
    deleteLinkIsPending: boolean;
    updateLinkIsPending: boolean;
}

export function DepartmentTypeJobLinkRow({
    type,
    allJobs,
    createLinkMutation,
    onDeleteLink,
    onToggleLink,
    deleteLinkIsPending,
    updateLinkIsPending,
}: Props) {
    const getString = useString({ str });
    const [expanded, setExpanded] = useState(false);
    const [linkDialogOpen, setLinkDialogOpen] = useState(false);
    // When expanded fetch all links (not filtered by is_active) so the toggle is visible

    const SHOW_ALL_LINKS = undefined; // undefined = show all links (both active and inactive)

    const { data: linkedJobs = [], isLoading: jobsLoading } = useQuery({
        queryKey: deptTypeJobsQK(type.id),
        queryFn: () => fetchJobsByDepartmentType(type.id, SHOW_ALL_LINKS),
        enabled: expanded,
        staleTime: 2 * 60 * 1000,
    });

    const handleToggleExpand = useCallback(() => setExpanded((p) => !p), []);

    const parentNames = type.parent_names ?? [];
    const parentLabel = parentNames.join(', ');

    return (
        <Box>
            {/* ── Department type row ─────────────────────────────────────── */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    pl: 1,
                    pr: 1,
                    py: 0.75,
                    minHeight: 48,
                    '&:hover': { bgcolor: 'action.hover' },
                    transition: 'background-color 0.15s',
                    borderRadius: 1,
                }}
            >
                {/* Expand toggle */}
                <IconButton
                    size="small"
                    onClick={handleToggleExpand}
                    sx={{ p: 0.25, flexShrink: 0 }}
                >
                    {expanded ? (
                        <ExpandMoreIcon sx={{ fontSize: 18 }} />
                    ) : (
                        <ChevronRightIcon sx={{ fontSize: 18 }} />
                    )}
                </IconButton>

                {/* Name */}
                <Typography variant="body2" fontWeight={500} sx={{ flex: 1, minWidth: 120 }}>
                    {type.name}
                </Typography>

                {/* Parent department chip */}
                {parentNames.length > 0 && (
                    <Tooltip
                        title={`${getString('parentDepartmentType') || 'Parent'}: ${parentLabel}`}
                    >
                        <Chip
                            icon={<AccountTreeIcon sx={{ fontSize: 14 }} />}
                            label={parentLabel}
                            size="small"
                            variant="outlined"
                            sx={{
                                fontSize: '0.7rem',
                                height: 20,
                                flexShrink: 0,
                                maxWidth: 200,
                                '& .MuiChip-label': {
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                },
                            }}
                        />
                    </Tooltip>
                )}

                {/* Linked job count chip */}
                <Tooltip title={getString('linkedJobsCount') || 'Linked jobs'}>
                    <Chip
                        icon={<WorkOutlineIcon sx={{ fontSize: 14 }} />}
                        label={type.job_count}
                        size="small"
                        color={type.job_count > 0 ? 'primary' : 'default'}
                        variant={type.job_count > 0 ? 'filled' : 'outlined'}
                        sx={{ fontSize: '0.7rem', height: 20, flexShrink: 0 }}
                    />
                </Tooltip>

                {/* Active badge */}
                <Chip
                    label={
                        type.is_active
                            ? getString('active') || 'Active'
                            : getString('inactive') || 'Inactive'
                    }
                    size="small"
                    color={type.is_active ? 'success' : 'default'}
                    sx={{ fontSize: '0.7rem', height: 20, flexShrink: 0 }}
                />

                {/* Created at */}
                <Typography
                    variant="caption"
                    sx={{
                        color: 'text.disabled',
                        fontFamily: 'monospace',
                        flexShrink: 0,
                        display: { xs: 'none', md: 'block' },
                    }}
                >
                    {formatToUkrDate(type.created_at)}
                </Typography>

                {/* ID badge */}
                <Typography
                    variant="caption"
                    sx={{ color: 'text.disabled', fontFamily: 'monospace', flexShrink: 0 }}
                >
                    #{type.id}
                </Typography>

                {/* Add job link button */}
                <Tooltip title={getString('addJobLink') || 'Link a job'}>
                    <IconButton
                        size="small"
                        color="primary"
                        onClick={(e) => {
                            e.stopPropagation();
                            setLinkDialogOpen(true);
                        }}
                    >
                        <AddIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* ── Linked jobs (when expanded) ─────────────────────────────── */}
            <Collapse in={expanded} timeout="auto" unmountOnExit>
                {jobsLoading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 1, pl: 6 }}>
                        <CircularProgress size={18} />
                    </Box>
                )}

                {!jobsLoading && linkedJobs.length === 0 && (
                    <Box sx={{ pl: 7, py: 0.75 }}>
                        <Typography variant="caption" color="text.disabled">
                            {getString('noLinkedJobs') || 'No jobs linked'}
                        </Typography>
                    </Box>
                )}

                {!jobsLoading &&
                    linkedJobs.map((job) => (
                        <LinkedJobRow
                            key={job.link_id}
                            job={job}
                            departmentTypeId={type.id}
                            deleteLinkIsPending={deleteLinkIsPending}
                            updateLinkIsPending={updateLinkIsPending}
                            onDeleteLink={onDeleteLink}
                            onToggleLink={onToggleLink}
                            getString={getString}
                        />
                    ))}
            </Collapse>

            {/* ── Add link dialog ─────────────────────────────────────────── */}
            <DepartmentTypeJobLinkDialog
                open={linkDialogOpen}
                departmentType={type}
                allJobs={allJobs}
                existingLinkedJobs={linkedJobs}
                createLinkMutation={createLinkMutation}
                onClose={() => setLinkDialogOpen(false)}
            />
        </Box>
    );
}

// ── Linked job sub-row ───────────────────────────────────────────────────────

interface LinkedJobRowProps {
    job: JobWithLinkId;
    departmentTypeId: number;
    deleteLinkIsPending: boolean;
    updateLinkIsPending: boolean;
    onDeleteLink: (linkId: number, departmentTypeId: number) => void;
    onToggleLink: (linkId: number, currentIsActive: boolean) => void;
    getString: (key: string) => string;
}

function LinkedJobRow({
    job,
    departmentTypeId,
    deleteLinkIsPending,
    updateLinkIsPending,
    onDeleteLink,
    onToggleLink,
    getString,
}: LinkedJobRowProps) {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                pl: '52px',
                pr: 1,
                py: 0.5,
                minHeight: 36,
                borderLeft: '2px solid',
                borderLeftColor: 'primary.light',
                ml: '20px',
                '&:hover': { bgcolor: 'action.hover' },
                borderRadius: 1,
            }}
        >
            {/* Job name */}
            <Typography variant="body2" sx={{ flex: 1 }}>
                {job.name}
            </Typography>

            {/* Job active chip */}
            <Chip
                label={
                    job.is_active
                        ? getString('active') || 'Active'
                        : getString('inactive') || 'Inactive'
                }
                size="small"
                color={job.is_active ? 'success' : 'default'}
                sx={{ fontSize: '0.7rem', height: 20 }}
            />

            {/* Link active toggle */}
            <Tooltip
                title={
                    job.link_is_active
                        ? getString('linkActive') || 'Link active — click to deactivate'
                        : getString('linkInactive') || 'Link inactive — click to activate'
                }
            >
                <Switch
                    size="small"
                    checked={job.link_is_active}
                    onChange={() => onToggleLink(job.link_id, job.link_is_active)}
                    disabled={updateLinkIsPending}
                    onClick={(e) => e.stopPropagation()}
                />
            </Tooltip>

            {/* Link ID badge */}
            <Typography
                variant="caption"
                sx={{ color: 'text.disabled', fontFamily: 'monospace', flexShrink: 0 }}
            >
                link #{job.link_id}
            </Typography>

            {/* Unlink button */}
            <Tooltip title={getString('removeLink') || 'Remove link'}>
                <span>
                    <IconButton
                        size="small"
                        color="error"
                        disabled={deleteLinkIsPending}
                        onClick={() => onDeleteLink(job.link_id, departmentTypeId)}
                    >
                        <LinkOffIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </span>
            </Tooltip>
        </Box>
    );
}
