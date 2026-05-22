// src/components/admin/jobs/JobForm.tsx
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
import type { JobCreate, MutationResponse, Job } from './jobApi';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/capitalizeFirstLetter';

const schema = z.object({
  name: z.string().min(1, 'nameRequired').max(128, 'nameTooLong'),
  description: z.string().max(256, 'descriptionTooLong').optional().or(z.literal('')),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  createMutation: UseMutationResult<MutationResponse<Job>, Error, JobCreate>;
}

export function JobForm({ open, onClose, createMutation }: Props) {
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
    defaultValues: { name: '', description: '', is_active: true },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = (data: FormData) => {
    createMutation.mutate({
      name: data.name,
      description: data.description || null,
      is_active: data.is_active,
    });
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{cfl(getString('createJob')) || 'Create Job'}</DialogTitle>
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
            helperText={
              errors.name?.message &&
              (getString(errors.name.message) || errors.name.message)
            }
            {...register('name')}
          />

          <TextField
            label={cfl(getString('description')) || 'Description'}
            fullWidth
            multiline
            minRows={2}
            slotProps={{ htmlInput: { maxLength: 256 } }}
            error={!!errors.description}
            helperText={
              errors.description?.message &&
              (getString(errors.description.message) || errors.description.message)
            }
            {...register('description')}
          />

          <FormControlLabel
            control={
              <Switch
                checked={watch('is_active')}
                onChange={(_, checked) => setValue('is_active', checked)}
              />
            }
            label={cfl(getString('isActive')) || 'Active'}
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
          startIcon={
            createMutation.isPending ? (
              <CircularProgress size={16} color="inherit" />
            ) : undefined
          }
        >
          {getString('create') || 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
