// src/components/admin/departments/DepartmentTree.tsx
import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Snackbar,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

import {
  fetchDepartmentTree,
  fetchRootDepartments,
  fetchDepartmentTypes,
  type DepartmentNode,
} from './departmentApi';
import {  useDepartmentMutations } from './useDepartmentMutations';
import { DepartmentTreeNode } from './DepartmentTreeNode';
import { DepartmentForm } from './DepartmentForm';
import { DepartmentDeleteDialog } from './DepartmentDeleteDialog';
import { DepartmentEditDialog, type PendingDepartmentEdit } from './DepartmentEditDialog';
import { DepartmentGenerateSubtreeDialog } from './DepartmentGenerateSubtreeDialog';
import { DepartmentRegionLinkDialog } from './DepartmentRegionLinkDialog';
import {
  fetchDepartmentRegionLinks,
  type DepartmentRegionLink,
} from './departmentRegionLinkApi';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';
import {fetchDepartmentCategories} from "../department_categories/departmentCategoryApi.ts";
import {
  DEPARTMENT_ROOTS_QK,
  DEPARTMENT_TREE_QK,
  DEPARTMENT_REGION_LINK_QK,
} from "../../../utils/queryKeys.ts";

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

  const regionByDept = new Map<number, DepartmentRegionLink>(
    regionLinks.map((l) => [l.department_id, l]),
  );

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

        {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
        )}

        {!isLoading && error && (
            <Alert severity="error" sx={{ m: 2 }}>
              {(error as Error).message}
            </Alert>
        )}

        {!isLoading && !error && (
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              {tree.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      {getString('noDepartmentsYet') ||
                          'No departments yet. Add a root department to get started.'}
                    </Typography>
                  </Box>
              ) : (
                  <Box sx={{ py: 1 }}>
                    {tree.map((rootNode) => (
                        <DepartmentTreeNode
                            key={rootNode.id}
                            node={rootNode}
                            depth={0}
                            selectedId={selectedId}
                            allTypes={allTypes}
                            categories={categories}
                            parentTypeId={null}
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
        )}

        <DepartmentForm
            open={formOpen}
            onClose={() => { setFormOpen(false); setParentNode(null); }}
            parentNode={parentNode}
            createMutation={createMutation}
        />

        <DepartmentEditDialog
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