// src/components/admin/jobs/JobForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Alert,
} from '@mui/material';
import type { UseMutationResult } from '@tanstack/react-query';
import type { JobCreate, MutationResponse, Job } from './jobApi';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';
import { FormSwitch } from '../../ui/FormSwitch';
import { FormTextField } from '../../ui/FormTextField';
import { CrudFormActions } from '../../ui/CrudFormActions';

const schema = z.object({
  name: z.string().min(1, 'nameRequired').max(128, 'nameTooLong'),
  short_name: z.string().max(64, 'shortNameTooLong').optional().or(z.literal('')),
  key: z.string().max(64, 'keyTooLong').optional().or(z.literal('')),
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
    control,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', short_name: '', key: '', description: '', is_active: true },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = (data: FormData) => {
    createMutation.mutate({
      name: data.name,
      short_name: data.short_name || null,
      key: data.key || null,
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

          <FormTextField
            label={cfl(getString('name')) || 'Name'}
            getString={getString}
            maxLength={128}
            fieldError={errors.name}
            {...register('name')}
          />

          <FormTextField
            label={cfl(getString('shortName')) || 'Short Name'}
            getString={getString}
            maxLength={64}
            fieldError={errors.short_name}
            hint={getString('shortNameHint') || 'Optional abbreviation (max 64 chars)'}
            {...register('short_name')}
          />

          <FormTextField
            label={cfl(getString('key')) || 'Key'}
            getString={getString}
            maxLength={64}
            fieldError={errors.key}
            hint={getString('keyHint') || 'Optional identifier key (max 64 chars)'}
            {...register('key')}
          />

          <FormTextField
            label={cfl(getString('description')) || 'Description'}
            getString={getString}
            multiline
            minRows={2}
            maxLength={256}
            fieldError={errors.description}
            {...register('description')}
          />

          <FormSwitch
            name="is_active"
            control={control}
            label={cfl(getString('isActive')) || 'Active'}
          />
        </Box>
      </DialogContent>
      <CrudFormActions
        getString={getString}
        onCancel={handleClose}
        onSubmit={handleSubmit(onSubmit)}
        isPending={createMutation.isPending}
      />
    </Dialog>
  );
}
