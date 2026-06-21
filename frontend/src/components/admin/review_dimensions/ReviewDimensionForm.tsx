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
    Box,
} from '@mui/material';
import type { UseMutationResult } from '@tanstack/react-query';
import useString from '../../../hooks/useString';
import type {
    ReviewDimensionCreate,
    ReviewDimensionUpdate,
    ReviewDimension,
    MutationResponse,
} from './reviewDimensionApi';

/** A 6-digit hex color (e.g. #2E7D32) — matches the picker output + DB column. */
const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

interface Props {
    open: boolean;
    onClose: () => void;
    /** When set, the dialog edits this row; otherwise it creates a new one. */
    editing?: ReviewDimension | null;
    /** sort_order to give a newly-created dimension (append at the end). */
    nextSortOrder: number;
    createMutation: UseMutationResult<MutationResponse<ReviewDimension>, Error, ReviewDimensionCreate>;
    updateMutation: UseMutationResult<
        MutationResponse<ReviewDimension>,
        Error,
        { id: number; data: ReviewDimensionUpdate }
    >;
}

export function ReviewDimensionForm({ open, onClose, editing, nextSortOrder, createMutation, updateMutation }: Props) {
    const getString = useString();
    const [name, setName] = useState('');
    const [key, setKey] = useState('');
    const [description, setDescription] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [color, setColor] = useState('#1565C0');
    const colorValid = HEX_COLOR_RE.test(color);

    // Prefill from the edited row (or reset for create) each time the dialog opens.
    useEffect(() => {
        if (!open) return;
        setName(editing?.name ?? '');
        setKey(editing?.key ?? '');
        setDescription(editing?.description ?? '');
        setIsActive(editing?.is_active ?? true);
        setColor(editing?.color ?? '#1565C0');
    }, [open, editing]);

    const isEdit = !!editing;
    const pending = createMutation.isPending || updateMutation.isPending;

    const handleSubmit = () => {
        const payload = {
            name: name.trim(),
            key: key.trim(),
            description: description.trim() || null,
            is_active: isActive,
            color,
            // Keep the existing order on edit; a fresh dimension is appended at
            // the end (admin can reorder it later with the up/down arrows).
            sort_order: editing ? editing.sort_order : nextSortOrder,
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
                    <Stack direction="row" alignItems="flex-start" spacing={1.5}>
                        <Box
                            component="input"
                            type="color"
                            // The native picker only accepts a valid hex; while the
                            // text field holds an invalid value, fall back to black.
                            value={colorValid ? color : '#000000'}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setColor(e.target.value)}
                            sx={{
                                width: 48,
                                height: 56,
                                p: 0,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                cursor: 'pointer',
                                background: 'none',
                                flexShrink: 0,
                            }}
                        />
                        <TextField
                            label={getString('dimensionColor')}
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            fullWidth
                            error={!colorValid}
                            helperText={
                                colorValid
                                    ? getString('colorHexHint')
                                    : getString('reviewDimensionInvalidColor', { color })
                            }
                            placeholder="#2E7D32"
                        />
                    </Stack>
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
                    disabled={!name.trim() || !key.trim() || !colorValid || pending}
                >
                    {pending ? getString('saving') : getString(isEdit ? 'save' : 'create')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
