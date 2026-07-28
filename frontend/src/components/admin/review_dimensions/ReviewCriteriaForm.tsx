import { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Stack,
    FormControlLabel,
    Switch,
} from '@mui/material';
import type { UseMutationResult } from '@tanstack/react-query';
import useString from '../../../hooks/useString';
import type {
    CriteriaCreate,
    CriteriaUpdate,
    ReviewDimensionCriteria,
    MutationResponse,
} from './reviewDimensionApi';

interface Props {
    open: boolean;
    onClose: () => void;
    dimensionId: number;
    /** When set, the dialog edits this criterion; otherwise it creates a new one. */
    editing?: ReviewDimensionCriteria | null;
    /** Next sort_order to use for a newly created criterion (appended to the end). */
    nextSortOrder: number;
    createMutation: UseMutationResult<MutationResponse<ReviewDimensionCriteria>, Error, CriteriaCreate>;
    updateMutation: UseMutationResult<
        MutationResponse<ReviewDimensionCriteria>,
        Error,
        { id: number; data: CriteriaUpdate }
    >;
}

export function ReviewCriteriaForm({
    open,
    onClose,
    dimensionId,
    editing,
    nextSortOrder,
    createMutation,
    updateMutation,
}: Props) {
    const getString = useString();
    const [text, setText] = useState(editing?.text ?? '');
    const [isActive, setIsActive] = useState(editing?.is_active ?? true);

    const isEdit = !!editing;
    const pending = createMutation.isPending || updateMutation.isPending;

    const handleSubmit = () => {
        const trimmed = text.trim();
        if (!trimmed) return;
        if (isEdit && editing) {
            updateMutation.mutate({ id: editing.id, data: { text: trimmed, is_active: isActive } });
        } else {
            createMutation.mutate({
                dimension_id: dimensionId,
                text: trimmed,
                sort_order: nextSortOrder,
                is_active: isActive,
            });
        }
    };

    return (
        <Dialog
            key={`${open}-${editing?.id ?? 'new'}`}
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
        >
            <DialogTitle>{getString(isEdit ? 'editCriterion' : 'addCriterion')}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField
                        label={getString('criterionText')}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        fullWidth
                        required
                        multiline
                        rows={3}
                        autoFocus
                    />
                    <FormControlLabel
                        control={
                            <Switch
                                checked={isActive}
                                onChange={(e) => setIsActive(e.target.checked)}
                            />
                        }
                        label={getString('active')}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{getString('cancel')}</Button>
                <Button variant="contained" onClick={handleSubmit} disabled={!text.trim() || pending}>
                    {pending ? getString('saving') : getString(isEdit ? 'save' : 'create')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
