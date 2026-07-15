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
    Box,
} from '@mui/material';
import type { UseMutationResult } from '@tanstack/react-query';
import useString from '../../../../hooks/useString';
import type {
    RecruitmentDimensionCreate,
    RecruitmentDimensionUpdate,
    RecruitmentDimension,
    MutationResponse,
} from './recruitmentDimensionApi';

/** A 6-digit hex color (e.g. #2E7D32) — matches the picker output + DB column. */
const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

interface Props {
    open: boolean;
    onClose: () => void;
    editing?: RecruitmentDimension | null;
    nextSortOrder: number;
    createMutation: UseMutationResult<MutationResponse<RecruitmentDimension>, Error, RecruitmentDimensionCreate>;
    updateMutation: UseMutationResult<
        MutationResponse<RecruitmentDimension>,
        Error,
        { id: number; data: RecruitmentDimensionUpdate }
    >;
}

// Inner form mounts fresh per open (and per edited row, via the key), so the
// useState initializers do the prefill — no setState-in-effect.
function DimensionFields({ onClose, editing, nextSortOrder, createMutation, updateMutation }: Omit<Props, 'open'>) {
    const getString = useString();
    const [name, setName] = useState(editing?.name ?? '');
    const [key, setKey] = useState(editing?.key ?? '');
    const [description, setDescription] = useState(editing?.description ?? '');
    const [isActive, setIsActive] = useState(editing?.is_active ?? true);
    const [color, setColor] = useState(editing?.color ?? '#1565C0');
    const colorValid = HEX_COLOR_RE.test(color);

    const isEdit = !!editing;
    const pending = createMutation.isPending || updateMutation.isPending;

    const handleSubmit = () => {
        const payload = {
            name: name.trim(),
            key: key.trim(),
            description: description.trim() || null,
            is_active: isActive,
            color,
            sort_order: editing ? editing.sort_order : nextSortOrder,
        };
        if (isEdit && editing) {
            updateMutation.mutate({ id: editing.id, data: payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    return (
        <>
            <DialogTitle>{getString(isEdit ? 'editRecruitmentDimension' : 'addRecruitmentDimension')}</DialogTitle>
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
                                    : getString('recruitmentDimensionInvalidColor', { color })
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
        </>
    );
}

export function RecruitmentDimensionForm({ open, onClose, editing, nextSortOrder, createMutation, updateMutation }: Props) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            {open && (
                <DimensionFields
                    key={editing?.id ?? 'new'}
                    onClose={onClose}
                    editing={editing}
                    nextSortOrder={nextSortOrder}
                    createMutation={createMutation}
                    updateMutation={updateMutation}
                />
            )}
        </Dialog>
    );
}
