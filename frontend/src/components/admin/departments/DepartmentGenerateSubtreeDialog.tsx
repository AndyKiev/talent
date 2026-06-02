// src/components/admin/departments/DepartmentGenerateSubtreeDialog.tsx
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Box,
} from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import type { DepartmentNode } from './departmentApi';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';

interface Props {
  node: DepartmentNode | null;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DepartmentGenerateSubtreeDialog({ node, isPending, onConfirm, onCancel }: Props) {
  const getString = useString({ str });

  return (
    <Dialog open={!!node} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AccountTreeIcon color="primary" fontSize="small" />
        {getString('generateSubtree') || 'Generate Subtree'}
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="body2">
          {getString('generateSubtreeConfirm', { name: node?.name ?? '' }) ||
            `This will recursively create all missing department instances under "${node?.name}", following the department type hierarchy.`}
        </Typography>

        <Alert severity="warning">
          {getString('generateSubtreeWarning') ||
            'This is a mass change. New departments are created for every child type that does not yet exist, down to the leaves. Existing departments are left untouched.'}
        </Alert>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {getString('generateSubtreeNote') ||
              'New department names come from their department type. Category is set automatically from this department’s category — adjust manually afterward where needed.'}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onCancel} disabled={isPending}>
          {getString('cancel') || 'Cancel'}
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={isPending}
          startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : <AccountTreeIcon />}
        >
          {getString('generate') || 'Generate'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
