// src/components/admin/departments/DepartmentForm.tsx
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
  FormControlLabel,
  Switch,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  FormHelperText,
  Typography,
  Chip,
} from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import { useQuery } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import {
  fetchDepartmentTypes,
  type DepartmentCreate,
  type MutationResponse,
  type DepartmentNode,
  type DepartmentFlat,
} from './departmentApi';




import { useAllowedDepartmentTypes } from './useAllowedDepartmentTypes';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';
import {fetchDepartmentCategories} from "../department_categories/departmentCategoryApi.ts";

const schema = z.object({
  name: z.string().min(1, 'nameRequired').max(128, 'nameTooLong'),
  is_active: z.boolean(),
  department_type_id: z.number({ error: 'typeRequired' }),
  department_category_id: z.number({ error: 'categoryRequired' }),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  /** When set, this department becomes the parent (Add Child flow) */
  parentNode?: DepartmentFlat | DepartmentNode | null;
  createMutation: UseMutationResult<MutationResponse<DepartmentNode>, Error, DepartmentCreate>;
}

export function DepartmentForm({ open, onClose, parentNode, createMutation }: Props) {
  const getString = useString({ str });

  // Full list — always needed for the root case and as the allTypes reference
  const { data: allTypes = [] } = useQuery({
    queryKey: ['department_types'],
    queryFn: fetchDepartmentTypes,
    staleTime: 5 * 60 * 1000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['department_categories'],
    queryFn: () => fetchDepartmentCategories(),
    staleTime: 5 * 60 * 1000,
  });

  // When a parent is selected, restrict types to those linked as children of the
  // parent's department_type_id. Null parent → root department → all types allowed.
  const parentTypeId = parentNode?.department_type_id ?? null;
  const { allowedTypes, isLoading: typesLoading } = useAllowedDepartmentTypes(
      parentTypeId,
      allTypes,
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      is_active: true,
      department_type_id: undefined,
      department_category_id: undefined,
    },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = (data: FormData) => {
    createMutation.mutate({
      name: data.name,
      is_active: data.is_active,
      parent_id: parentNode?.id ?? null,
      department_type_id: data.department_type_id,
      department_category_id: data.department_category_id,
    });
  };

  // Get current values for conditional logic
  const selectedCategoryId = watch('department_category_id');
  const currentName = watch('name');


    const isStoreDepartmentsCategory = selectedCategoryId
        ? categories.some(
            (cat) => cat.id === selectedCategoryId && !cat.is_main
        )
        : false;

  return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{cfl(getString('createDepartment') || 'Create Department')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {createMutation.isError && (
                <Alert severity="error">{createMutation.error?.message}</Alert>
            )}

            {/* Parent context badge */}
            {parentNode ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccountTreeIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {getString('parentDepartment') || 'Parent'}:
                  </Typography>
                  <Chip label={parentNode.name} size="small" variant="outlined" color="primary" />
                </Box>
            ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccountTreeIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {getString('rootDepartment') || 'Root department (no parent)'}
                  </Typography>
                </Box>
            )}

            <TextField
                label={cfl(getString('name') || 'Name')}
                fullWidth
                slotProps={{ htmlInput: { maxLength: 128 } }}
                error={!!errors.name}
                helperText={
                    errors.name?.message &&
                    (getString(errors.name.message) || errors.name.message)
                }
                {...register('name')}
            />

            {/* Department category - needed before type for auto-population */}
            <Controller
                name="department_category_id"
                control={control}
                render={({ field }) => (
                    <FormControl fullWidth error={!!errors.department_category_id}>
                      <InputLabel>
                        {cfl(getString('departmentCategory') || 'Department Category')}
                      </InputLabel>
                      <Select
                          {...field}
                          value={field.value ?? ''}
                          label={cfl(getString('departmentCategory') || 'Department Category')}
                          onChange={(e) => {
                            const newCategoryId = Number(e.target.value);
                            field.onChange(newCategoryId);
                            // Clear name when category changes from store_departments to something else
                            if (!isStoreDepartmentsCategory && currentName) {
                              setValue('name', '', { shouldValidate: true });
                            }
                          }}
                      >
                        {categories.map((c) => (
                            <MenuItem key={c.id} value={c.id}>
                              {c.name}
                            </MenuItem>
                        ))}
                      </Select>
                      {errors.department_category_id && (
                          <FormHelperText>
                            {getString(errors.department_category_id.message ?? '') ||
                                errors.department_category_id.message}
                          </FormHelperText>
                      )}
                    </FormControl>
                )}
            />

            {/* Department type — constrained to children of parent's type when parent exists */}
            <Controller
                name="department_type_id"
                control={control}
                render={({ field }) => (
                    <FormControl fullWidth error={!!errors.department_type_id} disabled={typesLoading}>
                      <InputLabel>
                        {cfl(getString('departmentType') || 'Department Type')}
                      </InputLabel>
                      <Select
                          {...field}
                          value={field.value ?? ''}
                          label={cfl(getString('departmentType') || 'Department Type')}
                          onChange={(e) => {
                            const newTypeId = Number(e.target.value);
                            field.onChange(newTypeId);

                            // Auto-populate name ONLY when:
                            // 1. Category is "store_departments"
                            // 2. User selected a valid department type
                            // 3. This is triggered by user interaction (onChange)
                            if (isStoreDepartmentsCategory && newTypeId) {
                              const selectedType = allTypes.find((type) => type.id === newTypeId);
                              if (selectedType) {
                                // Set the name field with the selected department type name
                                setValue('name', selectedType.name, { shouldValidate: true });
                              }
                            }
                          }}
                          startAdornment={
                            typesLoading ? <CircularProgress size={16} sx={{ mr: 1 }} /> : undefined
                          }
                      >
                        {allowedTypes.map((t) => (
                            <MenuItem key={t.id} value={t.id}>
                              {t.name}
                            </MenuItem>
                        ))}
                      </Select>
                      {parentTypeId != null && !typesLoading && allowedTypes.length === 0 && (
                          <FormHelperText>
                            {getString('noAllowedTypesForParent') ||
                                `No child types are linked to the parent's type. Set up type links first.`}
                          </FormHelperText>
                      )}
                      {errors.department_type_id && (
                          <FormHelperText>
                            {getString(errors.department_type_id.message ?? '') ||
                                errors.department_type_id.message}
                          </FormHelperText>
                      )}
                    </FormControl>
                )}
            />

            {/* Optional: Add a hint text when auto-population is active */}
            {isStoreDepartmentsCategory && (
                <Typography
                    variant="caption"
                    color="info.main"
                    sx={{ mt: -1, display: 'flex', alignItems: 'center', gap: 0.5 }}
                >
                  <LightbulbOutlinedIcon sx={{ fontSize: 16 }} />
                  {getString('autoPopulateHint') || 'Department name will be auto-populated from the selected department type'}
                </Typography>
            )}

            <FormControlLabel
                control={
                  <Switch
                      checked={watch('is_active')}
                      onChange={(_, checked) => setValue('is_active', checked)}
                  />
                }
                label={cfl(getString('isActive') || 'Active')}
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
              disabled={
                  createMutation.isPending || (parentTypeId != null && allowedTypes.length === 0)
              }
              startIcon={
                createMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined
              }
          >
            {getString('create') || 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
  );
}