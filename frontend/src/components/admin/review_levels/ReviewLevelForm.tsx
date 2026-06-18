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
} from '@mui/material';
import type { UseMutationResult } from '@tanstack/react-query';
import useString from '../../../hooks/useString';
import type {
    ReviewLevelCreate,
    ReviewLevelUpdate,
    ReviewLevel,
    MutationResponse,
} from './reviewLevelApi';

interface Props {
    open: boolean;
    onClose: () => void;
    /** When set, the dialog edits this row; otherwise it creates a new one. */
    editing?: ReviewLevel | null;
    createMutation: UseMutationResult<MutationResponse<ReviewLevel>, Error, ReviewLevelCreate>;
    updateMutation: UseMutationResult<
        MutationResponse<ReviewLevel>,
        Error,
        { id: number; data: ReviewLevelUpdate }
    >;
}

export function ReviewLevelForm({ open, onClose, editing, createMutation, updateMutation }: Props) {
    const getString = useString();
    const [nameKey, setNameKey] = useState('');
    const [descriptionKey, setDescriptionKey] = useState('');
    const [sortOrder, setSortOrder] = useState('0');
    const [isActive, setIsActive] = useState(true);

    useEffect(() => {
        if (!open) return;
        setNameKey(editing?.name_key ?? '');
        setDescriptionKey(editing?.description_key ?? '');
        setSortOrder(String(editing?.sort_order ?? 0));
        setIsActive(editing?.is_active ?? true);
    }, [open, editing]);

    const isEdit = !!editing;
    const pending = createMutation.isPending || updateMutation.isPending;

    const handleSubmit = () => {
        const payload = {
            name_key: nameKey.trim(),
            description_key: descriptionKey.trim() || null,
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
            <DialogTitle>{getString(isEdit ? 'editReviewLevel' : 'addReviewLevel')}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField
                        label={getString('nameKeyCol')}
                        value={nameKey}
                        onChange={(e) => setNameKey(e.target.value)}
                        fullWidth
                        required
                    />
                    <TextField
                        label={getString('descriptionKeyCol')}
                        value={descriptionKey}
                        onChange={(e) => setDescriptionKey(e.target.value)}
                        fullWidth
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
                    disabled={!nameKey.trim() || pending}
                >
                    {pending ? getString('saving') : getString(isEdit ? 'save' : 'create')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
