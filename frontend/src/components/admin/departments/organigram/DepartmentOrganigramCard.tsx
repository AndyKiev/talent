// src/components/admin/departments/organigram/DepartmentOrganigramCard.tsx
//
// One department card of the structure organigram: name, type, child count,
// job count (opens the read-only job box — the jobs of the department's
// TYPE), and an (i) icon (top right) when the backend says the department
// deviates from the department-type structure (`matches_type_structure` =
// false); its hover lists the parent types the structure designates.
// Outside STRUCTURE mode a double click focuses the department.
//
// STRUCTURE mode (blue): the card is a drag source (re-parent it) and a drop
// target (drop = move the dragged department under this one), plus action
// icons: add child, edit, generate subtree, delete.
// JOBS mode (green): the card is a drop target for jobs and its job box rows
// drag — exactly like the type organigram, but the link lands on the card's
// TYPE (plain drop = move the job link there, Ctrl / from the panel = add).
import { Box, Chip, IconButton, Paper, Tooltip, Typography } from '@mui/material';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import AddIcon from '@mui/icons-material/Add';
import AlignHorizontalLeftIcon from '@mui/icons-material/AlignHorizontalLeft';
import AlignVerticalTopIcon from '@mui/icons-material/AlignVerticalTop';
import AutoAwesomeMotionIcon from '@mui/icons-material/AutoAwesomeMotion';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import type { DepartmentNode } from '../departmentApi';
import { DepartmentTypeJobBox } from '../../department_types/organigram/DepartmentTypeJobBox';
import {
    beginDrag,
    canLinkJob,
    dropActionFor,
    type JobCtx,
} from '../../department_types/organigram/organigramDrag';
import type { JobBoxPlacement } from '../../department_types/organigram/jobBoxPlacement';
import type { OrgCardSlot } from '../../../organigram/OrganigramTree';
import {
    OrganigramOrientation,
    organigramOrientationLabel,
} from '../../../organigram/organigramOrientation';
import type { DeptTreeNode } from './buildDepartmentGraph';
import type { GetStringFn } from '../../../../types/getStringFn';

const CARD_W = 220;

const LAYOUT_ICONS = [
    { mode: OrganigramOrientation.TOP_DOWN, Icon: AlignVerticalTopIcon },
    { mode: OrganigramOrientation.LEFT_RIGHT, Icon: AlignHorizontalLeftIcon },
] as const;

const chipSx = { height: 20, fontSize: '0.7rem', '& .MuiChip-icon': { fontSize: 14 } };
const actionSx = { p: '2px' };

export interface DeptOrgCtx {
    getString: GetStringFn;
    /** STRUCTURE mode — cards drag / drop and show their action icons. */
    editMode: boolean;
    /** JOBS mode — cards accept job drops, job box rows drag. */
    jobsMode: boolean;
    dragging: DepartmentNode | null;
    hoverKey: string | null;
    /** Card found by the types panel's find-next (outlined). */
    highlightKey: string | null;
    canDrop: (target: DepartmentNode) => boolean;
    onFocus: (id: number) => void;
    onDragStart: (dept: DepartmentNode) => void;
    onDragEnd: () => void;
    onHover: (key: string | null) => void;
    onDrop: (target: DepartmentNode) => void;
    onAddChild: (dept: DepartmentNode) => void;
    onEdit: (dept: DepartmentNode) => void;
    onGenerate: (dept: DepartmentNode) => void;
    onDelete: (dept: DepartmentNode) => void;
    /** Jobs layer (useOrganigramJobs): links live on the department's TYPE. */
    jobs: JobCtx;
    boxPlacement: JobBoxPlacement;
}

/** Hover text of the (i) mismatch icon: where the TYPE structure expects a
 *  department of this type to hang (backend `expected_parent_types`). */
function DeviationHint({ dept, getString }: { dept: DepartmentNode; getString: GetStringFn }) {
    const expected = dept.expected_parent_types ?? [];
    return (
        <Box>
            <Typography variant="caption" display="block" fontWeight={600}>
                {getString('deptOrgDeviates')}
            </Typography>
            <Typography variant="caption" display="block">
                {expected.length > 0
                    ? getString('deptOrgExpectedParents', { types: expected.map((t) => t.name).join(', ') })
                    : getString('deptOrgNoExpectedParents', { type: dept.department_type?.name ?? '' })}
            </Typography>
        </Box>
    );
}

export function DepartmentOrganigramCard({
    node,
    ctx,
    slot,
}: {
    node: DeptTreeNode;
    ctx: DeptOrgCtx;
    slot: OrgCardSlot;
}) {
    const { getString, editMode, jobsMode, dragging, jobs } = ctx;
    const { dept } = node;
    const { emphasis, isFocus, layout } = slot;
    const typeTarget = { id: dept.department_type_id, name: dept.department_type?.name ?? '' };

    const deptDroppable = editMode && dragging != null && ctx.canDrop(dept);
    const jobDroppable =
        jobsMode && jobs.dragging != null && canLinkJob(jobs, jobs.dragging.job.id, dept.department_type_id);
    const droppable = deptDroppable || jobDroppable;
    const hovered = jobsMode
        ? jobDroppable && jobs.hover?.key === node.key
        : deptDroppable && ctx.hoverKey === node.key;
    const accent = jobsMode ? 'success.main' : 'info.main';
    // A root is never dragged: moving it would leave the structure without a top.
    const draggable = editMode && dept.parent_id != null;
    const jobLinks = jobs.linksByType.get(dept.department_type_id) ?? [];
    const boxOpen = jobs.openKeys.has(node.key);
    const deviates = !dept.matches_type_structure;

    const actions = [
        { key: 'add', title: getString('addChildDepartment'), Icon: AddIcon, onClick: ctx.onAddChild },
        { key: 'edit', title: getString('editDepartment'), Icon: EditOutlinedIcon, onClick: ctx.onEdit },
        {
            key: 'gen',
            title: getString('generateSubtree'),
            Icon: AutoAwesomeMotionIcon,
            onClick: ctx.onGenerate,
        },
        { key: 'del', title: getString('deleteDepartment'), Icon: DeleteOutlineIcon, onClick: ctx.onDelete },
    ];

    return (
        <Box sx={{ position: 'relative', flexShrink: 0, zIndex: boxOpen ? 3 : 1 }}>
            <Paper
                variant="outlined"
                className="org-card"
                data-org-key={node.key}
                draggable={draggable}
                onDragStart={
                    draggable
                        ? (e) => {
                              beginDrag(e, dept.name);
                              ctx.onDragStart(dept);
                          }
                        : undefined
                }
                onDragEnd={draggable ? ctx.onDragEnd : undefined}
                onDragOver={
                    droppable
                        ? (e) => {
                              e.preventDefault();
                              if (jobsMode) {
                                  const action = dropActionFor(jobs.dragging!, e.ctrlKey);
                                  e.dataTransfer.dropEffect = action === 'add' ? 'copy' : 'move';
                                  if (!hovered || jobs.hover?.action !== action)
                                      jobs.onHover({ key: node.key, type: typeTarget, action });
                              } else {
                                  e.dataTransfer.dropEffect = 'move';
                                  if (!hovered) ctx.onHover(node.key);
                              }
                          }
                        : undefined
                }
                onDragLeave={
                    hovered ? () => (jobsMode ? jobs.onHover(null) : ctx.onHover(null)) : undefined
                }
                onDrop={
                    droppable
                        ? (e) => {
                              e.preventDefault();
                              if (jobsMode) jobs.onDrop(typeTarget, dropActionFor(jobs.dragging!, e.ctrlKey));
                              else ctx.onDrop(dept);
                          }
                        : undefined
                }
                onDoubleClick={isFocus || editMode ? undefined : () => ctx.onFocus(dept.id)}
                sx={{
                    p: 1,
                    position: 'relative',
                    width: CARD_W,
                    bgcolor: 'background.paper',
                    cursor: draggable ? 'grab' : isFocus || editMode ? 'default' : 'pointer',
                    ...(emphasis && { bgcolor: 'action.selected', borderColor: 'primary.main' }),
                    ...(!dept.is_active && { opacity: 0.5 }),
                    ...(deviates && { borderColor: 'warning.main' }),
                    ...(droppable && { outline: '1px dashed', outlineColor: accent }),
                    ...(ctx.highlightKey === node.key && {
                        outline: '2px solid',
                        outlineColor: 'warning.main',
                        outlineOffset: '2px',
                    }),
                    ...(hovered && { outline: '2px solid', outlineColor: accent, bgcolor: 'action.hover' }),
                    '&:hover': !editMode && !isFocus ? { borderColor: 'primary.light' } : undefined,
                }}
            >
                {(layout || deviates) && (
                    <Box
                        onDoubleClick={(e) => e.stopPropagation()}
                        sx={{ position: 'absolute', top: 2, right: 2, display: 'flex', alignItems: 'center' }}
                    >
                        {layout && LAYOUT_ICONS.map(({ mode, Icon }) => (
                            <Tooltip key={mode} title={organigramOrientationLabel(mode, getString)}>
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        layout.onChange(mode);
                                    }}
                                    sx={{ p: '1px', color: layout.mode === mode ? 'primary.main' : 'text.disabled' }}
                                >
                                    <Icon sx={{ fontSize: 12 }} />
                                </IconButton>
                            </Tooltip>
                        ))}
                        {deviates && (
                            <Tooltip title={<DeviationHint dept={dept} getString={getString} />}>
                                <InfoOutlinedIcon color="warning" sx={{ fontSize: 16, ml: '1px' }} />
                            </Tooltip>
                        )}
                    </Box>
                )}
                <Typography
                    variant="subtitle2"
                    fontWeight={700}
                    align="center"
                    sx={{ lineHeight: 1.25, px: layout && deviates ? 5.5 : 3 }}
                >
                    {dept.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" align="center" noWrap>
                    {dept.department_type?.name ?? ''}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                    <Tooltip title={getString('deptOrgChildCount')}>
                        <Chip
                            icon={<AccountTreeOutlinedIcon />}
                            label={node.childCount}
                            size="small"
                            variant="outlined"
                            sx={chipSx}
                        />
                    </Tooltip>
                    <Tooltip title={getString('deptTypeOrgJobBoxHint')}>
                        <Chip
                            icon={<WorkOutlineIcon />}
                            label={jobLinks.length}
                            size="small"
                            variant={boxOpen ? 'filled' : 'outlined'}
                            color={boxOpen || jobsMode ? 'success' : 'default'}
                            onClick={(e) => {
                                e.stopPropagation();
                                jobs.onToggleBox(node.key);
                            }}
                            onDoubleClick={(e) => e.stopPropagation()}
                            sx={{ ...chipSx, cursor: 'pointer' }}
                        />
                    </Tooltip>
                    {node.hiddenChildCount > 0 && (
                        <Tooltip title={getString('deptTypeOrgMoreLevelsHint')}>
                            <Chip
                                label={getString('deptTypeOrgMoreLevels', { count: node.hiddenChildCount })}
                                size="small"
                                color="primary"
                                sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                        </Tooltip>
                    )}
                </Box>
                {!dept.is_active && (
                    <Typography variant="caption" color="text.secondary" display="block" align="center">
                        {getString('inactive')}
                    </Typography>
                )}
                {editMode && (
                    <Box
                        onDoubleClick={(e) => e.stopPropagation()}
                        sx={{ display: 'flex', justifyContent: 'center', gap: 0.25, mt: 0.5 }}
                    >
                        {actions.map(({ key, title, Icon, onClick }) => (
                            <Tooltip key={key} title={title}>
                                <IconButton
                                    size="small"
                                    color={key === 'del' ? 'error' : 'primary'}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onClick(dept);
                                    }}
                                    sx={actionSx}
                                >
                                    <Icon sx={{ fontSize: 16 }} />
                                </IconButton>
                            </Tooltip>
                        ))}
                    </Box>
                )}
            </Paper>
            {boxOpen && (
                <DepartmentTypeJobBox
                    links={jobLinks}
                    jobs={jobs}
                    draggable={jobsMode}
                    placement={ctx.boxPlacement}
                    onClose={() => jobs.onToggleBox(node.key)}
                    getString={getString}
                />
            )}
        </Box>
    );
}
