// src/components/employees/talent_audit/DepartmentTypeSelectTree.tsx
import { useMemo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AccountTreeIcon from '@mui/icons-material/AccountTree';

import {
  fetchDepartmentTypes,
  type DepartmentType,
} from '../../admin/department_types/departmentTypeApi';
import { fetchParentalLinks } from '../../admin/department_types/departmentTypeParentalLinkApi';
import { fetchDepartmentTypeJobLinks } from '../../admin/department_types/departmentTypeJobLinkApi';
import {
  DEPARTMENT_TYPE_QK,
  DEPT_TYPE_JOB_LINK_QK,
} from '../../../utils/queryKeys';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';

const PARENTAL_LINKS_QK = ['department_type_parental_links', 'active'] as const;

interface Props {
  /** Currently selected department_type id (controlled). */
  selectedTypeId: number | null;
  /** Fired when the user clicks a type row. */
  onSelect: (typeId: number, typeName: string) => void;
}

/** A node in the pruned tree. */
interface TreeNode {
  id: number;
  name: string;
  children: TreeNode[];
}

/**
 * Read-only, selectable tree of department types built from parental links.
 *
 * Pruning rules:
 *  - A type is shown only if it — or any of its descendants — has at least one
 *    active job link. Pure leaves with no jobs and branches whose whole subtree
 *    has no jobs are dropped.
 *  - The expand chevron appears only on types that actually have renderable
 *    children (so real leaves don't show a dead chevron).
 *
 * The whole tree is built up-front from three lightweight queries (types,
 * active parental links, active job links) — no per-row lazy loading.
 */
export function DepartmentTypeSelectTree({ selectedTypeId, onSelect }: Props) {
  const getString = useString({ str });

  const { data: allTypes = [], isLoading: typesLoading, error: typesError } = useQuery({
    queryKey: DEPARTMENT_TYPE_QK,
    queryFn: fetchDepartmentTypes,
    staleTime: 2 * 60 * 1000,
  });

  const { data: parentalLinks = [], isLoading: linksLoading, error: linksError } = useQuery({
    queryKey: PARENTAL_LINKS_QK,
    queryFn: () => fetchParentalLinks(true),
    staleTime: 2 * 60 * 1000,
  });

  const { data: jobLinks = [], isLoading: jobsLoading, error: jobsError } = useQuery({
    queryKey: [...DEPT_TYPE_JOB_LINK_QK, 'active'],
    queryFn: () => fetchDepartmentTypeJobLinks(true),
    staleTime: 2 * 60 * 1000,
  });

  const isLoading = typesLoading || linksLoading || jobsLoading;
  const error = typesError || linksError || jobsError;

  // ── Build the pruned tree ───────────────────────────────────────────────
  const roots = useMemo<TreeNode[]>(() => {
    if (allTypes.length === 0) return [];

    const typesById = new Map<number, DepartmentType>(allTypes.map((t) => [t.id, t]));

    const childrenOf = new Map<number, number[]>();
    const hasParent = new Set<number>();
    for (const link of parentalLinks) {
      if (!typesById.has(link.child_id) || !typesById.has(link.parent_id)) continue;
      const arr = childrenOf.get(link.parent_id) ?? [];
      arr.push(link.child_id);
      childrenOf.set(link.parent_id, arr);
      hasParent.add(link.child_id);
    }

    const typeIdsWithJobs = new Set<number>(jobLinks.map((l) => l.department_type_id));

    // subtreeHasJobs(id): this type or any descendant has an active job link.
    const memo = new Map<number, boolean>();
    const subtreeHasJobs = (id: number, seen: Set<number>): boolean => {
      if (memo.has(id)) return memo.get(id)!;
      if (seen.has(id)) return false; // cycle guard
      seen.add(id);
      let result = typeIdsWithJobs.has(id);
      if (!result) {
        for (const childId of childrenOf.get(id) ?? []) {
          if (subtreeHasJobs(childId, seen)) {
            result = true;
            break;
          }
        }
      }
      seen.delete(id);
      memo.set(id, result);
      return result;
    };

    const build = (id: number, seen: Set<number>): TreeNode | null => {
      if (seen.has(id)) return null; // cycle guard
      if (!subtreeHasJobs(id, new Set())) return null;
      seen.add(id);
      const children: TreeNode[] = [];
      for (const childId of childrenOf.get(id) ?? []) {
        const node = build(childId, seen);
        if (node) children.push(node);
      }
      seen.delete(id);
      const t = typesById.get(id)!;
      children.sort((a, b) => a.name.localeCompare(b.name));
      return { id, name: t.name, children };
    };

    const rootIds = allTypes.map((t) => t.id).filter((id) => !hasParent.has(id));
    const built = rootIds
      .map((id) => build(id, new Set()))
      .filter((n): n is TreeNode => n !== null);
    built.sort((a, b) => a.name.localeCompare(b.name));
    return built;
  }, [allTypes, parentalLinks, jobLinks]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography variant="body2" color="error" sx={{ py: 2 }}>
        {getString('loadFailed') || 'Failed to load data.'}
      </Typography>
    );
  }

  if (roots.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
        {getString('noDepartmentTypesWithJobs') ||
          'No department types with linked jobs.'}
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        maxHeight: 300,
        overflow: 'auto',
        py: 0.5,
      }}
    >
      {roots.map((node) => (
        <DepartmentTypeSelectRow
          key={node.id}
          node={node}
          depth={0}
          selectedTypeId={selectedTypeId}
          onSelect={onSelect}
        />
      ))}
    </Box>
  );
}

// ── Recursive row ───────────────────────────────────────────────────────────

interface RowProps {
  node: TreeNode;
  depth: number;
  selectedTypeId: number | null;
  onSelect: (typeId: number, typeName: string) => void;
}

function DepartmentTypeSelectRow({ node, depth, selectedTypeId, onSelect }: RowProps) {
  const getString = useString({ str });
  const [expanded, setExpanded] = useState(depth === 0);

  const indentPx = depth * 20;
  const isSelected = selectedTypeId === node.id;
  const hasChildren = node.children.length > 0;

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded((p) => !p);
  }, []);

  return (
    <Box>
      <Box
        onClick={() => onSelect(node.id, node.name)}
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
          borderLeft: isSelected ? '3px solid' : '3px solid transparent',
          borderLeftColor: isSelected ? 'primary.main' : 'transparent',
          bgcolor: isSelected ? 'action.selected' : 'transparent',
          '&:hover': { bgcolor: 'action.hover' },
          transition: 'background-color 0.15s, border-color 0.15s',
        }}
      >
        {/* Expand / collapse — only for real branches; leaves get an aligned spacer */}
        {hasChildren ? (
          <IconButton size="small" onClick={handleToggle} sx={{ p: 0.25 }}>
            {expanded ? (
              <ExpandMoreIcon sx={{ fontSize: 18 }} />
            ) : (
              <ChevronRightIcon sx={{ fontSize: 18 }} />
            )}
          </IconButton>
        ) : (
          <Box sx={{ width: 28, flexShrink: 0 }} />
        )}

        <AccountTreeIcon sx={{ fontSize: 14, color: 'text.disabled' }} />

        <Typography variant="body2" sx={{ flex: 1, fontWeight: isSelected ? 600 : 400 }}>
          {node.name}
        </Typography>

        {isSelected && (
          <Chip
            label={getString('selected') || 'Selected'}
            size="small"
            color="primary"
            sx={{ height: 20, fontSize: '0.7rem' }}
          />
        )}

        <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: 'monospace' }}>
          #{node.id}
        </Typography>
      </Box>

      {hasChildren && (
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          {node.children.map((child) => (
            <DepartmentTypeSelectRow
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedTypeId={selectedTypeId}
              onSelect={onSelect}
            />
          ))}
        </Collapse>
      )}
    </Box>
  );
}
