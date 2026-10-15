// src/components/admin/department_types/organigram/DepartmentTypeOrganigramCard.tsx
//
// One department-type card of the organigram. Outside the editing modes a
// DOUBLE click FOCUSES the type (it becomes the top of the view) — a single
// click does nothing, so a stray click never re-roots the view. A card with
// drawn children carries two tiny layout icons (top-down / left-right) that
// set how ITS branch is laid out (partial transpose). The job-count chip
// opens the card's job box (DepartmentTypeJobBox) in any mode.
//
// TYPES mode (blue): the card is a drag source (its link to the parent shown
// above) and a drop target — plain drop = move that link here, Ctrl+drop =
// add this as an extra parent. JOBS mode (green): the card is a drop target
// for jobs — plain drop = move the job link here, Ctrl / from the panel = add.
import { Box, Chip, IconButton, Paper, Tooltip, Typography } from '@mui/material';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import AlignHorizontalLeftIcon from '@mui/icons-material/AlignHorizontalLeft';
import AlignVerticalTopIcon from '@mui/icons-material/AlignVerticalTop';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import { canLink, type TypeTreeNode } from './buildDeptTypeGraph';
import { canLinkJob, dropActionFor, startDrag, type DropAction, type OrgCtx } from './organigramDrag';
import { OrganigramMode } from './organigramMode';
import { DepartmentTypeJobBox } from './DepartmentTypeJobBox';
import { useDeptTypeOrganigramStore } from '../../../../store/deptTypeOrganigramStore';
import {
    OrganigramOrientation,
    organigramOrientationLabel,
} from '../../../organigram/organigramOrientation';

const TYPE_CARD_W = 210;

const LAYOUT_ICONS = [
    { mode: OrganigramOrientation.TOP_DOWN, Icon: AlignVerticalTopIcon },
    { mode: OrganigramOrientation.LEFT_RIGHT, Icon: AlignHorizontalLeftIcon },
] as const;

const chipSx = { height: 20, fontSize: '0.7rem', '& .MuiChip-icon': { fontSize: 14 } };

export function DepartmentTypeOrganigramCard({
    node,
    ctx,
    emphasis = false,
    isFocus = false,
    layout,
}: {
    node: TypeTreeNode;
    ctx: OrgCtx;
    emphasis?: boolean;
    isFocus?: boolean;
    /** This branch's layout + setter; omitted for a card with no drawn children. */
    layout?: { mode: OrganigramOrientation; onChange: (mode: OrganigramOrientation) => void };
}) {
    const { getString, graph, dragMode, dragging, hover, jobs } = ctx;
    const { type, link } = node;
    const jobsMode = ctx.mode === OrganigramMode.JOBS;

    // Which drag (if any) this card accepts right now.
    const typeDroppable = dragMode && dragging != null && canLink(graph, dragging.type.id, type.id);
    const jobDroppable = jobsMode && jobs.dragging != null && canLinkJob(jobs, jobs.dragging.job.id, type.id);
    const droppable = typeDroppable || jobDroppable;
    const activeHover = jobsMode ? jobs.hover : hover;
    const hovered = droppable && activeHover?.key === node.key;
    const accent = jobsMode ? 'success.main' : 'info.main';

    const inactiveLink = link != null && !link.is_active;
    const jobLinks = jobs.linksByType.get(type.id) ?? [];
    const boxOpen = jobs.openKeys.has(node.key);
    const boxPlacement = useDeptTypeOrganigramStore((s) => s.jobBoxPlacement);

    const actionOf = (ctrl: boolean): DropAction =>
        jobsMode ? dropActionFor(jobs.dragging!, ctrl) : dropActionFor(dragging!, ctrl);

    return (
        // Wrapper: positions the job box next to the card; lifted above the
        // neighbours while the box is open (it floats over them).
        <Box sx={{ position: 'relative', flexShrink: 0, zIndex: boxOpen ? 3 : 1 }}>
            <Paper
                variant="outlined"
                className="org-card"
                data-org-key={node.key}
                draggable={dragMode}
                onDragStart={dragMode ? (e) => startDrag(e, { type, link }, ctx.onDragStart) : undefined}
                onDragEnd={dragMode ? ctx.onDragEnd : undefined}
                onDragOver={
                    droppable
                        ? (e) => {
                              e.preventDefault();
                              const action = actionOf(e.ctrlKey);
                              e.dataTransfer.dropEffect = action === 'add' ? 'copy' : 'move';
                              if (!hovered || activeHover?.action !== action) {
                                  const target = { key: node.key, type, action };
                                  if (jobsMode) jobs.onHover(target);
                                  else ctx.onHover(target);
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
                              const action = actionOf(e.ctrlKey);
                              if (jobsMode) jobs.onDrop(type, action);
                              else ctx.onDrop(type, action);
                          }
                        : undefined
                }
                onDoubleClick={isFocus || dragMode ? undefined : () => ctx.onFocus(node.key)}
                sx={{
                    p: 1,
                    position: 'relative',
                    width: TYPE_CARD_W,
                    bgcolor: 'background.paper',
                    cursor: dragMode ? 'grab' : isFocus ? 'default' : 'pointer',
                    ...(emphasis && { bgcolor: 'action.selected', borderColor: 'primary.main' }),
                    ...(!type.is_active && { opacity: 0.5 }),
                    ...(inactiveLink && { borderStyle: 'dashed' }),
                    ...(droppable && { outline: '1px dashed', outlineColor: accent }),
                    ...(ctx.highlightKey === node.key && {
                        outline: '2px solid',
                        outlineColor: 'warning.main',
                        outlineOffset: '2px',
                    }),
                    ...(hovered && { outline: '2px solid', outlineColor: accent, bgcolor: 'action.hover' }),
                    '&:hover': !dragMode && !isFocus ? { borderColor: 'primary.light' } : undefined,
                }}
            >
                {layout && (
                    <Box
                        onDoubleClick={(e) => e.stopPropagation()}
                        sx={{ position: 'absolute', top: 2, right: 2, display: 'flex' }}
                    >
                        {LAYOUT_ICONS.map(({ mode, Icon }) => (
                            <Tooltip key={mode} title={organigramOrientationLabel(mode, getString)}>
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        layout.onChange(mode);
                                    }}
                                    sx={{
                                        p: '1px',
                                        color: layout.mode === mode ? 'primary.main' : 'text.disabled',
                                    }}
                                >
                                    <Icon sx={{ fontSize: 12 }} />
                                </IconButton>
                            </Tooltip>
                        ))}
                    </Box>
                )}
                <Typography
                    variant="subtitle2"
                    fontWeight={700}
                    align="center"
                    sx={{ lineHeight: 1.25, px: layout ? 3 : 0 }}
                >
                    {type.name}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                    <Tooltip title={getString('childTypesCount')}>
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
                {(!type.is_active || inactiveLink) && (
                    <Typography variant="caption" color="text.secondary" display="block" align="center">
                        {getString(type.is_active ? 'deptTypeOrgLinkInactive' : 'inactive')}
                    </Typography>
                )}
            </Paper>
            {boxOpen && (
                <DepartmentTypeJobBox
                    links={jobLinks}
                    jobs={jobs}
                    draggable={jobsMode}
                    placement={boxPlacement}
                    onClose={() => jobs.onToggleBox(node.key)}
                    getString={getString}
                />
            )}
        </Box>
    );
}
