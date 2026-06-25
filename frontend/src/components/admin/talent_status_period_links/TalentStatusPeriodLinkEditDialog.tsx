// src/components/admin/talent-status-period-links/TalentStatusPeriodLinkEditDialog.tsx
//
// Shown when the user toggles is_active on a row — asks for confirmation
// before the mutation fires.

import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    CircularProgress,
    Divider,
} from '@mui/material';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';

export interface PendingToggle {
    id: number;
    /** Human-readable description of what's changing, e.g. "Activate link?" */
    fieldLabel: string;
    field: 'is_active';
    newValue: boolean;
    oldValue: boolean;
}

interface Props {
    pending: PendingToggle | null;
    isPending: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function TalentStatusPeriodLinkEditDialog({
                                                     pending,
                                                     isPending,
                                                     onConfirm,
                                                     onCancel,
                                                 }: Props) {
    const getString = useString({ str });

    return (
        <Dialog open={!!pending} onClose={onCancel} maxWidth="xs" fullWidth>
            <DialogTitle>{getString('confirmEdit') || 'Confirm Edit'}</DialogTitle>
            <DialogContent>
                {pending && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Typography variant="body2" color="text.secondary">
                            {getString('youAreAboutToChange') || 'You are about to change:'}
                        </Typography>
                        <Divider />
                        <Box>
                            <Typography variant="caption" color="text.secondary">
                                {pending.fieldLabel}
                            </Typography>
                            <Box
                                sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}
                            >
                                <Typography
                                    variant="body2"
                                    sx={{
                                        textDecoration: 'line-through',
                                        color: 'text.disabled',
                                        fontFamily: 'monospace',
                                    }}
                                >
                                    {String(pending.oldValue)}
                                </Typography>
                                <Typography variant="body2" color="text.disabled">
                                    →
                                </Typography>
                                <Typography
                                    variant="body2"
                                    fontWeight={600}
                                    sx={{ fontFamily: 'monospace', color: 'primary.main' }}
                                >
                                    {String(pending.newValue)}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={onCancel} disabled={isPending}>
                    {getString('cancel') || 'Cancel'}
                </Button>
                <Button
                    variant="contained"
                    onClick={onConfirm}
                    disabled={isPending}
                    startIcon={
                        isPending ? <CircularProgress size={16} color="inherit" /> : undefined
                    }
                >
                    {getString('confirm') || 'Confirm'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}