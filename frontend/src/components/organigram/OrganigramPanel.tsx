// src/components/organigram/OrganigramPanel.tsx
//
// STANDALONE top-down organigram of a department SUBTREE as of a date — drop
// it into any page: it only needs a department id, an ISO date, getString and
// a snackbar callback. All of its sub-components (move dialog, date wheel,
// department pickers) live in this folder.
//
// Shows: root department on top, children fanning out below, each box listing
// EVERY job of the department's type (vacant ones too — they are drop targets
// and carry the plan) with a small fact/plan counter, and the working
// employees (photo + name) holding each job. One backend call returns the
// whole tree (same as-of event replay as the headcount fact counts). An
// employee resting on a pending (ready) event renders GHOSTED at the
// provisional spot and normal at the confirmed one.
//
// Layout (dependency-free pure CSS, print-friendly for the future PDF/A4
// export) — the classic "columns" org chart:
//   - the ROOT card sits centered on top;
//   - its DIRECT children form a horizontal connector row of column headers;
//   - EVERYTHING below stacks vertically inside each column on a left rail,
//     one extra indent per depth — so total width is bounded by the number
//     of first-level branches, never by how bushy a branch is.
//   - the whole tree is left-anchored when wider than the panel (a centered
//     overflow would clip the left edge beyond scroll reach) and centered
//     when it fits.
//
// Drag mode (header switch): employees become draggable. Drop targets:
//   - a JOB block        -> full move known, confirm dialog directly;
//   - a DEPARTMENT card  -> job picked in the dialog;
//   - the TRANSFER BAY   -> fixed corner drop zone for a department that is
//     not on screen; department AND job picked in the dialog.
// While dragging, a fixed corner hint shows the would-be event without
// obstructing the drag (pointer-events: none).
//
// Outside drag mode, DOUBLE-clicking an employee opens their events tab.
import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Alert,
    Box,
    Chip,
    CircularProgress,
    FormControlLabel,
    Paper,
    Switch,
    Tooltip,
    Typography,
} from '@mui/material';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import MoveUpIcon from '@mui/icons-material/MoveUp';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PersonOffOutlinedIcon from '@mui/icons-material/PersonOffOutlined';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { useNavigate } from '@tanstack/react-router';
import {
    fetchOrganigram,
    moveEventCode,
    type OrganigramMove,
    type OrganigramNode,
} from './organigramApi';
import { OrganigramMoveDialog } from './OrganigramMoveDialog';
import {
    OrganigramStatusEventDialog,
    type OrganigramStatusEventCode,
    type OrganigramStatusEventRequest,
} from './OrganigramStatusEventDialog';
import EmployeeAvatar from '../ui/EmployeeAvatar';
import { HEADCOUNT_ORGANIGRAM_QK } from '../../utils/queryKeys';
import { formatDate } from '../../utils/date';
import type { GetStringFn } from '../../types/getStringFn';
import cfl from '../../utils/helpers.ts';

// Fixed card width for column cards AND their header — keeps the rail elbow
// and the header's top connector geometrically attached (see sx block).
const VCARD_W = 210;
// The vertical drop of a column header's top connector sits at the card
// center: fan-li padding (10) + VCARD_W / 2.
const VPARENT_DROP = 10 + VCARD_W / 2;

interface Props {
    departmentId: number;
    isoDate: string;
    getString: GetStringFn;
    setSnackbar: (s: { open: boolean; message: string; severity: 'success' | 'error' }) => void;
}

// The employee being dragged (kept in React state — same-window drag only).
interface DragSource {
    employeeId: number;
    employeeName: string;
    fromDeptId: number;
    fromDeptName: string;
    fromJobId: number;
    fromJobName: string;
}

// What the cursor currently hovers as a drop target.
type DropTarget =
    | { kind: 'job'; deptId: number; deptName: string; deptTypeId: number | null; jobId: number; jobName: string }
    | { kind: 'dept'; deptId: number; deptName: string; deptTypeId: number | null }
    | { kind: 'bay' }
    | { kind: 'event'; code: OrganigramStatusEventCode };

/** A drop on the very job the employee already holds is a no-op. */
const isValidTarget = (drag: DragSource, target: DropTarget): boolean =>
    target.kind !== 'job' ||
    !(drag.fromDeptId === target.deptId && drag.fromJobId === target.jobId);

const sameTarget = (a: DropTarget | null, b: DropTarget): boolean => {
    if (a == null || a.kind !== b.kind) return false;
    if (a.kind === 'bay' || b.kind === 'bay') return a.kind === b.kind;
    if (a.kind === 'event' || b.kind === 'event')
        return a.kind === 'event' && b.kind === 'event' && a.code === b.code;
    return a.deptId === b.deptId && (a.kind !== 'job' || b.kind !== 'job' || a.jobId === b.jobId);
};

// Shared plumbing every card needs (drag mode, hover state, callbacks).
interface CardCtx {
    getString: GetStringFn;
    onEmployeeOpen: (employeeId: number) => void;
    dragMode: boolean;
    dragging: DragSource | null;
    hoverTarget: DropTarget | null;
    onDragStart: (src: DragSource) => void;
    onDragEnd: () => void;
    onHoverTarget: (target: DropTarget | null) => void;
    onDrop: (target: DropTarget) => void;
}

/** One department card: name, jobs with fact/plan counters, employees.
 *  The card is a department drop target; each job block a job drop target.
 *  `emphasis` tints the root and the column-header cards. */
function OrganigramCard({
    node,
    ctx,
    emphasis = false,
}: {
    node: OrganigramNode;
    ctx: CardCtx;
    emphasis?: boolean;
}) {
    const {
        getString,
        onEmployeeOpen,
        dragMode,
        dragging,
        hoverTarget,
        onDragStart,
        onDragEnd,
        onHoverTarget,
        onDrop,
    } = ctx;

    const deptTarget: DropTarget = {
        kind: 'dept',
        deptId: node.department_id,
        deptName: node.department_name,
        deptTypeId: node.department_type_id,
    };
    const deptDroppable = dragMode && dragging != null;
    const deptHovered = deptDroppable && sameTarget(hoverTarget, deptTarget);

    return (
        <Paper
            variant="outlined"
            className="org-card"
            onDragOver={
                deptDroppable
                    ? (e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          if (!sameTarget(hoverTarget, deptTarget)) onHoverTarget(deptTarget);
                      }
                    : undefined
            }
            onDragLeave={deptHovered ? () => onHoverTarget(null) : undefined}
            onDrop={
                deptDroppable
                    ? (e) => {
                          e.preventDefault();
                          onDrop(deptTarget);
                      }
                    : undefined
            }
            sx={{
                p: 1,
                minWidth: 170,
                maxWidth: 240,
                textAlign: 'left',
                bgcolor: 'background.paper',
                ...(emphasis && {
                    bgcolor: 'action.selected',
                    borderColor: 'primary.main',
                }),
                ...(deptHovered && {
                    borderColor: 'info.main',
                    bgcolor: 'action.hover',
                }),
            }}
        >
            <Typography
                variant="subtitle2"
                fontWeight={700}
                align="center"
                sx={{ lineHeight: 1.25 }}
            >
                {node.department_name}
            </Typography>
            {node.jobs.map((job) => {
                const target: DropTarget = {
                    kind: 'job',
                    deptId: node.department_id,
                    deptName: node.department_name,
                    deptTypeId: node.department_type_id,
                    jobId: job.job_id,
                    jobName: job.job_name,
                };
                const droppable =
                    dragMode && dragging != null && isValidTarget(dragging, target);
                const hovered = droppable && sameTarget(hoverTarget, target);
                return (
                    <Box
                        key={job.job_id}
                        onDragOver={
                            droppable
                                ? (e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      e.dataTransfer.dropEffect = 'move';
                                      if (!hovered) onHoverTarget(target);
                                  }
                                : undefined
                        }
                        onDragLeave={hovered ? () => onHoverTarget(null) : undefined}
                        onDrop={
                            droppable
                                ? (e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      onDrop(target);
                                  }
                                : undefined
                        }
                        sx={{
                            mt: 0.75,
                            borderRadius: 1,
                            px: 0.5,
                            ...(droppable && {
                                outline: '1px dashed',
                                outlineColor: 'divider',
                            }),
                            ...(hovered && {
                                outlineColor: 'primary.main',
                                bgcolor: 'action.hover',
                            }),
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                fontWeight={600}
                                sx={{ flex: 1, minWidth: 0 }}
                            >
                                {job.job_name}
                            </Typography>
                            <Tooltip title={getString('organigramFactPlanHint')}>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        flexShrink: 0,
                                        fontFamily: 'monospace',
                                        color:
                                            job.fact_qty < job.plan_qty
                                                ? 'warning.main'
                                                : job.fact_qty > job.plan_qty
                                                    ? 'error.main'
                                                    : 'text.disabled',
                                    }}
                                >
                                    {job.fact_qty}/{job.plan_qty}
                                </Typography>
                            </Tooltip>
                        </Box>
                        {job.employees.map((emp) => (
                            <Box
                                key={`${emp.id}-${emp.is_pending ? 'p' : 'c'}`}
                                draggable={dragMode && !emp.is_pending && !emp.has_open_event}
                                onDragStart={
                                    dragMode && !emp.is_pending && !emp.has_open_event
                                        ? (e) => {
                                              e.dataTransfer.effectAllowed = 'move';
                                              // Firefox needs data for the drag to start.
                                              e.dataTransfer.setData('text/plain', emp.name);
                                              onDragStart({
                                                  employeeId: emp.id,
                                                  employeeName: emp.name,
                                                  fromDeptId: node.department_id,
                                                  fromDeptName: node.department_name,
                                                  fromJobId: job.job_id,
                                                  fromJobName: job.job_name,
                                              });
                                          }
                                        : undefined
                                }
                                onDragEnd={dragMode ? onDragEnd : undefined}
                                onDoubleClick={
                                    dragMode ? undefined : () => onEmployeeOpen(emp.id)
                                }
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.75,
                                    mt: 0.5,
                                    borderRadius: 1,
                                    px: 0.5,
                                    cursor: dragMode
                                        ? emp.is_pending || emp.has_open_event
                                            ? 'default'
                                            : 'grab'
                                        : 'pointer',
                                    // Pending placement (not yet applied) — ghosted.
                                    ...(emp.is_pending && { opacity: 0.45 }),
                                    '&:hover': { bgcolor: 'action.hover' },
                                }}
                            >
                                <EmployeeAvatar
                                    employeeId={emp.id}
                                    name={emp.name}
                                    scope="organigram"
                                    size={28}
                                />
                                <Typography variant="body2" sx={{ lineHeight: 1.2 }}>
                                    {emp.name}
                                </Typography>
                                {emp.is_pending ? (
                                    <Tooltip title={getString('factPendingEmployeeHint')}>
                                        <ScheduleIcon
                                            color="warning"
                                            sx={{ fontSize: 14 }}
                                        />
                                    </Tooltip>
                                ) : (
                                    emp.has_open_event && (
                                        // An open (draft/ready) event blocks new
                                        // events — dragging is disabled for them.
                                        <Tooltip title={getString('organigramOpenEventHint')}>
                                            <ScheduleIcon
                                                color="disabled"
                                                sx={{ fontSize: 14 }}
                                            />
                                        </Tooltip>
                                    )
                                )}
                            </Box>
                        ))}
                    </Box>
                );
            })}
        </Paper>
    );
}

/** Everything below a column header: cards stacked vertically on a left
 *  rail, one extra indent per depth (recursive). */
function OrganigramVStack({ nodes, ctx }: { nodes: OrganigramNode[]; ctx: CardCtx }) {
    return (
        <ul className="vlist">
            {nodes.map((n) => (
                <li key={n.department_id}>
                    <OrganigramCard node={n} ctx={ctx} />
                    {n.children.length > 0 && (
                        <OrganigramVStack nodes={n.children} ctx={ctx} />
                    )}
                </li>
            ))}
        </ul>
    );
}

/** The whole tree: root card centered on top, direct children as a
 *  horizontal connector row of column headers, each with its branch
 *  stacked vertically below. */
function OrganigramTree({ root, ctx }: { root: OrganigramNode; ctx: CardCtx }) {
    return (
        <ul className="hlist">
            <li>
                <OrganigramCard node={root} ctx={ctx} emphasis />
                {root.children.length > 0 && (
                    <ul className="hlist">
                        {root.children.map((child) => (
                            <li
                                key={child.department_id}
                                className={child.children.length > 0 ? 'vparent' : undefined}
                            >
                                <OrganigramCard node={child} ctx={ctx} emphasis />
                                {child.children.length > 0 && (
                                    <OrganigramVStack nodes={child.children} ctx={ctx} />
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </li>
        </ul>
    );
}

export function OrganigramPanel({ departmentId, isoDate, getString, setSnackbar }: Props) {
    const navigate = useNavigate();

    const [dragMode, setDragMode] = useState(false);
    const [dragging, setDragging] = useState<DragSource | null>(null);
    const [hoverTarget, setHoverTarget] = useState<DropTarget | null>(null);
    const [move, setMove] = useState<OrganigramMove | null>(null);
    const [statusEvent, setStatusEvent] = useState<OrganigramStatusEventRequest | null>(null);

    const { data: root, isLoading, error } = useQuery({
        queryKey: HEADCOUNT_ORGANIGRAM_QK(departmentId, isoDate),
        queryFn: () => fetchOrganigram(departmentId, isoDate),
    });

    const buildMove = (
        drag: DragSource,
        target: Extract<DropTarget, { kind: 'job' | 'dept' | 'bay' }>,
    ): OrganigramMove => ({
        employeeId: drag.employeeId,
        employeeName: drag.employeeName,
        fromDeptId: drag.fromDeptId,
        fromDeptName: drag.fromDeptName,
        fromJobId: drag.fromJobId,
        fromJobName: drag.fromJobName,
        toDeptId: target.kind === 'bay' ? null : target.deptId,
        toDeptName: target.kind === 'bay' ? null : target.deptName,
        toDeptTypeId: target.kind === 'bay' ? null : target.deptTypeId,
        toJobId: target.kind === 'job' ? target.jobId : null,
        toJobName: target.kind === 'job' ? target.jobName : null,
    });

    const hintMove: OrganigramMove | null =
        dragging && hoverTarget && hoverTarget.kind !== 'event'
            ? buildMove(dragging, hoverTarget)
            : null;

    const ctx: CardCtx = {
        getString,
        onEmployeeOpen: (employeeId) =>
            navigate({ to: `/employees/${employeeId}/events` as '/' }),
        dragMode,
        dragging,
        hoverTarget,
        onDragStart: setDragging,
        onDragEnd: () => {
            setDragging(null);
            setHoverTarget(null);
        },
        onHoverTarget: setHoverTarget,
        onDrop: (target) => {
            if (dragging && isValidTarget(dragging, target)) {
                if (target.kind === 'event') {
                    setStatusEvent({
                        employeeId: dragging.employeeId,
                        employeeName: dragging.employeeName,
                        fromJobName: dragging.fromJobName,
                        fromDeptName: dragging.fromDeptName,
                        code: target.code,
                    });
                } else {
                    setMove(buildMove(dragging, target));
                }
            }
            setDragging(null);
            setHoverTarget(null);
        },
    };

    // Corner drop bays (drag mode): transfer to an off-screen department,
    // temporary leave (maternity / conscription …), dismissal.
    const bays: {
        target: DropTarget;
        labelKey: string;
        icon: ReactNode;
        hoverColor: 'info' | 'warning' | 'error';
    }[] = [
        {
            target: { kind: 'bay' },
            labelKey: 'organigramTransferBay',
            icon: <MoveUpIcon fontSize="small" />,
            hoverColor: 'info',
        },
        {
            target: { kind: 'event', code: 'TEMPORARY_LEAVE' },
            labelKey: 'organigramLeaveBay',
            icon: <PauseCircleOutlineIcon fontSize="small" />,
            hoverColor: 'warning',
        },
        {
            target: { kind: 'event', code: 'DISMISSAL' },
            labelKey: 'organigramDismissBay',
            icon: <PersonOffOutlinedIcon fontSize="small" />,
            hoverColor: 'error',
        },
    ];

    return (
        <Paper
            elevation={0}
            sx={{ border: '1px solid', borderColor: 'divider', mt: 3, p: 1.5 }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <AccountTreeOutlinedIcon color="action" sx={{ fontSize: 18 }} />
                <Typography variant="subtitle2" fontWeight={600} sx={{ flex: 1 }}>
                    {getString('organigramTitle', { date: formatDate(isoDate) })}
                </Typography>
                <FormControlLabel
                    control={
                        <Switch
                            size="small"
                            checked={dragMode}
                            onChange={(e) => {
                                setDragMode(e.target.checked);
                                setDragging(null);
                                setHoverTarget(null);
                            }}
                        />
                    }
                    label={
                        <Typography variant="body2">
                            {cfl(getString('organigramDragMode'))}
                        </Typography>
                    }
                />
            </Box>
            {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress size={24} />
                </Box>
            ) : error ? (
                <Alert severity="error">{(error as Error).message}</Alert>
            ) : root == null ? null : (
                <Box
                    sx={{
                        overflowX: 'auto',
                        pb: 1,
                        '& ul': { listStyle: 'none', p: 0, m: 0 },
                        // ── Horizontal fan-out (classic ul/li connectors): each
                        // li draws half-width top bars meeting at a center drop
                        // line; li > ul::before draws the drop from the parent.
                        '& ul.hlist': {
                            display: 'flex',
                            justifyContent: 'center',
                            pt: '24px',
                            position: 'relative',
                        },
                        '& ul.hlist > li': {
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            position: 'relative',
                            p: '24px 10px 0',
                        },
                        '& ul.hlist > li::before, & ul.hlist > li::after': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            right: '50%',
                            width: '50%',
                            height: 24,
                            borderTop: '1px solid',
                            borderColor: 'divider',
                        },
                        '& ul.hlist > li::after': {
                            right: 'auto',
                            left: '50%',
                            borderLeft: '1px solid',
                            borderColor: 'divider',
                        },
                        '& ul.hlist > li:only-child::before, & ul.hlist > li:only-child::after':
                            { display: 'none' },
                        '& ul.hlist > li:only-child': { pt: 0 },
                        '& ul.hlist > li:first-of-type::before, & ul.hlist > li:last-of-type::after':
                            { borderTop: 'none' },
                        '& ul.hlist > li:last-of-type::before': {
                            borderRight: '1px solid',
                            borderColor: 'divider',
                        },
                        '& li > ul.hlist::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: '50%',
                            height: 24,
                            borderLeft: '1px solid',
                            borderColor: 'divider',
                        },
                        // ── Vertical parent (a node whose children stack):
                        // card left-aligned above the rail, FIXED width, and —
                        // when it sits inside a fan — its top connector's drop
                        // moved to the card center so nothing detaches.
                        '& ul.hlist > li.vparent': { alignItems: 'flex-start' },
                        '& li.vparent > .org-card': {
                            width: VCARD_W,
                            minWidth: VCARD_W,
                            maxWidth: VCARD_W,
                        },
                        '& ul.hlist > li.vparent::after': {
                            left: `${VPARENT_DROP}px`,
                            width: `calc(100% - ${VPARENT_DROP}px)`,
                        },
                        '& ul.hlist > li.vparent:last-of-type::before': {
                            borderRight: 'none',
                        },
                        // ── Vertical stack (first store_departments level):
                        // left rail with an elbow into each fixed-width card.
                        '& ul.vlist': {
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            alignSelf: 'flex-start',
                            pt: '4px',
                            position: 'relative',
                        },
                        '& ul.vlist > li': {
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            position: 'relative',
                            p: '12px 0 0 16px',
                        },
                        '& ul.vlist > li > .org-card': {
                            width: VCARD_W,
                            minWidth: VCARD_W,
                            maxWidth: VCARD_W,
                        },
                        '& ul.vlist > li::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            height: '100%',
                            borderLeft: '1px solid',
                            borderColor: 'divider',
                        },
                        '& ul.vlist > li:last-of-type::before': { height: '30px' },
                        '& ul.vlist > li::after': {
                            content: '""',
                            position: 'absolute',
                            top: '30px',
                            left: 0,
                            width: '16px',
                            borderTop: '1px solid',
                            borderColor: 'divider',
                        },
                        // The outermost ul holds only the root. Left-anchor the
                        // tree when it overflows (a centered overflow clips the
                        // left edge beyond scroll reach); center it when it fits.
                        '& > ul.hlist': { pt: 0, width: 'max-content', mx: 'auto' },
                    }}
                >
                    <OrganigramTree root={root} ctx={ctx} />
                </Box>
            )}

            {/* ── Drop bays (bottom-left): transfer to an off-screen
                department, temporary leave, dismissal. ─────────────────── */}
            {dragMode && dragging && (
                <Box
                    sx={{
                        position: 'fixed',
                        bottom: 16,
                        left: 16,
                        zIndex: (theme) => theme.zIndex.snackbar,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                        maxWidth: 280,
                    }}
                >
                    {bays.map((bay) => {
                        const hovered = sameTarget(hoverTarget, bay.target);
                        return (
                            <Paper
                                key={bay.labelKey}
                                elevation={6}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'move';
                                    if (!hovered) setHoverTarget(bay.target);
                                }}
                                onDragLeave={() => {
                                    if (hovered) setHoverTarget(null);
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    ctx.onDrop(bay.target);
                                }}
                                sx={{
                                    p: 1.5,
                                    border: '2px dashed',
                                    borderColor: hovered
                                        ? `${bay.hoverColor}.main`
                                        : 'divider',
                                    bgcolor: hovered
                                        ? 'action.hover'
                                        : 'background.paper',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                }}
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        color: hovered
                                            ? `${bay.hoverColor}.main`
                                            : 'text.secondary',
                                    }}
                                >
                                    {bay.icon}
                                </Box>
                                <Typography variant="body2">
                                    {getString(bay.labelKey)}
                                </Typography>
                            </Paper>
                        );
                    })}
                </Box>
            )}

            {/* ── Corner hint while dragging (never obstructs the drag) ────── */}
            {dragMode && dragging && (
                <Paper
                    elevation={6}
                    sx={{
                        position: 'fixed',
                        bottom: 16,
                        right: 16,
                        zIndex: (theme) => theme.zIndex.snackbar,
                        p: 1.5,
                        maxWidth: 320,
                        pointerEvents: 'none',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>
                            {dragging.employeeName}
                        </Typography>
                        {hintMove && (
                            <Chip
                                label={
                                    moveEventCode(hintMove) === 'PROMOTION'
                                        ? getString('organigramEventPromotion')
                                        : getString('organigramEventTransfer')
                                }
                                size="small"
                                color={
                                    moveEventCode(hintMove) === 'PROMOTION'
                                        ? 'success'
                                        : 'info'
                                }
                            />
                        )}
                    </Box>
                    {hoverTarget?.kind === 'event' ? (
                        <Typography variant="body2">
                            {getString(
                                hoverTarget.code === 'TEMPORARY_LEAVE'
                                    ? 'organigramLeaveBay'
                                    : 'organigramDismissBay',
                            )}
                        </Typography>
                    ) : hintMove == null ? (
                        <Typography variant="body2" color="text.secondary">
                            {getString('organigramDropHintIdle')}
                        </Typography>
                    ) : hoverTarget?.kind === 'bay' ? (
                        <Typography variant="body2">
                            {getString('organigramTransferBay')}
                        </Typography>
                    ) : (
                        <Typography variant="body2">
                            {hintMove.toJobName ?? getString('organigramPickJobInDialog')} —{' '}
                            {hintMove.toDeptName}
                        </Typography>
                    )}
                </Paper>
            )}

            {/* ── Confirm the move: effective date wheel + event creation ────
                Keyed per move so the dialog remounts with a fresh state. */}
            <OrganigramMoveDialog
                key={
                    move
                        ? `${move.employeeId}-${move.toDeptId ?? 'x'}-${move.toJobId ?? 'x'}`
                        : 'closed'
                }
                move={move}
                getString={getString}
                onClose={() => setMove(null)}
                setSnackbar={setSnackbar}
            />

            {/* ── Confirm a leave / dismissal drop (status event) ──────────── */}
            <OrganigramStatusEventDialog
                key={
                    statusEvent
                        ? `${statusEvent.employeeId}-${statusEvent.code}`
                        : 'ev-closed'
                }
                request={statusEvent}
                getString={getString}
                onClose={() => setStatusEvent(null)}
                setSnackbar={setSnackbar}
            />
        </Paper>
    );
}
