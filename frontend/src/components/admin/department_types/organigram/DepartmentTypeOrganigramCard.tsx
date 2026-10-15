// src/components/admin/department_types/organigram/DepartmentTypeOrganigramCard.tsx
//
// One department-type card of the organigram. Outside drag mode a DOUBLE
// click FOCUSES the type (it becomes the top of the view) — a single click
// does nothing, so a stray click never re-roots the view. A card with drawn
// children carries two tiny layout icons (top-down / left-right) that set how
// ITS branch is laid out (partial transpose). In drag mode the card is
// both a drag source (its link to the parent shown above) and a drop target:
// plain drop = move that link here, Ctrl+drop = add this as an extra parent.
import type { ReactNode } from 'react';
import { Box, Chip, IconButton, Paper, Tooltip, Typography } from '@mui/material';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import AlignHorizontalLeftIcon from '@mui/icons-material/AlignHorizontalLeft';
import AlignVerticalTopIcon from '@mui/icons-material/AlignVerticalTop';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import { canLink, type TypeTreeNode } from './buildDeptTypeGraph';
import { dropActionFor, startDrag, type OrgCtx } from './organigramDrag';
import {
    OrganigramOrientation,
    organigramOrientationLabel,
} from '../../../organigram/organigramOrientation';

const TYPE_CARD_W = 210;

const LAYOUT_ICONS = [
    { mode: OrganigramOrientation.TOP_DOWN, Icon: AlignVerticalTopIcon },
    { mode: OrganigramOrientation.LEFT_RIGHT, Icon: AlignHorizontalLeftIcon },
] as const;

export function DepartmentTypeOrganigramCard({
    node,
    ctx,
    emphasis = false,
    isFocus = false,
    layout,
    footer,
}: {
    node: TypeTreeNode;
    ctx: OrgCtx;
    emphasis?: boolean;
    isFocus?: boolean;
    /** This branch's layout + setter; omitted for a card with no drawn children. */
    layout?: { mode: OrganigramOrientation; onChange: (mode: OrganigramOrientation) => void };
    /** Slot under the counters (reserved for the future job list). */
    footer?: ReactNode;
}) {
    const { getString, graph, dragMode, dragging, hover } = ctx;
    const { type, link } = node;

    const droppable = dragMode && dragging != null && canLink(graph, dragging.type.id, type.id);
    const hovered = droppable && hover?.key === node.key;
    const inactiveLink = link != null && !link.is_active;

    return (
        <Paper
            variant="outlined"
            className="org-card"
            draggable={dragMode}
            onDragStart={dragMode ? (e) => startDrag(e, { type, link }, ctx.onDragStart) : undefined}
            onDragEnd={dragMode ? ctx.onDragEnd : undefined}
            onDragOver={
                droppable
                    ? (e) => {
                          e.preventDefault();
                          const action = dropActionFor(dragging, e.ctrlKey);
                          e.dataTransfer.dropEffect = action === 'add' ? 'copy' : 'move';
                          if (!hovered || hover?.action !== action)
                              ctx.onHover({ key: node.key, type, action });
                      }
                    : undefined
            }
            onDragLeave={hovered ? () => ctx.onHover(null) : undefined}
            onDrop={
                droppable
                    ? (e) => {
                          e.preventDefault();
                          ctx.onDrop(type, dropActionFor(dragging, e.ctrlKey));
                      }
                    : undefined
            }
            data-org-key={node.key}
            onDoubleClick={isFocus || dragMode ? undefined : () => ctx.onFocus(node.key)}
            sx={{
                p: 1,
                position: 'relative',
                width: TYPE_CARD_W,
                flexShrink: 0,
                zIndex: 1,
                bgcolor: 'background.paper',
                cursor: dragMode ? 'grab' : isFocus ? 'default' : 'pointer',
                ...(emphasis && { bgcolor: 'action.selected', borderColor: 'primary.main' }),
                ...(!type.is_active && { opacity: 0.5 }),
                ...(inactiveLink && { borderStyle: 'dashed' }),
                ...(droppable && { outline: '1px dashed', outlineColor: 'divider' }),
                ...(ctx.highlightKey === node.key && {
                    outline: '2px solid',
                    outlineColor: 'warning.main',
                    outlineOffset: '2px',
                }),
                ...(hovered && {
                    outlineColor: hover.action === 'add' ? 'success.main' : 'info.main',
                    bgcolor: 'action.hover',
                }),
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
                        sx={{ height: 20, fontSize: '0.7rem', '& .MuiChip-icon': { fontSize: 14 } }}
                    />
                </Tooltip>
                <Tooltip title={getString('deptTypeOrgJobCount')}>
                    <Chip
                        icon={<WorkOutlineIcon />}
                        label={type.job_count}
                        size="small"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.7rem', '& .MuiChip-icon': { fontSize: 14 } }}
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
            {footer}
        </Paper>
    );
}
