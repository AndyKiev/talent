import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Stack,
    Switch,
    FormControlLabel,
    MenuItem,
} from '@mui/material';
import type { UseMutationResult } from '@tanstack/react-query';
import useString from '../../../hooks/useString';
import type { GetStringFn } from '../../../types/getStringFn';
import type { ReviewLevel } from '../review_levels/reviewLevelApi';
import type {
    ReviewLevelRequirementCreate,
    ReviewLevelRequirementUpdate,
    ReviewLevelRequirement,
    MutationResponse,
} from './reviewLevelRequirementApi';

interface Props {
    open: boolean;
    onClose: () => void;
    levels: ReviewLevel[];
    defaultLevelId: number | '';
    /** When set, the dialog edits this row; otherwise it creates a new one. */
    editing?: ReviewLevelRequirement | null;
    createMutation: UseMutationResult<
        MutationResponse<ReviewLevelRequirement>,
        Error,
        ReviewLevelRequirementCreate
    >;
    updateMutation: UseMutationResult<
        MutationResponse<ReviewLevelRequirement>,
        Error,
        { id: number; data: ReviewLevelRequirementUpdate }
    >;
}

export function ReviewLevelRequirementForm({
    open,
    onClose,
    levels,
    defaultLevelId,
    editing,
    createMutation,
    updateMutation,
}: Props) {
    const getString: GetStringFn = useString();
    const [levelId, setLevelId] = useState<number | ''>(defaultLevelId);
    const [textKey, setTextKey] = useState('');
    const [sortOrder, setSortOrder] = useState('0');
    const [isActive, setIsActive] = useState(true);

    useEffect(() => {
        if (!open) return;
        setLevelId(editing?.level_id ?? defaultLevelId);
        setTextKey(editing?.text_key ?? '');
        setSortOrder(String(editing?.sort_order ?? 0));
        setIsActive(editing?.is_active ?? true);
    }, [open, editing, defaultLevelId]);

    const isEdit = !!editing;
    const pending = createMutation.isPending || updateMutation.isPending;

    const handleSubmit = () => {
        if (levelId === '') return;
        const payload = {
            level_id: levelId,
            text_key: textKey.trim(),
            sort_order: Number(sortOrder) || 0,
            is_active: isActive,
        };
        if (isEdit && editing) {
            updateMutation.mutate({ id: editing.id, data: payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {getString(isEdit ? 'editReviewLevelRequirement' : 'addReviewLevelRequirement')}
            </DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField
                        select
                        variant="outlined"
                        label={getString('levelCol')}
                        value={levelId === '' ? '' : String(levelId)}
                        onChange={(e) => setLevelId(Number(e.target.value))}
                        fullWidth
                        required
                    >
                        {levels.map((lvl) => (
                            <MenuItem key={lvl.id} value={String(lvl.id)}>
                                {getString(lvl.name_key)}
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        label={getString('textKeyCol')}
                        value={textKey}
                        onChange={(e) => setTextKey(e.target.value)}
                        fullWidth
                        required
                    />
                    <TextField
                        label={getString('sortOrderCol')}
                        type="number"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        fullWidth
                    />
                    <FormControlLabel
                        control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
                        label={getString('isActiveCol')}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{getString('cancel')}</Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={levelId === '' || !textKey.trim() || pending}
                >
                    {pending ? getString('saving') : getString(isEdit ? 'save' : 'create')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
