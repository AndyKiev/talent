// src/components/admin/department_types/organigram/DepartmentTypeJobBox.tsx
//
// The jobs of one type card, opened from the card's job-count chip in ANY
// mode: a green-tinted box floating beside the card — right / left / top /
// bottom (JobBoxPlacement, a per-browser preference) — tied to it by a short
// connector, closed with its (x). In JOBS mode its rows are drag
// sources (drop on another card = move, Ctrl = also link there, Unlink bay =
// remove); in the other modes it is read-only.
import { Box, IconButton, Paper, Tooltip, Typography, alpha } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import type { DepartmentTypeJobLink } from '../departmentTypeJobLinkApi';
import { startJobDrag, type JobCtx } from './organigramDrag';
import { JobBoxPlacement } from './jobBoxPlacement';
import type { GetStringFn } from '../../../../types/getStringFn';

const GAP = 14;
const BOX_W = 240;

/** Box position + connector stub for each side of the card. */
const PLACEMENT_SX: Record<JobBoxPlacement, { box: object; stub: object }> = {
    [JobBoxPlacement.RIGHT]: {
        box: { left: `calc(100% + ${GAP}px)`, top: 0 },
        stub: { left: -GAP - 1, top: 18, width: GAP, borderTop: '1px solid' },
    },
    [JobBoxPlacement.LEFT]: {
        box: { right: `calc(100% + ${GAP}px)`, top: 0 },
        stub: { right: -GAP - 1, top: 18, width: GAP, borderTop: '1px solid' },
    },
    [JobBoxPlacement.BOTTOM]: {
        box: { top: `calc(100% + ${GAP}px)`, left: '50%', transform: 'translateX(-50%)' },
        stub: { top: -GAP - 1, left: '50%', height: GAP, borderLeft: '1px solid' },
    },
    [JobBoxPlacement.TOP]: {
        box: { bottom: `calc(100% + ${GAP}px)`, left: '50%', transform: 'translateX(-50%)' },
        stub: { bottom: -GAP - 1, left: '50%', height: GAP, borderLeft: '1px solid' },
    },
};

export function DepartmentTypeJobBox({
    links,
    jobs,
    draggable,
    placement,
    onClose,
    getString,
}: {
    links: DepartmentTypeJobLink[];
    // Only what the box reads (the department organigram passes a read-only one).
    jobs: Pick<JobCtx, 'jobById' | 'highlightJobId' | 'onDragStart' | 'onDragEnd'>;
    /** JOBS mode: rows can be dragged. */
    draggable: boolean;
    placement: JobBoxPlacement;
    onClose: () => void;
    getString: GetStringFn;
}) {
    return (
        <Paper
            elevation={6}
            onDoubleClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            sx={{
                position: 'absolute',
                ...PLACEMENT_SX[placement].box,
                width: BOX_W,
                p: 1,
                pt: 0.5,
                border: '1px solid',
                borderColor: 'success.main',
                // Opaque paper + a light green wash (it floats over other cards).
                bgcolor: 'background.paper',
                backgroundImage: (theme) =>
                    `linear-gradient(${alpha(theme.palette.success.main, 0.1)}, ${alpha(theme.palette.success.main, 0.1)})`,
                cursor: 'default',
                // Connector from the card's edge to the box.
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    ...PLACEMENT_SX[placement].stub,
                    borderColor: 'success.main',
                },
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <WorkOutlineIcon color="success" sx={{ fontSize: 16 }} />
                <Typography variant="caption" fontWeight={700} sx={{ flex: 1 }}>
                    {getString('deptTypeOrgJobBoxTitle', { count: links.length })}
                </Typography>
                <IconButton size="small" onClick={onClose} sx={{ p: '2px' }}>
                    <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
            </Box>
            {links.length > 0 && jobs.jobById.size === 0 ? (
                <Typography variant="caption" color="text.secondary">
                    {getString('deptTypeOrgJobsLoading')}
                </Typography>
            ) : links.length === 0 ? (
                <Typography variant="caption" color="text.secondary">
                    {getString(draggable ? 'deptTypeOrgJobBoxEmptyDrag' : 'deptTypeOrgJobBoxEmpty')}
                </Typography>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, maxHeight: 260, overflowY: 'auto' }}>
                    {links.map((l) => {
                        const job = jobs.jobById.get(l.job_id);
                        if (!job) return null;
                        const highlighted = jobs.highlightJobId === job.id;
                        const row = (
                            <Box
                                key={l.id}
                                draggable={draggable}
                                onDragStart={
                                    draggable
                                        ? (e) => {
                                              e.stopPropagation();
                                              startJobDrag(e, { job, link: l }, jobs.onDragStart);
                                          }
                                        : undefined
                                }
                                onDragEnd={draggable ? jobs.onDragEnd : undefined}
                                sx={{
                                    px: 0.5,
                                    py: 0.25,
                                    borderRadius: 0.5,
                                    cursor: draggable ? 'grab' : 'default',
                                    ...(!l.is_active || !job.is_active ? { opacity: 0.5 } : {}),
                                    ...(highlighted && {
                                        outline: '2px solid',
                                        outlineColor: 'warning.main',
                                    }),
                                    '&:hover': draggable ? { bgcolor: 'action.hover' } : undefined,
                                }}
                            >
                                <Typography variant="caption" sx={{ lineHeight: 1.2, display: 'block' }}>
                                    {job.name}
                                </Typography>
                            </Box>
                        );
                        return !l.is_active ? (
                            <Tooltip key={l.id} title={getString('deptTypeOrgLinkInactive')}>
                                {row}
                            </Tooltip>
                        ) : (
                            row
                        );
                    })}
                </Box>
            )}
        </Paper>
    );
}
