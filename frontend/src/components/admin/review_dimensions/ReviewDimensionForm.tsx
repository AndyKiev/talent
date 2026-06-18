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
    ReviewDimensionCreate,
    ReviewDimensionUpdate,
    ReviewDimension,
    MutationResponse,
} from './reviewDimensionApi';

interface Props {
    open: boolean;
    onClose: () => void;
    /** When set, the dialog edits this row; otherwise it creates a new one. */
    editing?: ReviewDimension | null;
    createMutation: UseMutationResult<MutationResponse<ReviewDimension>, Error, ReviewDimensionCreate>;
    updateMutation: UseMutationResult<
        MutationResponse<ReviewDimension>,
        Error,
        { id: number; data: ReviewDimensionUpdate }
    >;
}

export function ReviewDimensionForm({ open, onClose, editing, createMutation, updateMutation }: Props) {
    const getString = useString();
    const [name, setName] = useState('');
    const [key, setKey] = useState('');
    const [description, setDescription] = useState('');
    const [isActive, setIsActive] = useState(true);

    // Prefill from the edited row (or reset for create) each time the dialog opens.
    useEffect(() => {
        if (!open) return;
        setName(editing?.name ?? '');
        setKey(editing?.key ?? '');
        setDescription(editing?.description ?? '');
        setIsActive(editing?.is_active ?? true);
    }, [open, editing]);

    const isEdit = !!editing;
    const pending = createMutation.isPending || updateMutation.isPending;

    const handleSubmit = () => {
        const payload = {
            name: name.trim(),
            key: key.trim(),
            description: description.trim() || null,
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
            <DialogTitle>{getString(isEdit ? 'editReviewDimension' : 'addReviewDimension')}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField
                        label={getString('name')}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        fullWidth
                        required
                    />
                    <TextField
                        label={getString('keyLabel')}
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        fullWidth
                        required
                        helperText={getString('reviewDimensionKeyHint')}
                    />
                    <TextField
                        label={getString('descriptionCol')}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        fullWidth
                        multiline
                        rows={3}
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
                    disabled={!name.trim() || !key.trim() || pending}
                >
                    {pending ? getString('saving') : getString(isEdit ? 'save' : 'create')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
