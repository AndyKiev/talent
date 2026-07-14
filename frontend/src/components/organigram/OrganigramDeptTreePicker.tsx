// src/components/organigram/OrganigramDeptTreePicker.tsx
//
// Local copy of the selectable department subtree picker (original:
// components/employees/DepartmentTreePicker + DepartmentInstanceTreeNode) so
// the organigram folder stays standalone. Loads the FULL subtree of a top
// instance via GET /departments/{id} and lets the user click any node.
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Alert,
    Box,
    Chip,
    CircularProgress,
    Collapse,
    IconButton,
    Paper,
    Tooltip,
    Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
    fetchOrganigramDepartmentSubtree,
    type OrganigramDepartmentNode,
} from './organigramApi';

interface NodeProps {
    node: OrganigramDepartmentNode;
    depth: number;
    selectedId: number | null;
    onSelect: (node: OrganigramDepartmentNode) => void;
}

function subtreeContains(node: OrganigramDepartmentNode, id: number | null): boolean {
    if (id == null) return false;
    return node.children.some((c) => c.id === id || subtreeContains(c, id));
}

function TreeNode({ node, depth, selectedId, onSelect }: NodeProps) {
    // Collapsed by default; auto-expanded when the selection sits below
    // (adjust-during-render pattern — no effect needed).
    const hasSelectedDescendant = subtreeContains(node, selectedId);
    const [expanded, setExpanded] = useState(hasSelectedDescendant);
    const [prevHasSelected, setPrevHasSelected] = useState(hasSelectedDescendant);
    if (hasSelectedDescendant !== prevHasSelected) {
        setPrevHasSelected(hasSelectedDescendant);
        if (hasSelectedDescendant) setExpanded(true);
    }

    const hasChildren = node.children.length > 0;
    const isSelected = selectedId === node.id;
    const indentPx = depth * 20;

    const rowRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (isSelected) rowRef.current?.scrollIntoView({ block: 'nearest' });
    }, [isSelected]);

    return (
        <Box>
            <Box
                ref={rowRef}
                onClick={() => onSelect(node)}
                sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 0.5,
                    pl: `${indentPx + 8}px`,
                    pr: 1,
                    py: 0.5,
                    minHeight: 36,
                    cursor: 'pointer',
                    borderRadius: 1,
                    borderLeft: '3px solid',
                    borderLeftColor: isSelected ? 'primary.main' : 'transparent',
                    bgcolor: isSelected ? 'action.selected' : 'transparent',
                    '&:hover': { bgcolor: 'action.hover' },
                    transition: 'background-color 0.15s, border-color 0.15s',
                }}
            >
                <Box sx={{ width: 24, flexShrink: 0, mt: 0.25 }}>
                    {hasChildren && (
                        <IconButton
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                setExpanded((p) => !p);
                            }}
                            sx={{ p: 0.25 }}
                        >
                            {expanded ? (
                                <ExpandMoreIcon sx={{ fontSize: 18 }} />
                            ) : (
                                <ChevronRightIcon sx={{ fontSize: 18 }} />
                            )}
                        </IconButton>
                    )}
                </Box>

                {!hasChildren && (
                    <AccountTreeIcon
                        sx={{ fontSize: 14, color: 'text.disabled', mr: 0.5, mt: 0.5, flexShrink: 0 }}
                    />
                )}

                <Box
                    sx={{
                        flex: 1,
                        minWidth: 0,
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 0.5,
                        py: 0.25,
                    }}
                >
                    <Tooltip title={node.name} placement="top-start">
                        <Typography
                            variant="body2"
                            sx={{
                                flex: '0 1 auto',
                                minWidth: 0,
                                fontWeight: isSelected ? 600 : 400,
                                whiteSpace: 'normal',
                                overflowWrap: 'anywhere',
                            }}
                        >
                            {node.name}
                        </Typography>
                    </Tooltip>

                    <Chip
                        label={node.department_type?.name ?? `#${node.department_type_id}`}
                        size="small"
                        sx={{
                            height: 'auto',
                            flexShrink: 0,
                            maxWidth: '100%',
                            fontSize: '0.7rem',
                            bgcolor: 'info.light',
                            color: 'info.contrastText',
                            '& .MuiChip-label': {
                                px: 1,
                                py: 0.25,
                                whiteSpace: 'normal',
                                overflowWrap: 'anywhere',
                            },
                        }}
                    />
                </Box>

                <Box sx={{ width: 20, flexShrink: 0, mt: 0.25, display: 'flex', justifyContent: 'center' }}>
                    {isSelected && <CheckCircleIcon sx={{ fontSize: 18, color: 'primary.main' }} />}
                </Box>
            </Box>

            {hasChildren && (
                <Collapse in={expanded} timeout="auto" unmountOnExit>
                    {node.children.map((child) => (
                        <TreeNode
                            key={child.id}
                            node={child}
                            depth={depth + 1}
                            selectedId={selectedId}
                            onSelect={onSelect}
                        />
                    ))}
                </Collapse>
            )}
        </Box>
    );
}

interface Props {
    /** Id of the chosen top instance whose subtree we render. */
    rootId: number;
    selectedId: number | null;
    onSelect: (node: OrganigramDepartmentNode) => void;
    /** Max scroll height of the tree container (px). Defaults to 240. */
    maxHeight?: number;
}

export function OrganigramDeptTreePicker({ rootId, selectedId, onSelect, maxHeight = 240 }: Props) {
    const { data: root, isLoading, error } = useQuery({
        queryKey: ['department_subtree', rootId],
        queryFn: () => fetchOrganigramDepartmentSubtree(rootId),
        staleTime: 2 * 60 * 1000,
    });

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={24} />
            </Box>
        );
    }
    if (error) return <Alert severity="error">{(error as Error).message}</Alert>;
    if (!root) return null;

    return (
        <Paper
            variant="outlined"
            sx={{ borderRadius: 2, maxHeight, overflow: 'auto', py: 0.5 }}
        >
            <TreeNode node={root} depth={0} selectedId={selectedId} onSelect={onSelect} />
        </Paper>
    );
}
