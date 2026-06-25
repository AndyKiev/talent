// src/components/admin/talent-statuses/TalentStatusEditDialog.tsx
//
// Shown when the user clicks ✓ inside an inline edit cell.
// Displays a summary of what is about to change and asks for confirmation.

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Divider,
} from '@mui/material';
import useString from '../../../hooks/useString';
import str from "../../../strings/str.ts";


export interface PendingEdit {
  id: number;
  /** Human-readable field label, e.g. "Key" */
  fieldLabel: string;
  /** The raw backend field name, e.g. "key" */
  field: string;
  /** Value the user typed */
  newValue: string | boolean;
  /** Original value before editing */
  oldValue: string | boolean;
}

interface Props {
  pending: PendingEdit | null;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function TalentStatusEditDialog({ pending, isPending, onConfirm, onCancel }: Props) {
  const getString = useString({ str });

  return (
    <Dialog open={!!pending} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{getString('confirmEdit') || 'Confirm Edit'}</DialogTitle>
      <DialogContent>
        {pending && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography variant="body2" color="text.secondary">
              {getString('youAreAboutToChange') || 'You are about to change:'}
            </Typography>
            <Divider />
            <Box>
              <Typography variant="caption" color="text.secondary">
                {pending.fieldLabel}
              </Typography>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    textDecoration: 'line-through',
                    color: 'text.disabled',
                    fontFamily: 'monospace',
                  }}
                >
                  {String(pending.oldValue) || '—'}
                </Typography>
                <Typography variant="body2" color="text.disabled">→</Typography>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  sx={{ fontFamily: 'monospace', color: 'primary.main' }}
                >
                  {String(pending.newValue)}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onCancel} disabled={isPending}>
          {getString('cancel') || 'Cancel'}
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={isPending}
          startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {getString('confirm') || 'Confirm'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
