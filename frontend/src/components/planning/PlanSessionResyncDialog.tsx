// src/components/planning/PlanSessionResyncDialog.tsx
import { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Autocomplete,
    Chip,
    TextField,
    Typography,
    CircularProgress,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import {
    fetchDepartmentCategoriesRef,
    type RefDepartmentCategory,
    type PlanSession,
} from './planningApi';
import useString from '../../hooks/useString';
import cfl from '../../utils/helpers.ts';
import str from '../../strings/str';

interface Props {
    session: PlanSession | null;
    isPending: boolean;
    onConfirm: (addCategoryIds: number[]) => void;
    onCancel: () => void;
}

export function PlanSessionResyncDialog({ session, isPending, onConfirm, onCancel }: Props) {
    const getString = useString({ str });
    const [selected, setSelected] = useState<RefDepartmentCategory[]>([]);

    const { data: categories = [] } = useQuery({
        queryKey: ['department_categories_ref'],
        queryFn: fetchDepartmentCategoriesRef,
        staleTime: 5 * 60 * 1000,
        enabled: !!session,
    });

    const handleConfirm = () => onConfirm(selected.map((c) => c.id));

    const handleClose = () => {
        setSelected([]);
        onCancel();
    };

    return (
        <Dialog open={!!session} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>{cfl(getString('resyncPlanSession')) || 'Re-sync session'}</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <Typography variant="body2">
                        {getString('areYouSureResyncPlanSession', { name: session?.name ?? '' }) ||
                            `Re-sync "${session?.name ?? ''}" with current config? New matches are added; existing values are kept.`}
                    </Typography>

                    <Autocomplete<RefDepartmentCategory, true>
                        multiple
                        options={categories}
                        getOptionLabel={(o) => o.name}
                        isOptionEqualToValue={(a, b) => a.id === b.id}
                        value={selected}
                        onChange={(_, vals) => setSelected(vals)}
                        renderTags={(value, getTagProps) =>
                            value.map((option, index) => (
                                <Chip
                                    label={option.name}
                                    size="small"
                                    {...getTagProps({ index })}
                                    key={option.id}
                                />
                            ))
                        }
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label={cfl(getString('addCategories')) || 'Add categories (optional)'}
                                placeholder={getString('resyncNoCategoryHint') || 'Leave empty to only reconcile'}
                            />
                        )}
                    />
                    <Typography variant="caption" color="text.secondary">
                        {getString('resyncCategoryHint') ||
                            'Optionally add new categories before reconciling. A category cannot be planned in two sessions with overlapping dates.'}
                    </Typography>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={handleClose} disabled={isPending}>
                    {getString('cancel') || 'Cancel'}
                </Button>
                <Button
                    variant="contained"
                    color="info"
                    onClick={handleConfirm}
                    disabled={isPending}
                    startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                    {getString('resync') || 'Re-sync'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
