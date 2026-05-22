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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import type { DepartmentType } from './departmentTypeApi';
import { fetchChildrenByParent, type DepartmentTypeChild } from './departmentTypeParentalLinkApi';
import { deptTypeChildrenQK } from './useDepartmentTypeLinkMutations';
import type { PendingEdit } from './DepartmentTypeEditDialog';
import type { UseMutationResult } from '@tanstack/react-query';
import type { MutationResponse } from './departmentTypeParentalLinkApi';
import { DepartmentTypeLinkDialog } from './DepartmentTypeLinkDialog';
import { TextEditCell } from '../TextEditCell';
import { ReadonlyCell } from '../ReadonlyCell';
import { formatToUkrDate } from '../../../utils/dateFormatter';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';

interface Props {
    type: DepartmentType;
    allTypes: DepartmentType[];
    depth?: number;
    updateIsPending: boolean;
    deleteIsPending: boolean;
    deleteLinkIsPending: boolean;
    createLinkMutation: UseMutationResult<MutationResponse<unknown>, Error, { child_id: number; parent_id: number; is_active?: boolean }>;
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
                                               onToggleActive,
                                               onDeleteClick,
                                               onRequestEdit,
                                               onDeleteLink,
                                           }: Props) {
    const getString = useString({ str });

    const [expanded, setExpanded] = useState(false);
    const [editingField, setEditingField] = useState<string | null>(null);
    const [linkDialogOpen, setLinkDialogOpen] = useState(false);

    // Lazy-fetch children only when expanded
    const {
        data: children = [],
        isLoading: childrenLoading,
    } = useQuery({
        queryKey: deptTypeChildrenQK(type.id),
        queryFn: () => fetchChildrenByParent(type.id),
        enabled: expanded,
        staleTime: 2 * 60 * 1000,
    });

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
                {/* Expand toggle */}
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

            {/* ── Children (when expanded) ────────────────────────────────── */}
            <Collapse in={expanded} timeout="auto" unmountOnExit>
                {childrenLoading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 1, pl: `${indentPx + 40}px` }}>
                        <CircularProgress size={18} />
                    </Box>
                )}

                {!childrenLoading && children.length === 0 && (
                    <Box sx={{ pl: `${indentPx + 52}px`, py: 0.75 }}>
                        <Typography variant="caption" color="text.disabled">
                            {getString('noChildTypes') || 'No child types linked'}
                        </Typography>
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
                            onDeleteLink={onDeleteLink}
                            getString={getString}
                        />
                    ))}
            </Collapse>

            {/* ── Add link dialog ─────────────────────────────────────────── */}
            <DepartmentTypeLinkDialog
                open={linkDialogOpen}
                parentType={type}
                allTypes={allTypes}
                existingChildren={children}
                createLinkMutation={createLinkMutation}
                onClose={() => setLinkDialogOpen(false)}
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
    onDeleteLink: (linkId: number, parentId: number) => void;
    getString: (key: string) => string;
}

function ChildLinkRow({
                          child,
                          parentId,
                          indentPx,
                          deleteLinkIsPending,
                          onDeleteLink,
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

            {/* link_id badge */}
            <Typography
                variant="caption"
                sx={{ color: 'text.disabled', fontFamily: 'monospace' }}
            >
                link #{child.link_id}
            </Typography>

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