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
import type { ReviewDimensionCreate, ReviewDimension, MutationResponse } from './reviewDimensionApi';

interface Props {
    open: boolean;
    onClose: () => void;
    createMutation: UseMutationResult<MutationResponse<ReviewDimension>, Error, ReviewDimensionCreate>;
}

export function ReviewDimensionForm({ open, onClose, createMutation }: Props) {
    const [name, setName] = useState('');
    const [key, setKey] = useState('');
    const [description, setDescription] = useState('');
    const [isActive, setIsActive] = useState(true);

    const handleSubmit = () => {
        createMutation.mutate({
            name,
            key,
            description: description || null,
            is_active: isActive,
        });
    };

    const handleClose = () => {
        setName('');
        setKey('');
        setDescription('');
        setIsActive(true);
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Add Review Dimension</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField
                        label="Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        fullWidth
                        required
                    />
                    <TextField
                        label="Key"
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        fullWidth
                        required
                        helperText="Short unique identifier, e.g. TRANSFORMATION_PERFORMANCE"
                    />
                    <TextField
                        label="Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        fullWidth
                        multiline
                        rows={3}
                    />
                    <FormControlLabel
                        control={
                            <Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                        }
                        label="Active"
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={!name || !key || createMutation.isPending}
                >
                    {createMutation.isPending ? 'Creating...' : 'Create'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
