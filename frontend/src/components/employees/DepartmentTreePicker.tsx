// src/components/employees/DepartmentTreePicker.tsx
//
// Loads the FULL subtree of a given top department instance (directorate /
// store / board …) via GET /departments/{id} (which returns the nested
// subtree) and lets the user click any node — the top instance itself or any
// descendant — to pick the exact department.
//
// Nodes render collapsed by default (see DepartmentInstanceTreeNode).
//
// Backend is reused as-is:
//   GET /departments/{id}  ->  DepartmentNode (with nested children)

import { useQuery } from '@tanstack/react-query';
import { Alert, Box, CircularProgress, Paper } from '@mui/material';
import { fetchDepartmentById, type DepartmentNode } from '../admin/departments/departmentApi';
import { DepartmentInstanceTreeNode } from './DepartmentInstanceTreeNode';

interface Props {
    /** Id of the chosen top instance whose subtree we render. */
    rootId: number;
    /** Currently selected department id (drives row highlight). */
    selectedId: number | null;
    onSelect: (node: DepartmentNode) => void;
    /** Max scroll height of the tree container (px). Defaults to 260. */
    maxHeight?: number;
}

export function DepartmentTreePicker({ rootId, selectedId, onSelect, maxHeight = 260 }: Props) {
    const {
        data: root,
        isLoading,
        error,
    } = useQuery({
        queryKey: ['department_subtree', rootId],
        queryFn: () => fetchDepartmentById(rootId),
        staleTime: 2 * 60 * 1000,
    });

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={24} />
            </Box>
        );
    }

    if (error) {
        return <Alert severity="error">{(error as Error).message}</Alert>;
    }

    if (!root) return null;

    return (
        <Paper
            variant="outlined"
            sx={{ borderRadius: 2, maxHeight, overflow: 'auto', py: 0.5 }}
        >
            <DepartmentInstanceTreeNode
                node={root}
                depth={0}
                selectedId={selectedId}
                onSelect={onSelect}
            />
        </Paper>
    );
}
