// src/components/admin/department_types/DepartmentTypeMoveDialog.tsx
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    CircularProgress,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography,
    TextField,
    InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useState, useMemo } from 'react';
import type { UseMutationResult } from '@tanstack/react-query';
import type { DepartmentType } from './departmentTypeApi';
import type { MutationResponse } from './departmentTypeParentalLinkApi';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';

interface MoveVars {
    linkId: number;
    newParentId: number;
    oldParentId: number;
}

interface Props {
    open: boolean;
    childType: DepartmentType | null;
    currentParentId: number | null;
    linkId: number | null;
    allTypes: DepartmentType[];
    updateLinkMutation: UseMutationResult<MutationResponse<unknown>, Error, MoveVars>;
    onClose: () => void;
}

export function DepartmentTypeMoveDialog({
    open,
    childType,
    currentParentId,
    linkId,
    allTypes,
    updateLinkMutation,
    onClose,
}: Props) {
    const getString = useString({ str });
    const [selectedParentId, setSelectedParentId] = useState<number | ''>('');
    const [search, setSearch] = useState('');

    const available = useMemo(() => {
        const q = search.trim().toLowerCase();
        return allTypes.filter(
            (t) =>
                t.id !== childType?.id &&
                t.id !== currentParentId &&
                (!q || t.name.toLowerCase().includes(q)),
        );
    }, [allTypes, childType, currentParentId, search]);

    const handleClose = () => {
        setSelectedParentId('');
        setSearch('');
        onClose();
    };

    const handleConfirm = () => {
        if (!linkId || selectedParentId === '' || currentParentId == null) return;
        updateLinkMutation.mutate(
            {
                linkId,
                newParentId: selectedParentId as number,
                oldParentId: currentParentId,
            },
            { onSuccess: handleClose },
        );
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
            <DialogTitle>
                {cfl(getString('moveDepartmentType') || 'Move department type')}
            </DialogTitle>
            <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                    {getString('childType') || 'Type'}:{' '}
                    <strong>{childType?.name}</strong>
                </Typography>

                <TextField
                    size="small"
                    fullWidth
                    placeholder={getString('search') || 'Search…'}
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setSelectedParentId('');
                    }}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        },
                    }}
                />

                {available.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                        {getString('noAvailableParentTypes') ||
                            'No other parent types available or no types match the search.'}
                    </Typography>
                ) : (
                    <FormControl fullWidth size="small">
                        <InputLabel>
                            {cfl(getString('newParentDepartmentType') || 'New parent type')}
                        </InputLabel>
                        <Select
                            value={selectedParentId}
                            label={cfl(getString('newParentDepartmentType') || 'New parent type')}
                            onChange={(e) => setSelectedParentId(e.target.value as number)}
                        >
                            {available.map((t) => (
                                <MenuItem key={t.id} value={t.id}>
                                    {t.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={handleClose} disabled={updateLinkMutation.isPending}>
                    {getString('cancel') || 'Cancel'}
                </Button>
                <Button
                    variant="contained"
                    onClick={handleConfirm}
                    disabled={
                        selectedParentId === '' ||
                        available.length === 0 ||
                        updateLinkMutation.isPending
                    }
                    startIcon={
                        updateLinkMutation.isPending ? (
                            <CircularProgress size={16} color="inherit" />
                        ) : undefined
                    }
                >
                    {getString('move') || 'Move'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
