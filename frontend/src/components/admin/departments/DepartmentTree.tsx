// src/components/admin/departments/DepartmentTree.tsx
import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  InputAdornment,
  MenuItem,
  Paper,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SearchIcon from '@mui/icons-material/Search';

import {
  fetchDepartmentTree,
  fetchRootDepartments,
  fetchDepartmentTypes,
  fetchDepartmentTypeChildMap,
  type DepartmentNode,
} from './departmentApi';
import {  useDepartmentMutations } from './useDepartmentMutations';
import { DepartmentTreeNode } from './DepartmentTreeNode';
import { DepartmentForm } from './DepartmentForm';
import { DepartmentDeleteDialog } from './DepartmentDeleteDialog';
import { FieldEditConfirmDialog } from '../../ui/FieldEditConfirmDialog';
import { DepartmentGenerateSubtreeDialog } from './DepartmentGenerateSubtreeDialog';
import { DepartmentRegionLinkDialog } from './DepartmentRegionLinkDialog';
import {
  fetchDepartmentRegionLinks,
  type DepartmentRegionLink,
} from './departmentRegionLinkApi';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';
import { AsyncContent } from '../../ui/AsyncContent';
import {fetchDepartmentCategories} from "../department_categories/departmentCategoryApi.ts";
import {
  DEPARTMENT_ROOTS_QK,
  DEPARTMENT_TREE_QK,
  DEPARTMENT_REGION_LINK_QK,
  DEPARTMENT_TYPE_CHILD_MAP_QK,
} from "../../../utils/queryKeys.ts";

export interface PendingDepartmentEdit {
  id: number;
  fieldLabel: string;
  field: string;
  rawValue: string | boolean | number;   // ← what gets sent to the API
  newValue: string | boolean | number;   // ← display label only
  oldValue: string | boolean | number;   // ← display label only
}

interface Props {
  selectedId?: number | null;
}



export function DepartmentTree({ selectedId = null }: Props) {
  const getString = useString({ str });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  // ── Search / filter (name text + type select + category select, AND-ed) ──
  const [searchName, setSearchName] = useState('');
  const [filterTypeId, setFilterTypeId] = useState<number | ''>('');
  const [filterCategoryId, setFilterCategoryId] = useState<number | ''>('');

  const [formOpen, setFormOpen] = useState(false);
  const [parentNode, setParentNode] = useState<DepartmentNode | null>(null);
  const [pendingEdit, setPendingEdit] = useState<PendingDepartmentEdit | null>(null);
  const [nodeToDelete, setNodeToDelete] = useState<DepartmentNode | null>(null);
  const [nodeToGenerate, setNodeToGenerate] = useState<DepartmentNode | null>(null);
  const [nodeForRegion, setNodeForRegion] = useState<DepartmentNode | null>(null);

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: tree = [], isLoading, error } = useQuery({
    queryKey: DEPARTMENT_TREE_QK,
    queryFn: fetchDepartmentTree,
    staleTime: 2 * 60 * 1000,
  });

  // Drives "Add Root" button visibility — invalidated alongside the tree
  const { data: roots = [], isLoading: rootsLoading } = useQuery({
    queryKey: DEPARTMENT_ROOTS_QK,
    queryFn: fetchRootDepartments,
    staleTime: 2 * 60 * 1000,
  });

  const { data: allTypes = [] } = useQuery({
    queryKey: ['department_types'],
    queryFn: fetchDepartmentTypes,
    staleTime: 5 * 60 * 1000,
  });

  // One request for the whole parent-type → child-types map: every tree node
  // resolves its allowed types from this instead of its own API call.
  const { data: typeChildMap = {} } = useQuery({
    queryKey: DEPARTMENT_TYPE_CHILD_MAP_QK,
    queryFn: fetchDepartmentTypeChildMap,
    staleTime: 5 * 60 * 1000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['department_categories'],
    queryFn: () => fetchDepartmentCategories(),
    staleTime: 5 * 60 * 1000,
  });

  // Region links across all departments → map by department_id for tree display.
  const { data: regionLinks = [] } = useQuery({
    queryKey: DEPARTMENT_REGION_LINK_QK,
    queryFn: () => fetchDepartmentRegionLinks(),
    staleTime: 2 * 60 * 1000,
  });

  // Memoized so DepartmentTreeNode (React.memo) doesn't re-render on every
  // parent render from a fresh Map identity.
  const regionByDept = useMemo(
    () =>
      new Map<number, DepartmentRegionLink>(
        regionLinks.map((l) => [l.department_id, l]),
      ),
    [regionLinks],
  );

  // ── Tree filtering ────────────────────────────────────────────────────────
  // A node is kept when it matches ALL active filters (its whole subtree stays
  // visible), or when a descendant matches (the node stays as context).
  const filterActive =
    searchName.trim() !== '' || filterTypeId !== '' || filterCategoryId !== '';

  const visibleTree = useMemo(() => {
    if (!filterActive) return tree;
    const q = searchName.trim().toLowerCase();
    const prune = (node: DepartmentNode): DepartmentNode | null => {
      const selfMatch =
        (!q || node.name.toLowerCase().includes(q)) &&
        (filterTypeId === '' || node.department_type_id === filterTypeId) &&
        (filterCategoryId === '' || node.department_category_id === filterCategoryId);
      if (selfMatch) return node; // keep the whole subtree
      const kids = node.children
        .map(prune)
        .filter((c): c is DepartmentNode => c !== null);
      if (kids.length > 0) return { ...node, children: kids };
      return null;
    };
    return tree
      .map(prune)
      .filter((c): c is DepartmentNode => c !== null);
  }, [tree, filterActive, searchName, filterTypeId, filterCategoryId]);

  // ── Mutations ─────────────────────────────────────────────────────────────

  const { createMutation, updateMutation, deleteMutation, generateSubtreeMutation } =
    useDepartmentMutations({
      setSnackbar,
      onCreateSuccess: () => {
        setFormOpen(false);
        setParentNode(null);
      },
      onUpdateSuccess: () => setPendingEdit(null),
      onDeleteSuccess: () => setNodeToDelete(null),
      onDeleteError: () => setNodeToDelete(null),
      onGenerateSuccess: () => setNodeToGenerate(null),
      onGenerateError: () => setNodeToGenerate(null),
    });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAddChild = useCallback((node: DepartmentNode) => {
    setParentNode(node);
    setFormOpen(true);
  }, []);

  const handleAddRoot = useCallback(() => {
    setParentNode(null);
    setFormOpen(true);
  }, []);

  const handlePendingEdit = useCallback((edit: PendingDepartmentEdit) => {
    setPendingEdit(edit);
  }, []);

  const handleConfirmEdit = useCallback(() => {
    if (!pendingEdit) return;
    updateMutation.mutate({
      id: pendingEdit.id,
      data: { [pendingEdit.field]: pendingEdit.rawValue },
    });
  }, [pendingEdit, updateMutation]);

  const handleConfirmDelete = useCallback(() => {
    if (!nodeToDelete) return;
    deleteMutation.mutate(nodeToDelete.id);
  }, [nodeToDelete, deleteMutation]);

  const handleConfirmGenerate = useCallback(() => {
    if (!nodeToGenerate) return;
    generateSubtreeMutation.mutate(nodeToGenerate.id);
  }, [nodeToGenerate, generateSubtreeMutation]);

  const rootExists = !rootsLoading && roots.length > 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
      <Box>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <AccountTreeIcon color="action" />
          <Typography variant="h6" fontWeight={600} sx={{ flex: 1 }}>
            {cfl(getString('organizationStructure') || 'Organization Structure')}
          </Typography>

          {rootExists ? (
              <Tooltip
                  title={
                      getString('rootDepartmentAlreadyExists') ||
                      'A root department already exists. Use the + button on a node to add children.'
                  }
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.disabled' }}>
                  <InfoOutlinedIcon fontSize="small" />
                  <Typography variant="caption">
                    {getString('rootDepartmentAlreadyExists') || 'Root department already exists'}
                  </Typography>
                </Box>
              </Tooltip>
          ) : (
              <Button
                  variant="contained"
                  size="medium"
                  startIcon={<AddIcon />}
                  onClick={handleAddRoot}
                  disabled={rootsLoading}
              >
                {cfl(getString('addRootDepartment') || 'Add Root')}
              </Button>
          )}
        </Box>

        {/* ── Search / filter bar ─────────────────────────────────────────── */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
          <TextField
              size="small"
              variant="outlined"
              label={getString('searchDepartmentName') || 'Department name'}
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              sx={{ flex: 1.4 }}
              slotProps={{
                input: {
                  startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                  ),
                },
              }}
          />
          <TextField
              select
              size="small"
              variant="outlined"
              label={getString('departmentType') || 'Department Type'}
              value={filterTypeId}
              onChange={(e) => setFilterTypeId(e.target.value === '' ? '' : Number(e.target.value))}
              sx={{ flex: 1 }}
          >
            <MenuItem value="">{getString('allDepartmentTypes') || 'All types'}</MenuItem>
            {allTypes.map((t) => (
                <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
            ))}
          </TextField>
          <TextField
              select
              size="small"
              variant="outlined"
              label={getString('departmentCategory') || 'Department Category'}
              value={filterCategoryId}
              onChange={(e) => setFilterCategoryId(e.target.value === '' ? '' : Number(e.target.value))}
              sx={{ flex: 1 }}
          >
            <MenuItem value="">{getString('allDepartmentCategories') || 'All categories'}</MenuItem>
            {categories.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </TextField>
        </Box>

        <AsyncContent isLoading={isLoading} error={error}>
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              {visibleTree.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      {getString('noDepartmentsYet') ||
                          'No departments yet. Add a root department to get started.'}
                    </Typography>
                  </Box>
              ) : (
                  <Box sx={{ py: 1 }}>
                    {visibleTree.map((rootNode) => (
                        <DepartmentTreeNode
                            key={rootNode.id}
                            node={rootNode}
                            depth={0}
                            selectedId={selectedId}
                            allTypes={allTypes}
                            typeChildMap={typeChildMap}
                            categories={categories}
                            parentTypeId={null}
                            forceExpand={filterActive}
                            regionByDept={regionByDept}
                            updateIsPending={updateMutation.isPending}
                            deleteIsPending={deleteMutation.isPending}
                            generateIsPending={generateSubtreeMutation.isPending}
                            onAddChild={handleAddChild}
                            onDeleteClick={setNodeToDelete}
                            onGenerateSubtree={setNodeToGenerate}
                            onPendingEdit={handlePendingEdit}
                            onRegionClick={setNodeForRegion}
                        />
                    ))}
                  </Box>
              )}
            </Paper>
        </AsyncContent>

        <DepartmentForm
            open={formOpen}
            onClose={() => { setFormOpen(false); setParentNode(null); }}
            parentNode={parentNode}
            createMutation={createMutation}
        />

        <FieldEditConfirmDialog
            pending={pendingEdit}
            isPending={updateMutation.isPending}
            onConfirm={handleConfirmEdit}
            onCancel={() => setPendingEdit(null)}
        />

        <DepartmentDeleteDialog
            node={nodeToDelete}
            isPending={deleteMutation.isPending}
            onConfirm={handleConfirmDelete}
            onCancel={() => setNodeToDelete(null)}
        />

        <DepartmentGenerateSubtreeDialog
            node={nodeToGenerate}
            isPending={generateSubtreeMutation.isPending}
            onConfirm={handleConfirmGenerate}
            onCancel={() => setNodeToGenerate(null)}
        />

        <DepartmentRegionLinkDialog
            node={nodeForRegion}
            currentLink={nodeForRegion ? regionByDept.get(nodeForRegion.id) ?? null : null}
            onClose={() => setNodeForRegion(null)}
            setSnackbar={setSnackbar}
        />

        <Snackbar
            open={snackbar.open}
            autoHideDuration={6000}
            onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
              severity={snackbar.severity}
              onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
              sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
  );
}