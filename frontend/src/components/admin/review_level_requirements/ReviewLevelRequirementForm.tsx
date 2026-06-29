import { useEffect, useMemo, useState } from 'react';
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
import { useTranslationsStore } from '../../../store/useTranslationsStore';
import { slugifyKey, uniqueKey } from '../../../utils/keySlug';
import type { GetStringFn } from '../../../types/getStringFn';
import type { ReviewLevel } from '../review_levels/reviewLevelApi';
import type {
    ReviewLevelRequirementCreate,
    ReviewLevelRequirementUpdate,
    ReviewLevelRequirement,
    MutationResponse,
} from './reviewLevelRequirementApi';

interface Props {
    open: boolean;
    onClose: () => void;
    levels: ReviewLevel[];
    defaultLevelId: number | '';
    /** When set, the dialog edits this row; otherwise it creates a new one. */
    editing?: ReviewLevelRequirement | null;
    createMutation: UseMutationResult<
        MutationResponse<ReviewLevelRequirement>,
        Error,
        ReviewLevelRequirementCreate
    >;
    updateMutation: UseMutationResult<
        MutationResponse<ReviewLevelRequirement>,
        Error,
        { id: number; data: ReviewLevelRequirementUpdate }
    >;
}

export function ReviewLevelRequirementForm({
    open,
    onClose,
    levels,
    defaultLevelId,
    editing,
    createMutation,
    updateMutation,
}: Props) {
    const getString: GetStringFn = useString();
    const strings = useTranslationsStore((s) => s.strings);
    const [levelId, setLevelId] = useState<number | ''>(defaultLevelId);
    const [textKey, setTextKey] = useState('');
    const [textEng, setTextEng] = useState('');
    const [textUkr, setTextUkr] = useState('');
    // Whether the admin hand-edited the key (stops auto-derivation from the EN text).
    const [keyTouched, setKeyTouched] = useState(false);
    const [sortOrder, setSortOrder] = useState('0');
    const [isActive, setIsActive] = useState(true);

    const isEdit = !!editing;

    // Sync the form to its props each time the dialog opens / the edited row changes
    // (the standard reset-on-open pattern used by the other admin forms).
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!open) return;
        setLevelId(editing?.level_id ?? defaultLevelId);
        setTextKey(editing?.text_key ?? '');
        setTextEng('');
        setTextUkr('');
        setKeyTouched(!!editing);
        setSortOrder(String(editing?.sort_order ?? 0));
        setIsActive(editing?.is_active ?? true);
    }, [open, editing, defaultLevelId]);
    /* eslint-enable react-hooks/set-state-in-effect */

    // Auto-derive a meaning-based, collision-free key from the EN text (derived, not
    // stored, so it can't cascade renders). Once the admin edits the key, their value
    // (in textKey) wins.
    const keyExists = useMemo(() => (k: string) => !!strings?.[k], [strings]);
    const derivedKey = useMemo(() => {
        const base = slugifyKey('reviewLevelReq_', textEng.trim());
        return base === 'reviewLevelReq_' ? '' : uniqueKey(base, keyExists);
    }, [textEng, keyExists]);
    const effectiveKey = keyTouched ? textKey : derivedKey;

    const pending = createMutation.isPending || updateMutation.isPending;

    const handleSubmit = () => {
        if (levelId === '') return;
        if (isEdit && editing) {
            updateMutation.mutate({
                id: editing.id,
                data: {
                    level_id: levelId,
                    text_key: effectiveKey.trim(),
                    sort_order: Number(sortOrder) || 0,
                    is_active: isActive,
                },
            });
        } else {
            createMutation.mutate({
                level_id: levelId,
                text_key: effectiveKey.trim(),
                sort_order: Number(sortOrder) || 0,
                is_active: isActive,
                text_eng: textEng.trim(),
                text_ukr: textUkr.trim(),
            });
        }
    };

    const createValid = !isEdit && !!textEng.trim() && !!textUkr.trim() && !!effectiveKey.trim();
    const editValid = isEdit && !!effectiveKey.trim();
    const canSubmit = levelId !== '' && (createValid || editValid) && !pending;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {getString(isEdit ? 'editReviewLevelRequirement' : 'addReviewLevelRequirement')}
            </DialogTitle>
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

                    {!isEdit && (
                        <>
                            <TextField
                                label={getString('textEng')}
                                value={textEng}
                                onChange={(e) => setTextEng(e.target.value)}
                                fullWidth
                                multiline
                                required
                            />
                            <TextField
                                label={getString('textUkr')}
                                value={textUkr}
                                onChange={(e) => setTextUkr(e.target.value)}
                                fullWidth
                                multiline
                                required
                            />
                        </>
                    )}

                    <TextField
                        label={getString('textKeyCol')}
                        value={effectiveKey}
                        onChange={(e) => {
                            setKeyTouched(true);
                            setTextKey(e.target.value);
                        }}
                        fullWidth
                        required
                        helperText={isEdit ? undefined : getString('keyAutoFromTextHint')}
                    />
                    <TextField
                        label={getString('sortOrderCol')}
                        type="number"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        fullWidth
                    />
                    <FormControlLabel
                        control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
                        label={getString('isActiveCol')}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{getString('cancel')}</Button>
                <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit}>
                    {pending ? getString('saving') : getString(isEdit ? 'save' : 'create')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
