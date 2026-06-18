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
import type { ReviewLevel } from '../review-levels/reviewLevelApi';
import type {
    ReviewLevelRequirementCreate,
    ReviewLevelRequirement,
    MutationResponse,
} from './reviewLevelRequirementApi';

interface Props {
    open: boolean;
    onClose: () => void;
    levels: ReviewLevel[];
    defaultLevelId: number | '';
    createMutation: UseMutationResult<
        MutationResponse<ReviewLevelRequirement>,
        Error,
        ReviewLevelRequirementCreate
    >;
}

export function ReviewLevelRequirementForm({
    open,
    onClose,
    levels,
    defaultLevelId,
    createMutation,
}: Props) {
    const getString: GetStringFn = useString();
    const [levelId, setLevelId] = useState<number | ''>(defaultLevelId);
    const [textKey, setTextKey] = useState('');
    const [sortOrder, setSortOrder] = useState('0');
    const [isActive, setIsActive] = useState(true);

    useEffect(() => {
        if (open) setLevelId(defaultLevelId);
    }, [open, defaultLevelId]);

    const handleSubmit = () => {
        if (levelId === '') return;
        createMutation.mutate({
            level_id: levelId,
            text_key: textKey.trim(),
            sort_order: Number(sortOrder) || 0,
            is_active: isActive,
        });
    };

    const handleClose = () => {
        setTextKey('');
        setSortOrder('0');
        setIsActive(true);
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>{getString('addReviewLevelRequirement')}</DialogTitle>
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
                    disabled={levelId === '' || !textKey.trim() || createMutation.isPending}
                >
                    {createMutation.isPending ? getString('creatingEllipsis') : getString('create')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
