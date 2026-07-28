// src/components/admin/job_group_types/JobGroupTypeForm.tsx
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
import { FormSwitch } from '../../ui/FormSwitch';
import { FormTextField } from '../../ui/FormTextField';
import type { UseMutationResult } from '@tanstack/react-query';
import type { JobGroupTypeCreate, MutationResponse, JobGroupType } from './jobGroupTypeApi';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';
import { CrudFormActions } from '../../ui/CrudFormActions';

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
    control,
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

          <FormTextField
            label={cfl(getString('name')) || 'Name'}
            getString={getString}
            maxLength={128}
            fieldError={errors.name}
            {...register('name')}
          />

          <FormTextField
            label={cfl(getString('key')) || 'Key'}
            getString={getString}
            maxLength={64}
            fieldError={errors.key}
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
            name="allow_multiple"
            control={control}
            label={cfl(getString('allowMultiple')) || 'Allow Multiple Groups per Job'}
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
