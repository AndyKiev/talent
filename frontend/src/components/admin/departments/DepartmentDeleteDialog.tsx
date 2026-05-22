// src/components/admin/departments/DepartmentDeleteDialog.tsx
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import type { DepartmentNode } from './departmentApi';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
// import cfl from '../../../utils/capitalizeFirstLetter';

interface Props {
  node: DepartmentNode | null;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DepartmentDeleteDialog({ node, isPending, onConfirm, onCancel }: Props) {
  const getString = useString({ str });
  const hasChildren = (node?.children?.length ?? 0) > 0;

  return (
    <Dialog open={!!node} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{getString('deleteDepartment') || 'Delete Department'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="body2">
          {getString('areYouSureDeleteDepartment') ||
            `Are you sure you want to delete "${node?.name}"? This action cannot be undone.`}
        </Typography>
        {hasChildren && (
          <Alert severity="warning">
            {getString('departmentHasChildren') ||
              `This department has ${node!.children.length} child department(s). You must remove or reassign them first.`}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onCancel} disabled={isPending}>
          {getString('cancel') || 'Cancel'}
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={onConfirm}
          disabled={isPending || hasChildren}
          startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {getString('delete') || 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
