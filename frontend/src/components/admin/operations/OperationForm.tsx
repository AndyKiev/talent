// src/components/admin/operations/OperationForm.tsx
import { useForm } from 'react-hook-form';
import { Box, Button, TextField } from '@mui/material';
import type { OperationCreate } from './operationApi';
import type { GetStringFn } from '../../../types/getStringFn';
import cfl from '../../../utils/helpers.ts';

interface Props {
  getString: GetStringFn;
  onSubmit: (data: OperationCreate) => void;
  isPending: boolean;
}

export function OperationForm({ getString, onSubmit, isPending }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OperationCreate>();

  return (
    <Box
      component="form"
      onSubmit={handleSubmit((d) => { onSubmit(d); reset(); })}
      sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}
    >
      <TextField
        size="small"
        label={cfl(getString('name')) || 'Name'}
        {...register('name', { required: true })}
        error={!!errors.name}
        sx={{ width: 200 }}
      />
      <TextField
        size="small"
        label={cfl(getString('description')) || 'Description'}
        {...register('description')}
        sx={{ width: 280 }}
      />
      <Button type="submit" variant="contained" size="small" disabled={isPending}>
        {cfl(getString('add')) || 'Add'}
      </Button>
    </Box>
  );
}
