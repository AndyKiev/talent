// src/components/admin/jobs/JobForm.tsx
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Alert,
  Autocomplete,
  TextField,
} from '@mui/material';
import { useQuery, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import type { JobCreate, MutationResponse, Job } from './jobApi';
import { fetchDepartmentTypes, type DepartmentType } from '../department_types/departmentTypeApi';
import { createDepartmentTypeJobLink } from '../department_types/departmentTypeJobLinkApi';
import useString from '../../../hooks/useString';
import cfl from '../../../utils/helpers.ts';
import type { SnackbarType } from '../../../types/types.ts';
import { DEPARTMENT_TYPE_QK, JOB_QK } from '../../../utils/queryKeys.ts';
import { FormSwitch } from '../../ui/FormSwitch';
import { FormTextField } from '../../ui/FormTextField';
import { CrudFormActions } from '../../ui/CrudFormActions';

const schema = z.object({
  name: z.string().min(1, 'nameRequired').max(128, 'nameTooLong'),
  short_name: z.string().max(64, 'shortNameTooLong').optional().or(z.literal('')),
  key: z.string().max(64, 'keyTooLong').optional().or(z.literal('')),
  description: z.string().max(256, 'descriptionTooLong').optional().or(z.literal('')),
  is_active: z.boolean(),
  // Optional: staffing department types to link right after the job is created.
  department_type_ids: z.array(z.number()),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  createMutation: UseMutationResult<MutationResponse<Job>, Error, JobCreate>;
  setSnackbar: (s: SnackbarType) => void;
}

export function JobForm({ open, onClose, createMutation, setSnackbar }: Props) {
  const getString = useString();
  const qc = useQueryClient();

  const { data: departmentTypes = [] } = useQuery({
    queryKey: DEPARTMENT_TYPE_QK,
    queryFn: () => fetchDepartmentTypes(),
    enabled: open,
    staleTime: 2 * 60 * 1000,
  });
  const sortedDepartmentTypes = [...departmentTypes].sort((a, b) => a.name.localeCompare(b.name));

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      short_name: '',
      key: '',
      description: '',
      is_active: true,
      department_type_ids: [],
    },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data: FormData) => {
    let created: MutationResponse<Job>;
    try {
      created = await createMutation.mutateAsync({
        name: data.name,
        short_name: data.short_name || null,
        key: data.key || null,
        description: data.description || null,
        is_active: data.is_active,
      });
    } catch {
      return; // shown by the Alert above the fields
    }
    reset();
    if (data.department_type_ids.length === 0) return;

    // The job exists now; link it. A failed link does not undo the job —
    // report how many failed so they can be added from the grid.
    const results = await Promise.allSettled(
      data.department_type_ids.map((departmentTypeId) =>
        createDepartmentTypeJobLink({
          department_type_id: departmentTypeId,
          job_id: created.data.id,
        }),
      ),
    );
    await Promise.all([
      qc.invalidateQueries({ queryKey: JOB_QK }),
      qc.invalidateQueries({ queryKey: DEPARTMENT_TYPE_QK }),
    ]);
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) {
      setSnackbar({
        open: true,
        message: getString('jobDepartmentTypeLinksFailed', { count: failed }),
        severity: 'error',
      });
    }
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

          <Controller
            name="department_type_ids"
            control={control}
            render={({ field }) => (
              <Autocomplete
                multiple
                size="small"
                options={sortedDepartmentTypes}
                getOptionLabel={(t: DepartmentType) => t.name}
                isOptionEqualToValue={(opt, val) => opt.id === val.id}
                value={sortedDepartmentTypes.filter((t) => field.value.includes(t.id))}
                onChange={(_, value) => field.onChange(value.map((t) => t.id))}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={cfl(getString('departmentTypes'))}
                    helperText={getString('jobDepartmentTypesHint')}
                  />
                )}
              />
            )}
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
