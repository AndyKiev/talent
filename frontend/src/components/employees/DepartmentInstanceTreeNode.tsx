// src/components/employees/DepartmentInstanceTreeNode.tsx
//
// Read-only, *selectable* department tree node used inside the employee-create
// and employee-event flows. Mirrors the look of the admin DepartmentTreeNode
// but strips all edit / add / delete actions — clicking a row selects that exact
// department instance (top-level or any descendant).
//
// Nodes render COLLAPSED by default; expand a node via its caret to drill down.
// Exception: a node whose subtree holds the current selection auto-expands, so
// a restored selection (e.g. browser Back onto a URL-driven page) is visible
// and highlighted without re-drilling.

import { useEffect, useRef, useState } from 'react';
import { Box, Chip, Collapse, IconButton, Tooltip, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { DepartmentNode } from '../admin/departments/departmentApi';

interface Props {
    node: DepartmentNode;
    depth: number;
    selectedId: number | null;
    onSelect: (node: DepartmentNode) => void;
}

function subtreeContains(node: DepartmentNode, id: number | null): boolean {
    if (id == null) return false;
    return node.children.some((c) => c.id === id || subtreeContains(c, id));
}

export function DepartmentInstanceTreeNode({ node, depth, selectedId, onSelect }: Props) {
    // Collapsed by default — the user expands nodes to drill into the subtree.
    // Auto-expanded when the selection sits somewhere below this node.
    const hasSelectedDescendant = subtreeContains(node, selectedId);
    const [expanded, setExpanded] = useState(hasSelectedDescendant);
    useEffect(() => {
        if (hasSelectedDescendant) setExpanded(true);
    }, [hasSelectedDescendant]);

    const hasChildren = node.children.length > 0;
    const isSelected = selectedId === node.id;
    const indentPx = depth * 20;

    // Bring a restored selection into view inside the scrollable tree box.
    const rowRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (isSelected) rowRef.current?.scrollIntoView({ block: 'nearest' });
    }, [isSelected]);

    return (
        <Box>
            {/* Row */}
            <Box
                ref={rowRef}
                onClick={() => onSelect(node)}
                sx={{
                    display: 'flex',
                    // flex-start so the caret / id / tick align to the FIRST text
                    // line when the name (or type chip) wraps onto extra lines.
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
                {/* Expand / collapse */}
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

                {/* Leaf marker */}
                {!hasChildren && (
                    <AccountTreeIcon
                        sx={{ fontSize: 14, color: 'text.disabled', mr: 0.5, mt: 0.5, flexShrink: 0 }}
                    />
                )}

                {/* Name + type chip. They share a line while they fit; the chip
                    drops to the next line once it would crowd the name, and the
                    name / chip label each wrap internally when very long. */}
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

                {/* ID */}
                <Typography
                    variant="caption"
                    sx={{
                        color: 'text.disabled',
                        fontFamily: 'monospace',
                        minWidth: 40,
                        flexShrink: 0,
                        mt: 0.5,
                        textAlign: 'right',
                    }}
                >
                    #{node.id}
                </Typography>

                {/* Selected tick */}
                <Box sx={{ width: 20, flexShrink: 0, mt: 0.25, display: 'flex', justifyContent: 'center' }}>
                    {isSelected && <CheckCircleIcon sx={{ fontSize: 18, color: 'primary.main' }} />}
                </Box>
            </Box>

            {/* Children */}
            {hasChildren && (
                <Collapse in={expanded} timeout="auto" unmountOnExit>
                    {node.children.map((child) => (
                        <DepartmentInstanceTreeNode
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
