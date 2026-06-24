// src/components/employees/DepartmentInstanceTreeNode.tsx
//
// Read-only, *selectable* department tree node used inside the employee-create
// and employee-event flows. Mirrors the look of the admin DepartmentTreeNode
// but strips all edit / add / delete actions — clicking a row selects that exact
// department instance (top-level or any descendant).
//
// Nodes render COLLAPSED by default; expand a node via its caret to drill down.

import { useState } from 'react';
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

export function DepartmentInstanceTreeNode({ node, depth, selectedId, onSelect }: Props) {
    // Collapsed by default — the user expands nodes to drill into the subtree.
    const [expanded, setExpanded] = useState(false);

    const hasChildren = node.children.length > 0;
    const isSelected = selectedId === node.id;
    const indentPx = depth * 20;

    return (
        <Box>
            {/* Row */}
            <Box
                onClick={() => onSelect(node)}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
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
                <Box sx={{ width: 24, flexShrink: 0 }}>
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
                    <AccountTreeIcon sx={{ fontSize: 14, color: 'text.disabled', mr: 0.5 }} />
                )}

                {/* Name (single line — no wrapping/squeezing; tooltip shows full) */}
                <Tooltip title={node.name} placement="top-start">
                    <Typography
                        variant="body2"
                        sx={{
                            flex: 1,
                            minWidth: 0,
                            fontWeight: isSelected ? 600 : 400,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {node.name}
                    </Typography>
                </Tooltip>

                {/* Type chip */}
                <Chip
                    label={node.department_type?.name ?? `#${node.department_type_id}`}
                    size="small"
                    sx={{
                        height: 20,
                        fontSize: '0.7rem',
                        bgcolor: 'info.light',
                        color: 'info.contrastText',
                        '& .MuiChip-label': { px: 1 },
                    }}
                />

                {/* ID */}
                <Typography
                    variant="caption"
                    sx={{
                        color: 'text.disabled',
                        fontFamily: 'monospace',
                        minWidth: 40,
                        textAlign: 'right',
                    }}
                >
                    #{node.id}
                </Typography>

                {/* Selected tick */}
                <Box sx={{ width: 20, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
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
