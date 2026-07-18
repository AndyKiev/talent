import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Stack,
} from '@mui/material';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';
import { patchEmployeePersonalData, type MaritalStatus } from '../peopleReviewApi';
import { PersonSex, sexKeySuffix, sexShortLabelKey } from '../../admin/persons/personApi';
import type { GetStringFn } from '../../../types/getStringFn';
import { useTheme } from '../../theme/ThemeContext';
import { FactItem } from '../evaluation/FactItem';

// The marital-status word is sex-dependent (заміжня/незаміжня vs одружений/неодружений).
const maritalWordKey = (sex: PersonSex, marital: MaritalStatus): string => {
    const suffix = sexKeySuffix(sex);
    return marital === 'married' ? `maritalMarried${suffix}` : `maritalNotMarried${suffix}`;
};

/**
 * Sex + marital status, displayed compactly as "жін · заміжня" (sex tag +
 * sex-correct marital word). Self-contained: patches the personal-data table
 * and invalidates the personal-data query. Editing is gated by isEditable.
 */
export default function MaritalStatusBlock({
    employeeId,
    sex,
    maritalStatus,
    isEditable,
    getString,
    onError,
    onSaved,
}: {
    employeeId: number;
    sex: PersonSex | null;
    maritalStatus: MaritalStatus | null;
    isEditable: boolean;
    getString: GetStringFn;
    onError?: (message: string) => void;
    // Called after a successful save so the parent can refresh its source (the
    // personal-data facts live on the people-review RSE detail).
    onSaved?: () => Promise<void> | void;
}) {
    const { t } = useTheme();
    const [open, setOpen] = useState(false);
    const [draftSex, setDraftSex] = useState<PersonSex | ''>('');
    const [draftMarital, setDraftMarital] = useState<MaritalStatus | ''>('');

    // Seed the draft from the current values when opening the dialog (in the
    // event handler, not an effect — avoids cascading-render lint/perf issues).
    const openDialog = () => {
        setDraftSex(sex ?? '');
        setDraftMarital(maritalStatus ?? '');
        setOpen(true);
    };

    const mut = useMutation({
        mutationFn: () =>
            patchEmployeePersonalData(employeeId, {
                sex: draftSex || null,
                marital_status: draftMarital || null,
            }),
        onSuccess: async () => {
            await onSaved?.();
            setOpen(false);
        },
        onError: (err: Error) => onError?.(err.message),
    });

    // Collapsed display: "жін · заміжня" — sex short tag + sex-correct marital word.
    const sexShort = sex ? getString(sexShortLabelKey(sex)) : null;
    const maritalWord = sex && maritalStatus ? getString(maritalWordKey(sex, maritalStatus)) : null;
    const display = [sexShort, maritalWord].filter(Boolean).join(' · ');

    // Nothing set and read-only → render nothing.
    if (!isEditable && !display) return null;

    return (
        <>
            <FactItem
                icon={<FavoriteBorderOutlinedIcon sx={{ fontSize: 18, color: t.textMuted }} />}
                label={getString('maritalStatus')}
                value={display || '—'}
                onEdit={isEditable ? openDialog : undefined}
                editTitle={getString('editMaritalStatus')}
            />

            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>{getString('editMaritalStatus')}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <FormControl size="small" fullWidth>
                            <InputLabel id="sex-label">{getString('sex')}</InputLabel>
                            <Select
                                variant="outlined"
                                labelId="sex-label"
                                label={getString('sex')}
                                value={draftSex}
                                onChange={(e) => setDraftSex(e.target.value as PersonSex)}
                            >
                                <MenuItem value={PersonSex.Male}>{getString('sexMale')}</MenuItem>
                                <MenuItem value={PersonSex.Female}>{getString('sexFemale')}</MenuItem>
                            </Select>
                        </FormControl>

                        {/* Marital options are worded per the chosen sex — pick sex first. */}
                        <FormControl size="small" fullWidth disabled={!draftSex}>
                            <InputLabel id="marital-label">{getString('maritalStatus')}</InputLabel>
                            <Select
                                variant="outlined"
                                labelId="marital-label"
                                label={getString('maritalStatus')}
                                value={draftMarital}
                                onChange={(e) => setDraftMarital(e.target.value as MaritalStatus)}
                            >
                                <MenuItem value="married">
                                    {draftSex ? getString(maritalWordKey(draftSex, 'married')) : ''}
                                </MenuItem>
                                <MenuItem value="not_married">
                                    {draftSex ? getString(maritalWordKey(draftSex, 'not_married')) : ''}
                                </MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)} disabled={mut.isPending}>
                        {getString('cancel')}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => mut.mutate()}
                        disabled={mut.isPending || !draftSex}
                    >
                        {getString('save')}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
