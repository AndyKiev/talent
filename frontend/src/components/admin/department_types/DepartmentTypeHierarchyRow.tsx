// src/components/admin/department_types/DepartmentTypeHierarchyRow.tsx
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
import DeleteIcon from '@mui/icons-material/Delete';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

import type { DepartmentType } from './departmentTypeApi';
import {
    fetchChildrenByParent,
    type DepartmentTypeChild,
} from './departmentTypeParentalLinkApi';
import { deptTypeChildrenQK } from './useDepartmentTypeLinkMutations';
import type { PendingEdit } from './DepartmentTypeEditDialog';
import type { UseMutationResult } from '@tanstack/react-query';
import type { MutationResponse } from './departmentTypeParentalLinkApi';
import { DepartmentTypeLinkDialog } from './DepartmentTypeLinkDialog';
import { DepartmentTypeMoveDialog } from './DepartmentTypeMoveDialog';
import { TextEditCell } from '../TextEditCell';
import { ReadonlyCell } from '../ReadonlyCell';
import { formatToUkrDate } from '../../../utils/dateFormatter';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';

interface MoveVars {
    linkId: number;
    newParentId: number;
    oldParentId: number;
}

interface ToggleLinkVars {
    linkId: number;
    parentId: number;
    isActive: boolean;
}

interface Props {
    type: DepartmentType;
    allTypes: DepartmentType[];
    depth?: number;
    updateIsPending: boolean;
    deleteIsPending: boolean;
    deleteLinkIsPending: boolean;
    createLinkMutation: UseMutationResult<MutationResponse<unknown>, Error, { child_id: number; parent_id: number; is_active?: boolean }>;
    updateLinkMutation: UseMutationResult<MutationResponse<unknown>, Error, MoveVars>;
    toggleLinkActiveMutation: UseMutationResult<MutationResponse<unknown>, Error, ToggleLinkVars>;
    onToggleActive: (type: DepartmentType) => void;
    onDeleteClick: (type: DepartmentType) => void;
    onRequestEdit: (pending: PendingEdit) => void;
    onDeleteLink: (linkId: number, parentId: number) => void;
    /** Snackbar setter — passed down for the link dialog */
    setSnackbar: (s: { open: boolean; message: string; severity: 'success' | 'error' }) => void;
}

export function DepartmentTypeHierarchyRow({
                                               type,
                                               allTypes,
                                               depth = 0,
                                               updateIsPending,
                                               deleteIsPending,
                                               deleteLinkIsPending,
                                               createLinkMutation,
                                               updateLinkMutation,
                                               toggleLinkActiveMutation,
                                               onToggleActive,
                                               onDeleteClick,
                                               onRequestEdit,
                                               onDeleteLink,
                                           }: Props) {
    const getString = useString({ str });

    const [expanded, setExpanded] = useState(false);
    const [editingField, setEditingField] = useState<string | null>(null);
    const [linkDialogOpen, setLinkDialogOpen] = useState(false);
    const [moveChild, setMoveChild] = useState<DepartmentTypeChild | null>(null);

    // Always fetch children (cheap + cached) so we know leaf-status & count
    // up front — no API change needed.
    const {
        data: children = [],
        isLoading: childrenLoading,
        isFetched: childrenFetched,
    } = useQuery({
        queryKey: deptTypeChildrenQK(type.id),
        queryFn: () => fetchChildrenByParent(type.id),
        staleTime: 2 * 60 * 1000,
    });

    const childCount = children.length;
    const isLeaf = childrenFetched && childCount === 0;

    const handleNameSave = useCallback(
        (val: string) => {
            onRequestEdit({
                id: type.id,
                fieldLabel: getString('name') || 'Name',
                field: 'name',
                newValue: val,
                oldValue: type.name,
            });
            setEditingField(null);
        },
        [type, getString, onRequestEdit],
    );

    const handleToggleLinkActive = useCallback(
        (child: DepartmentTypeChild) => {
            if (child.link_id == null) return;
            toggleLinkActiveMutation.mutate({
                linkId: child.link_id,
                parentId: type.id,
                isActive: !(child.link_is_active ?? false),
            });
        },
        [toggleLinkActiveMutation, type.id],
    );

    const indentPx = depth * 28;

    return (
        <Box>
            {/* ── Row ────────────────────────────────────────────────────────── */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    pl: depth > 0 ? '12px' : `${indentPx + 8}px`,
                    pr: 1,
                    py: 0.75,
                    minHeight: 48,
                    borderLeft: depth > 0 ? '2px solid' : 'none',
                    borderLeftColor: 'divider',
                    ml: depth > 0 ? `${indentPx - 4}px` : 0,
                    '&:hover': { bgcolor: 'action.hover' },
                    transition: 'background-color 0.15s',
                    borderRadius: 1,
                }}
            >
                {/* Expand toggle — or leaf dot when no children */}
                {isLeaf ? (
                    <Tooltip title={getString('leafDepartmentType') || 'No child types (leaf)'}>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 28,
                                flexShrink: 0,
                            }}
                        >
                            <FiberManualRecordIcon sx={{ fontSize: 8, color: 'text.disabled' }} />
                        </Box>
                    </Tooltip>
                ) : (
                    <IconButton
                        size="small"
                        onClick={() => setExpanded((p) => !p)}
                        sx={{ p: 0.25, flexShrink: 0 }}
                    >
                        {expanded ? (
                            <ExpandMoreIcon sx={{ fontSize: 18 }} />
                        ) : (
                            <ChevronRightIcon sx={{ fontSize: 18 }} />
                        )}
                    </IconButton>
                )}

                {/* Name inline edit */}
                <Box
                    sx={{ minWidth: 160, flex: '1 1 auto' }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {editingField === 'name' ? (
                        <TextEditCell
                            value={type.name}
                            onSave={handleNameSave}
                            onCancel={() => setEditingField(null)}
                            isPending={updateIsPending}
                        />
                    ) : (
                        <ReadonlyCell
                            value={type.name}
                            onEdit={(e) => { e.stopPropagation(); setEditingField('name'); }}
                            editTitle={getString('editName') || 'Edit name'}
                        />
                    )}
                </Box>

                {/* Child count badge (branches only) */}
                {!isLeaf && childCount > 0 && (
                    <Tooltip title={getString('childTypesCount') || 'Linked child types'}>
                        <Chip
                            label={childCount}
                            size="small"
                            variant="outlined"
                            color="primary"
                            sx={{ fontSize: '0.7rem', height: 20, minWidth: 28, flexShrink: 0 }}
                        />
                    </Tooltip>
                )}

                {/* Active badge */}
                <Chip
                    label={type.is_active ? (getString('active') || 'Active') : (getString('inactive') || 'Inactive')}
                    size="small"
                    color={type.is_active ? 'success' : 'default'}
                    sx={{ fontSize: '0.7rem', height: 20, flexShrink: 0 }}
                />

                {/* Active toggle */}
                <Box onClick={(e) => e.stopPropagation()} sx={{ flexShrink: 0 }}>
                    <Tooltip title={getString('toggleActive') || 'Toggle active'}>
                        <Switch
                            size="small"
                            checked={type.is_active}
                            onChange={() => onToggleActive(type)}
                            disabled={updateIsPending}
                        />
                    </Tooltip>
                </Box>

                {/* Created at */}
                <Typography
                    variant="caption"
                    sx={{ color: 'text.disabled', fontFamily: 'monospace', flexShrink: 0, display: { xs: 'none', md: 'block' } }}
                >
                    {formatToUkrDate(type.created_at)}
                </Typography>

                {/* ID badge */}
                <Typography
                    variant="caption"
                    sx={{ color: 'text.disabled', fontFamily: 'monospace', ml: 'auto', flexShrink: 0 }}
                >
                    #{type.id}
                </Typography>

                {/* Add child link */}
                <Tooltip title={getString('addChildDepartmentType') || 'Add child type link'}>
                    <IconButton
                        size="small"
                        color="primary"
                        onClick={(e) => { e.stopPropagation(); setLinkDialogOpen(true); }}
                    >
                        <AddIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </Tooltip>

                {/* Delete type */}
                <Tooltip title={getString('delete') || 'Delete'}>
                    <span>
                        <IconButton
                            size="small"
                            color="error"
                            disabled={deleteIsPending}
                            onClick={(e) => { e.stopPropagation(); onDeleteClick(type); }}
                        >
                            <DeleteIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </span>
                </Tooltip>
            </Box>

            {/* ── Children (branches only, when expanded) ─────────────────── */}
            {!isLeaf && (
                <Collapse in={expanded} timeout="auto" unmountOnExit>
                    {childrenLoading && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1, pl: `${indentPx + 40}px` }}>
                            <CircularProgress size={18} />
                        </Box>
                    )}

                    {!childrenLoading &&
                        children.map((child) => (
                            <ChildLinkRow
                                key={child.id}
                                child={child}
                                parentId={type.id}
                                indentPx={indentPx + 28}
                                deleteLinkIsPending={deleteLinkIsPending}
                                toggleLinkIsPending={toggleLinkActiveMutation.isPending}
                                onDeleteLink={onDeleteLink}
                                onToggleLinkActive={handleToggleLinkActive}
                                onMoveClick={setMoveChild}
                                getString={getString}
                            />
                        ))}
                </Collapse>
            )}

            {/* ── Add link dialog ─────────────────────────────────────────── */}
            <DepartmentTypeLinkDialog
                open={linkDialogOpen}
                parentType={type}
                allTypes={allTypes}
                existingChildren={children}
                createLinkMutation={createLinkMutation}
                onClose={() => setLinkDialogOpen(false)}
            />

            {/* ── Move child dialog ───────────────────────────────────────── */}
            <DepartmentTypeMoveDialog
                open={!!moveChild}
                childType={moveChild ? { ...type, id: moveChild.id, name: moveChild.name } : null}
                currentParentId={type.id}
                linkId={moveChild?.link_id ?? null}
                allTypes={allTypes}
                updateLinkMutation={updateLinkMutation}
                onClose={() => setMoveChild(null)}
            />
        </Box>
    );
}

// ── Small sub-component for a linked child row ──────────────────────────────

interface ChildLinkRowProps {
    child: DepartmentTypeChild;
    parentId: number;
    indentPx: number;
    deleteLinkIsPending: boolean;
    toggleLinkIsPending: boolean;
    onDeleteLink: (linkId: number, parentId: number) => void;
    onToggleLinkActive: (child: DepartmentTypeChild) => void;
    onMoveClick: (child: DepartmentTypeChild) => void;
    getString: (key: string) => string;
}

function ChildLinkRow({
                          child,
                          parentId,
                          indentPx,
                          deleteLinkIsPending,
                          toggleLinkIsPending,
                          onDeleteLink,
                          onToggleLinkActive,
                          onMoveClick,
                          getString,
                      }: ChildLinkRowProps) {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                pl: `${indentPx}px`,
                pr: 1,
                py: 0.5,
                minHeight: 36,
                borderLeft: '2px solid',
                borderLeftColor: 'primary.light',
                ml: `${indentPx - 4}px`,
                '&:hover': { bgcolor: 'action.hover' },
                borderRadius: 1,
            }}
        >
            {/* Child name */}
            <Typography variant="body2" sx={{ flex: 1, pl: '12px' }}>
                {child.name}
            </Typography>

            {/* Active chip */}
            <Chip
                label={child.is_active ? (getString('active') || 'Active') : (getString('inactive') || 'Inactive')}
                size="small"
                color={child.is_active ? 'success' : 'default'}
                sx={{ fontSize: '0.7rem', height: 20 }}
            />

            {/* Link-active toggle */}
            <Tooltip
                title={
                    child.link_is_active
                        ? getString('linkActive') || 'Link active — click to deactivate'
                        : getString('linkInactive') || 'Link inactive — click to activate'
                }
            >
                <span>
                    <Switch
                        size="small"
                        checked={!!child.link_is_active}
                        onChange={() => onToggleLinkActive(child)}
                        disabled={toggleLinkIsPending || child.link_id == null}
                        onClick={(e) => e.stopPropagation()}
                    />
                </span>
            </Tooltip>

            {/* link_id badge */}
            <Typography
                variant="caption"
                sx={{ color: 'text.disabled', fontFamily: 'monospace' }}
            >
                link #{child.link_id}
            </Typography>

            {/* Move button */}
            <Tooltip title={getString('moveDepartmentType') || 'Move to another parent'}>
                <span>
                    <IconButton
                        size="small"
                        color="primary"
                        disabled={child.link_id == null}
                        onClick={() => onMoveClick(child)}
                    >
                        <DriveFileMoveIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </span>
            </Tooltip>

            {/* Unlink button */}
            <Tooltip title={getString('removeLink') || 'Remove link'}>
                <span>
                    <IconButton
                        size="small"
                        color="warning"
                        disabled={deleteLinkIsPending || child.link_id == null}
                        onClick={() => child.link_id != null && onDeleteLink(child.link_id, parentId)}
                    >
                        <LinkOffIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </span>
            </Tooltip>
        </Box>
    );
}