// src/components/admin/job_groups/JobGroupTypeSelectDialog.tsx
//
// Opened when the user clicks the Type chip on a JobGroup row.
// Shows all available JobGroupTypes as a radio-style list; confirms via PATCH.

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  Alert,
  Box,
  Divider,
  Chip,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { fetchJobGroupTypes } from '../job_group_types/jobGroupTypeApi';
import type { JobGroup } from './jobGroupApi';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';
import {JOB_GROUP_TYPE_QK} from "../../../utils/queryKeys.ts";

interface Props {
  group: JobGroup | null;
  isPending: boolean;
  onConfirm: (groupId: number, newTypeId: number) => void;
  onCancel: () => void;
}

export function JobGroupTypeSelectDialog({ group, isPending, onConfirm, onCancel }: Props) {
  const getString = useString({ str });

  const { data: types = [], isLoading, error } = useQuery({
    queryKey: JOB_GROUP_TYPE_QK,
    queryFn: fetchJobGroupTypes,
    staleTime: 5 * 60 * 1000,
    enabled: !!group,
  });

  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);

  useEffect(() => {
    if (group) setSelectedTypeId(group.job_group_type_id);
  }, [group]);

  const currentTypeName =
    types.find((t) => t.id === group?.job_group_type_id)?.name ?? '…';

  const handleConfirm = () => {
    if (!group || selectedTypeId === null) return;
    onConfirm(group.id, selectedTypeId);
  };

  const isDirty = selectedTypeId !== group?.job_group_type_id;

  return (
    <Dialog open={!!group} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>
        {cfl(getString('changeGroupType')) || 'Change Group Type'}
        {group && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {group.name}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 1 }}>{(error as Error).message}</Alert>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
          {getString('currentType') || 'Current type:'} <strong>{currentTypeName}</strong>
        </Typography>

        <Divider sx={{ mb: 1 }} />

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <List dense disablePadding>
            {types.map((t) => (
              <ListItemButton
                key={t.id}
                selected={selectedTypeId === t.id}
                onClick={() => setSelectedTypeId(t.id)}
                disabled={isPending}
                sx={{ borderRadius: 1, mb: 0.25 }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {t.name}
                      {!t.allow_multiple && (
                        <Chip label="singleton" size="small" color="warning" variant="outlined" />
                      )}
                    </Box>
                  }
                  secondary={t.description ?? undefined}
                  slotProps={{ secondary: { variant: 'caption' } }}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>

      <DialogActions>
        <Button variant="outlined" onClick={onCancel} disabled={isPending}>
          {getString('cancel') || 'Cancel'}
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={isPending || isLoading || !isDirty}
          startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {getString('confirm') || 'Confirm'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
