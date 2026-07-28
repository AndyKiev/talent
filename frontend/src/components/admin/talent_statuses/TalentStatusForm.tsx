// src/components/admin/talent-statuses/TalentStatusForm.tsx
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
import type { TalentStatusCreate, MutationResponse, TalentStatus } from './talentStatusApi';
// import useString from '../../../hooks/useString';


import str from "../../../strings/str.ts";
import useString from "../../../hooks/useString.ts";
import cfl from "../../../utils/helpers.ts";
import { CrudFormActions } from '../../ui/CrudFormActions';

const schema = z.object({
  key: z.string().min(1, 'keyRequired').max(8, 'keyTooLong'),
  name: z.string().min(1, 'nameRequired').max(32, 'nameTooLong'),
  description: z.string().max(64, 'descriptionTooLong').optional().or(z.literal('')),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  createMutation: UseMutationResult<MutationResponse<TalentStatus>, Error, TalentStatusCreate>;
}

export function TalentStatusForm({ open, onClose, createMutation }: Props) {
  const getString = useString({ str });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { key: '', name: '', description: '', is_active: true },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = (data: FormData) => {
    createMutation.mutate({
      key: data.key,
      name: data.name,
      description: data.description || null,
      is_active: data.is_active,
    });
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{cfl(getString('createTalentStatus')) || 'Create Talent Status'}</DialogTitle>
      <DialogContent>
        <Box
          sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}
        >
          {createMutation.isError && (
            <Alert severity="error">{createMutation.error?.message}</Alert>
          )}

          <FormTextField
            label={cfl(getString('key')) || 'Key'}
            getString={getString}
            maxLength={8}
            fieldError={errors.key}
            {...register('key')}
          />

          <FormTextField
            label={cfl(getString('name')) || 'Name'}
            getString={getString}
            maxLength={32}
            fieldError={errors.name}
            {...register('name')}
          />

          <FormTextField
            label={cfl(getString('description')) || 'Description'}
            getString={getString}
            multiline
            minRows={2}
            maxLength={64}
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
