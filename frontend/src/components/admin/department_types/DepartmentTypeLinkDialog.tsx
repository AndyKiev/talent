// src/components/admin/department_types/DepartmentTypeLinkDialog.tsx
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
} from '@mui/material';
import { useState } from 'react';
import type { UseMutationResult } from '@tanstack/react-query';
import type { DepartmentType } from './departmentTypeApi';
import type { DepartmentTypeChild, ParentalLinkCreate, MutationResponse } from './departmentTypeParentalLinkApi';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/capitalizeFirstLetter';

interface Props {
    open: boolean;
    parentType: DepartmentType | null;
    /** All types — children and the parent itself will be excluded */
    allTypes: DepartmentType[];
    /** Already-linked children for this parent (to exclude from the select) */
    existingChildren: DepartmentTypeChild[];
    createLinkMutation: UseMutationResult<MutationResponse<unknown>, Error, ParentalLinkCreate>;
    onClose: () => void;
}

export function DepartmentTypeLinkDialog({
    open,
    parentType,
    allTypes,
    existingChildren,
    createLinkMutation,
    onClose,
}: Props) {
    const getString = useString({ str });
    const [selectedChildId, setSelectedChildId] = useState<number | ''>('');

    const existingChildIds = new Set(existingChildren.map((c) => c.id));

    // Exclude: the parent itself, already-linked children
    const available = allTypes.filter(
        (t) => t.id !== parentType?.id && !existingChildIds.has(t.id),
    );

    const handleClose = () => {
        setSelectedChildId('');
        onClose();
    };

    const handleConfirm = () => {
        if (!parentType || selectedChildId === '') return;
        createLinkMutation.mutate(
            { child_id: selectedChildId as number, parent_id: parentType.id },
            { onSuccess: handleClose },
        );
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
            <DialogTitle>
                {cfl(getString('addChildDepartmentType') || 'Add child department type')}
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {getString('parentType') || 'Parent'}:{' '}
                    <strong>{parentType?.name}</strong>
                </Typography>

                {available.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                        {getString('noAvailableChildTypes') ||
                            'All department types are already linked or there are none to add.'}
                    </Typography>
                ) : (
                    <FormControl fullWidth size="small">
                        <InputLabel>
                            {cfl(getString('childDepartmentType') || 'Child type')}
                        </InputLabel>
                        <Select
                            value={selectedChildId}
                            label={cfl(getString('childDepartmentType') || 'Child type')}
                            onChange={(e) => setSelectedChildId(e.target.value as number)}
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
                <Button variant="outlined" onClick={handleClose} disabled={createLinkMutation.isPending}>
                    {getString('cancel') || 'Cancel'}
                </Button>
                <Button
                    variant="contained"
                    onClick={handleConfirm}
                    disabled={
                        selectedChildId === '' ||
                        available.length === 0 ||
                        createLinkMutation.isPending
                    }
                    startIcon={
                        createLinkMutation.isPending ? (
                            <CircularProgress size={16} color="inherit" />
                        ) : undefined
                    }
                >
                    {getString('addLink') || 'Add link'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
