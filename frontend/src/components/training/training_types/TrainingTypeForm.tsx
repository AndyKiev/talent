// src/components/training/training_types/TrainingTypeForm.tsx
import { useEffect } from 'react';
import { useForm, useWatch, Controller } from 'react-hook-form';
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
    Chip,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import type { TrainingTypeCreate, TrainingTypeUpdate, MutationResponse, TrainingType } from './trainingTypeApi';
import { fetchTrainingCategories } from '../training_categories/trainingCategoryApi';
import { fetchTrainingLinkTypes } from '../training_link_types/trainingLinkTypeApi';
import { fetchJobCategories } from '../../admin/job_categories/jobCategoryApi';
import { fetchJobs } from '../../admin/jobs/jobApi';
import { TRAINING_CATEGORY_QK, TRAINING_LINK_TYPE_QK, JOB_CATEGORY_QK, JOB_QK } from '../../../utils/queryKeys.ts';
import useString from '../../../hooks/useString.ts';
import cfl, { snakeToCamel } from '../../../utils/helpers.ts';
import str from '../../../strings/str.ts';

const BY_JOB_CATEGORY_KEY = 'by_job_category';
const BY_JOB_KEY = 'by_job';

const schema = z.object({
    name: z.string().min(1, 'nameRequired').max(128, 'nameTooLong'),
    key: z.string().min(1, 'keyRequired').max(64, 'keyTooLong'),
    description: z.string().max(256, 'descriptionTooLong').optional().or(z.literal('')),
    training_category_id: z.number({ error: 'trainingCategoryRequired' }).min(1, 'trainingCategoryRequired'),
    training_link_type_id: z.number({ error: 'trainingLinkTypeRequired' }).min(1, 'trainingLinkTypeRequired'),
    job_category_ids: z.array(z.number()),
    job_ids: z.array(z.number()),
});

type FormData = z.infer<typeof schema>;

interface Props {
    open: boolean;
    onClose: () => void;
    editingRecord?: TrainingType | null;
    createMutation: UseMutationResult<MutationResponse<TrainingType>, Error, TrainingTypeCreate>;
    updateMutation: UseMutationResult<MutationResponse<TrainingType>, Error, { id: number; data: TrainingTypeUpdate }>;
}

export function TrainingTypeForm({ open, onClose, editingRecord, createMutation, updateMutation }: Props) {
    const getString = useString({ str });
    const isEditing = !!editingRecord;

    const { data: categories = [] } = useQuery({
        queryKey: TRAINING_CATEGORY_QK,
        queryFn: fetchTrainingCategories,
        staleTime: 5 * 60 * 1000,
        enabled: open,
    });

    const { data: linkTypes = [] } = useQuery({
        queryKey: TRAINING_LINK_TYPE_QK,
        queryFn: fetchTrainingLinkTypes,
        staleTime: 5 * 60 * 1000,
        enabled: open,
    });

    const { data: jobCategories = [] } = useQuery({
        queryKey: JOB_CATEGORY_QK,
        queryFn: fetchJobCategories,
        staleTime: 5 * 60 * 1000,
        enabled: open,
    });

    const { data: jobs = [] } = useQuery({
        queryKey: JOB_QK,
        queryFn: fetchJobs,
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
        defaultValues: {
            name: '', key: '', description: '',
            training_category_id: 0, training_link_type_id: 0,
            job_category_ids: [], job_ids: [],
        },
    });

    useEffect(() => {
        if (!open) return;
        if (editingRecord) {
            reset({
                name: editingRecord.name,
                key: editingRecord.key,
                description: editingRecord.description || '',
                training_category_id: editingRecord.training_category_id,
                training_link_type_id: editingRecord.training_link_type_id,
                job_category_ids: editingRecord.job_category_ids,
                job_ids: editingRecord.job_ids,
            });
        } else {
            reset({
                name: '', key: '', description: '',
                training_category_id: 0, training_link_type_id: 0,
                job_category_ids: [], job_ids: [],
            });
        }
    }, [open, editingRecord, reset]);

    const selectedLinkTypeId = useWatch({ control, name: 'training_link_type_id' });
    const selectedLinkType = linkTypes.find((t) => t.id === selectedLinkTypeId);
    const showJobCategorySelect = selectedLinkType?.key === BY_JOB_CATEGORY_KEY;
    const showJobSelect = selectedLinkType?.key === BY_JOB_KEY;

    const handleClose = () => {
        reset();
        onClose();
    };

    const onSubmit = (data: FormData) => {
        const payload: TrainingTypeCreate = {
            name: data.name,
            key: data.key,
            description: data.description || null,
            training_category_id: data.training_category_id,
            training_link_type_id: data.training_link_type_id,
            job_category_ids: showJobCategorySelect ? data.job_category_ids : [],
            job_ids: showJobSelect ? data.job_ids : [],
        };
        if (isEditing && editingRecord) {
            updateMutation.mutate({ id: editingRecord.id, data: payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const activeMutation = isEditing ? updateMutation : createMutation;

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {isEditing
                    ? cfl(getString('editTrainingType')) || 'Edit Training Type'
                    : cfl(getString('createTrainingType')) || 'Create Training Type'}
            </DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    {activeMutation.isError && (
                        <Alert severity="error">{activeMutation.error?.message}</Alert>
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
                        helperText={
                            errors.description?.message &&
                            (getString(errors.description.message) || errors.description.message)
                        }
                        {...register('description')}
                    />

                    <Controller
                        name="training_category_id"
                        control={control}
                        render={({ field }) => (
                            <FormControl fullWidth error={!!errors.training_category_id}>
                                <InputLabel>{cfl(getString('trainingCategory')) || 'Category'}</InputLabel>
                                <Select
                                    {...field}
                                    variant="outlined"
                                    label={cfl(getString('trainingCategory')) || 'Category'}
                                    value={field.value || ''}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                >
                                    {categories.map((c) => {
                                        const translated = getString(c.key);
                                        return (
                                            <MenuItem key={c.id} value={c.id}>
                                                {translated === c.key ? c.name : translated}
                                            </MenuItem>
                                        );
                                    })}
                                </Select>
                                {errors.training_category_id && (
                                    <FormHelperText>
                                        {getString(errors.training_category_id.message ?? '') || errors.training_category_id.message}
                                    </FormHelperText>
                                )}
                            </FormControl>
                        )}
                    />

                    <Controller
                        name="training_link_type_id"
                        control={control}
                        render={({ field }) => (
                            <FormControl fullWidth error={!!errors.training_link_type_id}>
                                <InputLabel>{cfl(getString('trainingLinkType')) || 'Link Type'}</InputLabel>
                                <Select
                                    {...field}
                                    variant="outlined"
                                    label={cfl(getString('trainingLinkType')) || 'Link Type'}
                                    value={field.value || ''}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                >
                                    {linkTypes.map((t) => {
                                        const linkTypeKey = `trainingLinkType${cfl(snakeToCamel(t.key))}`;
                                        const translated = getString(linkTypeKey);
                                        return (
                                            <MenuItem key={t.id} value={t.id}>
                                                {translated === linkTypeKey ? cfl(t.key) : cfl(translated)}
                                            </MenuItem>
                                        );
                                    })}
                                </Select>
                                {errors.training_link_type_id && (
                                    <FormHelperText>
                                        {getString(errors.training_link_type_id.message ?? '') || errors.training_link_type_id.message}
                                    </FormHelperText>
                                )}
                            </FormControl>
                        )}
                    />

                    {showJobCategorySelect && (
                        <Controller
                            name="job_category_ids"
                            control={control}
                            render={({ field }) => (
                                <FormControl fullWidth error={!!errors.job_category_ids}>
                                    <InputLabel>{cfl(getString('jobCategory')) || 'Job Categories'}</InputLabel>
                                    <Select
                                        {...field}
                                        multiple
                                        variant="outlined"
                                        label={cfl(getString('jobCategory')) || 'Job Categories'}
                                        value={field.value ?? []}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            field.onChange(typeof val === 'string' ? val.split(',').map(Number) : val);
                                        }}
                                        renderValue={(selected) => (
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                {(selected as number[]).map((id) => {
                                                    const cat = jobCategories.find((c) => c.id === id);
                                                    if (!cat) return null;
                                                    const translated = getString(cat.key);
                                                    return (
                                                        <Chip
                                                            key={id}
                                                            size="small"
                                                            label={translated === cat.key ? cat.key : translated}
                                                        />
                                                    );
                                                })}
                                            </Box>
                                        )}
                                    >
                                        {jobCategories.map((c) => {
                                            const translated = getString(c.key);
                                            return (
                                                <MenuItem key={c.id} value={c.id}>
                                                    {translated === c.key ? c.key : translated}
                                                </MenuItem>
                                            );
                                        })}
                                    </Select>
                                </FormControl>
                            )}
                        />
                    )}

                    {showJobSelect && (
                        <Controller
                            name="job_ids"
                            control={control}
                            render={({ field }) => (
                                <FormControl fullWidth error={!!errors.job_ids}>
                                    <InputLabel>{cfl(getString('job')) || 'Jobs'}</InputLabel>
                                    <Select
                                        {...field}
                                        multiple
                                        variant="outlined"
                                        label={cfl(getString('job')) || 'Jobs'}
                                        value={field.value ?? []}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            field.onChange(typeof val === 'string' ? val.split(',').map(Number) : val);
                                        }}
                                        renderValue={(selected) => (
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                {(selected as number[]).map((id) => {
                                                    const job = jobs.find((j) => j.id === id);
                                                    return job ? <Chip key={id} size="small" label={job.name} /> : null;
                                                })}
                                            </Box>
                                        )}
                                    >
                                        {jobs.map((j) => (
                                            <MenuItem key={j.id} value={j.id}>{j.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            )}
                        />
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={handleClose} disabled={activeMutation.isPending}>
                    {getString('cancel') || 'Cancel'}
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit(onSubmit)}
                    disabled={activeMutation.isPending}
                    startIcon={activeMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                    {isEditing ? (getString('save') || 'Save') : (getString('create') || 'Create')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
