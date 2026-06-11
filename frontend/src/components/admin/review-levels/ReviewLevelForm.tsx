import { useState } from 'react';
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
import type { ReviewLevelCreate, ReviewLevel, MutationResponse } from './reviewLevelApi';

interface Props {
    open: boolean;
    onClose: () => void;
    createMutation: UseMutationResult<MutationResponse<ReviewLevel>, Error, ReviewLevelCreate>;
}

export function ReviewLevelForm({ open, onClose, createMutation }: Props) {
    const getString = useString();
    const [nameKey, setNameKey] = useState('');
    const [descriptionKey, setDescriptionKey] = useState('');
    const [sortOrder, setSortOrder] = useState('0');
    const [isActive, setIsActive] = useState(true);

    const handleSubmit = () => {
        createMutation.mutate({
            name_key: nameKey.trim(),
            description_key: descriptionKey.trim() || null,
            sort_order: Number(sortOrder) || 0,
            is_active: isActive,
        });
    };

    const handleClose = () => {
        setNameKey('');
        setDescriptionKey('');
        setSortOrder('0');
        setIsActive(true);
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>{getString('addReviewLevel')}</DialogTitle>
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
                        control={
                            <Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                        }
                        label={getString('isActiveCol')}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>{getString('cancel')}</Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={!nameKey.trim() || createMutation.isPending}
                >
                    {createMutation.isPending ? getString('creatingEllipsis') : getString('create')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
