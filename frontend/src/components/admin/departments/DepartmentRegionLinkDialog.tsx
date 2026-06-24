// src/components/admin/departments/DepartmentRegionLinkDialog.tsx
import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography,
    CircularProgress,
    Chip,
    Divider,
} from '@mui/material';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import { useQuery } from '@tanstack/react-query';
import type { DepartmentNode } from './departmentApi';
import { fetchRegions } from '../regions/regionApi';
import type { DepartmentRegionLink } from './departmentRegionLinkApi';
import { useDepartmentRegionLinkMutations } from './useDepartmentRegionLinkMutations';
import { REGION_QK } from '../../../utils/queryKeys.ts';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';
import type { SnackbarType } from '../../../types/types.ts';

interface Props {
    node: DepartmentNode | null;
    /** Existing link for this department, if any. */
    currentLink: DepartmentRegionLink | null;
    onClose: () => void;
    setSnackbar: (s: SnackbarType) => void;
}

export function DepartmentRegionLinkDialog({ node, currentLink, onClose, setSnackbar }: Props) {
    const getString = useString({ str });
    const [regionId, setRegionId] = useState<number | ''>('');

    const { data: regions = [], isLoading: regionsLoading } = useQuery({
        queryKey: REGION_QK,
        queryFn: () => fetchRegions({ is_active: true }),
        staleTime: 5 * 60 * 1000,
        enabled: !!node,
    });

    useEffect(() => {
        setRegionId(currentLink?.region_id ?? '');
    }, [currentLink, node]);

    const { createMutation, updateMutation, deleteMutation } = useDepartmentRegionLinkMutations({
        setSnackbar,
        onCreateSuccess: onClose,
        onUpdateSuccess: onClose,
        onDeleteSuccess: onClose,
    });

    const isPending =
        createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

    const handleSave = () => {
        if (!node || regionId === '') return;
        if (currentLink) {
            if (currentLink.region_id === regionId) {
                onClose();
                return;
            }
            updateMutation.mutate({ id: currentLink.id, data: { region_id: Number(regionId) } });
        } else {
            createMutation.mutate({
                department_id: node.id,
                region_id: Number(regionId),
                is_active: true,
            });
        }
    };

    const handleUnlink = () => {
        if (!currentLink) return;
        deleteMutation.mutate(currentLink.id);
    };

    return (
        <Dialog open={!!node} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>{cfl(getString('assignRegion')) || 'Assign Region'}</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    {node && (
                        <Typography variant="body2" color="text.secondary">
                            {getString('department') || 'Department'}: <strong>{node.name}</strong>
                        </Typography>
                    )}

                    {currentLink?.region && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                                {getString('currentRegion') || 'Current region'}:
                            </Typography>
                            <Chip size="small" color="primary" label={currentLink.region.name} />
                        </Box>
                    )}

                    <Divider />

                    <FormControl fullWidth size="small" disabled={regionsLoading || isPending}>
                        <InputLabel>{cfl(getString('region')) || 'Region'}</InputLabel>
                        <Select
                            label={cfl(getString('region')) || 'Region'}
                            value={regionId === '' ? '' : String(regionId)}
                            onChange={(e) => setRegionId(Number(e.target.value))}
                        >
                            {regions.map((r) => (
                                <MenuItem key={r.id} value={r.id}>
                                    {r.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Typography variant="caption" color="text.disabled">
                        {getString('regionCategoryHint') ||
                            'Only departments of category board, store or directorate can have a region.'}
                    </Typography>
                </Box>
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'space-between' }}>
                <Box>
                    {currentLink && (
                        <Button
                            color="error"
                            startIcon={<LinkOffIcon />}
                            onClick={handleUnlink}
                            disabled={isPending}
                        >
                            {getString('unlink') || 'Unlink'}
                        </Button>
                    )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button variant="outlined" onClick={onClose} disabled={isPending}>
                        {getString('cancel') || 'Cancel'}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSave}
                        disabled={isPending || regionId === ''}
                        startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
                    >
                        {getString('save') || 'Save'}
                    </Button>
                </Box>
            </DialogActions>
        </Dialog>
    );
}
