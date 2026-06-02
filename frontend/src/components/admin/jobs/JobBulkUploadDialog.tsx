// src/components/admin/jobs/JobBulkUploadDialog.tsx
//
// Shows a summary after a bulk upload:
//   - N inserted  (green)
//   - M skipped by name  (amber)
//   - K skipped by description  (amber)
// with expandable lists for each bucket.

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Collapse,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useState } from 'react';
import type { JobBulkUploadResult } from './jobApi';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';

interface Props {
  result: JobBulkUploadResult | null;
  onClose: () => void;
}

function CollapseSection({
  label,
  color,
  items,
}: {
  label: string;
  color: 'success' | 'warning';
  items: string[];
}) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  return (
    <Box sx={{ mt: 1 }}>
      <Box
        sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setOpen((p) => !p)}
      >
        <Chip label={items.length} size="small" color={color} />
        <Typography variant="body2" sx={{ flex: 1 }}>
          {label}
        </Typography>
        <IconButton size="small">
          {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </Box>
      <Collapse in={open}>
        <List dense disablePadding sx={{ pl: 1, mt: 0.5 }}>
          {items.map((name) => (
            <ListItem key={name} disableGutters sx={{ py: 0 }}>
              <ListItemText
                primary={name}
                slotProps={{ primary: { variant: 'body2', color: 'text.secondary' } }}
              />
            </ListItem>
          ))}
        </List>
      </Collapse>
    </Box>
  );
}

export function JobBulkUploadDialog({ result, onClose }: Props) {
  const getString = useString({ str });

  return (
    <Dialog open={!!result} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {result && result.inserted_count > 0 ? (
          <CheckCircleOutlineIcon color="success" />
        ) : (
          <WarningAmberIcon color="warning" />
        )}
        {getString('bulkUploadResult') || 'Bulk Upload Result'}
      </DialogTitle>

      <DialogContent>
        {result && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {result.detail}
            </Typography>

            <Divider sx={{ my: 1 }} />

            <CollapseSection
              label={getString('jobsInserted') || 'Jobs inserted'}
              color="success"
              items={result.inserted.map((j) => j.name)}
            />

            <CollapseSection
              label={getString('skippedByName') || 'Skipped — name already exists'}
              color="warning"
              items={result.skipped_names}
            />

            <CollapseSection
              label={getString('skippedByDescription') || 'Skipped — description already exists'}
              color="warning"
              items={result.skipped_descriptions}
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button variant="contained" onClick={onClose}>
          {getString('close') || 'Close'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
