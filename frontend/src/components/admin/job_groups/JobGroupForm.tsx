// src/components/admin/job_groups/JobGroupForm.tsx
import { useForm, Controller } from 'react-hook-form';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { fetchJobGroupTypes } from '../job_group_types/jobGroupTypeApi';
import type { JobGroupCreate, MutationResponse, JobGroup } from './jobGroupApi';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';
import {JOB_GROUP_TYPE_QK} from "../../../utils/queryKeys.ts";

const schema = z.object({
  name: z.string().min(2, 'nameTooShort').max(128, 'nameTooLong'),
  key: z.string().min(1, 'keyRequired').max(64, 'keyTooLong'),
  description: z.string().max(256, 'descriptionTooLong').optional().or(z.literal('')),
  job_group_type_id: z.number({ error: 'groupTypeRequired' }).min(1, 'groupTypeRequired'),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  createMutation: UseMutationResult<MutationResponse<JobGroup>, Error, JobGroupCreate>;
}

export function JobGroupForm({ open, onClose, createMutation }: Props) {
  const getString = useString({ str });

  const { data: groupTypes = [] } = useQuery({
    queryKey: JOB_GROUP_TYPE_QK,
    queryFn: fetchJobGroupTypes,
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', key: '', description: '', job_group_type_id: 0 },
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
      job_group_type_id: data.job_group_type_id,
    });
  };

  return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{cfl(getString('createJobGroup')) || 'Create Job Group'}</DialogTitle>
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

            <Controller
                name="job_group_type_id"
                control={control}
                render={({ field }) => (
                    <FormControl fullWidth error={!!errors.job_group_type_id}>
                      <InputLabel>{cfl(getString('groupType')) || 'Group Type'}</InputLabel>
                      <Select
                          {...field}
                          label={cfl(getString('groupType')) || 'Group Type'}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                      >
                        {groupTypes.map((t) => (
                            <MenuItem key={t.id} value={t.id}>
                              {t.name}
                              {!t.allow_multiple && (
                                  <Box component="span" sx={{ ml: 1, color: 'warning.main', fontSize: 12 }}>
                                    (singleton)
                                  </Box>
                              )}
                            </MenuItem>
                        ))}
                      </Select>
                      {errors.job_group_type_id && (
                          <FormHelperText>
                            {getString(errors.job_group_type_id.message ?? '') || errors.job_group_type_id.message}
                          </FormHelperText>
                      )}
                    </FormControl>
                )}
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