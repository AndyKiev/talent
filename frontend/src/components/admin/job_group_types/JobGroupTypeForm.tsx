// src/components/admin/job_group_types/JobGroupTypeForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch,
} from '@mui/material';
import type { UseMutationResult } from '@tanstack/react-query';
import type { JobGroupTypeCreate, MutationResponse, JobGroupType } from './jobGroupTypeApi';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';

const schema = z.object({
  name: z.string().min(1, 'nameRequired').max(128, 'nameTooLong'),
  key: z.string().min(1, 'keyRequired').max(64, 'keyTooLong'),
  description: z.string().max(256, 'descriptionTooLong').optional().or(z.literal('')),
  allow_multiple: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  createMutation: UseMutationResult<MutationResponse<JobGroupType>, Error, JobGroupTypeCreate>;
}

export function JobGroupTypeForm({ open, onClose, createMutation }: Props) {
  const getString = useString({ str });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', key: '', description: '', allow_multiple: true },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = (data: FormData) => {
    createMutation.mutate({
      name: data.name,
      key: data.key,
      description: data.description || null,
      allow_multiple: data.allow_multiple,
    });
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{cfl(getString('createJobGroupType')) || 'Create Job Group Type'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {createMutation.isError && (
            <Alert severity="error">{createMutation.error?.message}</Alert>
          )}

          <TextField
            label={cfl(getString('name')) || 'Name'}
            fullWidth
            slotProps={{ htmlInput: { maxLength: 128 } }}
            error={!!errors.name}
            helperText={errors.name?.message && (getString(errors.name.message) || errors.name.message)}
            {...register('name')}
          />

          <TextField
            label={cfl(getString('key')) || 'Key'}
            fullWidth
            slotProps={{ htmlInput: { maxLength: 64 } }}
            error={!!errors.key}
            helperText={errors.key?.message && (getString(errors.key.message) || errors.key.message)}
            {...register('key')}
          />

          <TextField
            label={cfl(getString('description')) || 'Description'}
            fullWidth
            multiline
            minRows={2}
            slotProps={{ htmlInput: { maxLength: 256 } }}
            error={!!errors.description}
            helperText={errors.description?.message && (getString(errors.description.message) || errors.description.message)}
            {...register('description')}
          />

          <FormControlLabel
            control={
              <Switch
                checked={watch('allow_multiple')}
                onChange={(_, checked) => setValue('allow_multiple', checked)}
              />
            }
            label={cfl(getString('allowMultiple')) || 'Allow Multiple Groups per Job'}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={handleClose} disabled={createMutation.isPending}>
          {getString('cancel') || 'Cancel'}
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit(onSubmit)}
          disabled={createMutation.isPending}
          startIcon={createMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {getString('create') || 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
