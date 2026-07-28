// src/components/admin/departments/DepartmentDeleteDialog.tsx
import {
  Alert,
} from '@mui/material';
import type { DepartmentNode } from './departmentApi';
import useString from '../../../hooks/useString';
import ConfirmDeleteDialog from '../../ui/ConfirmDeleteDialog';
// import cfl from '../../../utils/capitalizeFirstLetter';

interface Props {
  node: DepartmentNode | null;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DepartmentDeleteDialog({ node, isPending, onConfirm, onCancel }: Props) {
  const getString = useString();
  const hasChildren = (node?.children?.length ?? 0) > 0;

  return (
    <ConfirmDeleteDialog
      open={!!node}
      title={getString('deleteDepartment') || 'Delete Department'}
      message={
        getString('areYouSureDeleteDepartment') ||
        `Are you sure you want to delete "${node?.name}"? This action cannot be undone.`
      }
      isDeleting={isPending}
      confirmDisabled={isPending || hasChildren}
      onConfirm={onConfirm}
      onClose={onCancel}
      children={
        hasChildren ? (
          <Alert severity="warning">
            {getString('departmentHasChildren') ||
              `This department has ${node!.children.length} child department(s). You must remove or reassign them first.`}
          </Alert>
        ) : undefined
      }
    />
  );
}
