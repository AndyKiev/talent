import { useMemo, useState } from 'react';
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
import useString from '../../../hooks/useString';
import { useTranslationsStore } from '../../../store/useTranslationsStore';
import { slugifyKey, uniqueKey } from '../../../utils/keySlug';
import type {
    ReviewLevelCreate,
    ReviewLevelUpdate,
    ReviewLevel,
    MutationResponse,
} from './reviewLevelApi';

interface Props {
    open: boolean;
    onClose: () => void;
    /** When set, the dialog edits this row; otherwise it creates a new one. */
    editing?: ReviewLevel | null;
    createMutation: UseMutationResult<MutationResponse<ReviewLevel>, Error, ReviewLevelCreate>;
    updateMutation: UseMutationResult<
        MutationResponse<ReviewLevel>,
        Error,
        { id: number; data: ReviewLevelUpdate }
    >;
}

// The body mounts fresh per open (MUI unmounts Dialog children when closed)
// and per edited row (key) — every useState initializes straight from
// `editing`, so no reset-on-open effect is needed.
export function ReviewLevelForm({ open, onClose, editing, createMutation, updateMutation }: Props) {
    const getString = useString();
    const isEdit = !!editing;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{getString(isEdit ? 'editReviewLevel' : 'addReviewLevel')}</DialogTitle>
            <ReviewLevelFormBody
                key={editing?.id ?? 'new'}
                onClose={onClose}
                editing={editing}
                createMutation={createMutation}
                updateMutation={updateMutation}
            />
        </Dialog>
    );
}

function ReviewLevelFormBody({ onClose, editing, createMutation, updateMutation }: Omit<Props, 'open'>) {
    const getString = useString();
    const strings = useTranslationsStore((s) => s.strings);
    const [nameKey, setNameKey] = useState(editing?.name_key ?? '');
    const [nameEng, setNameEng] = useState('');
    const [nameUkr, setNameUkr] = useState('');
    const [nameKeyTouched, setNameKeyTouched] = useState(!!editing);
    const [descKey, setDescKey] = useState(editing?.description_key ?? '');
    const [descEng, setDescEng] = useState('');
    const [descUkr, setDescUkr] = useState('');
    const [descKeyTouched, setDescKeyTouched] = useState(!!editing);
    const [sortOrder, setSortOrder] = useState(String(editing?.sort_order ?? 0));
    const [isActive, setIsActive] = useState(editing?.is_active ?? true);

    const isEdit = !!editing;

    const keyExists = useMemo(() => (k: string) => !!strings?.[k], [strings]);

    // Auto-derive collision-free keys from the EN text (derived, not stored — avoids
    // cascading-render setState in an effect). The admin's manual edit wins once made.
    const derivedNameKey = useMemo(() => {
        const base = slugifyKey('reviewLevelName_', nameEng.trim());
        return base === 'reviewLevelName_' ? '' : uniqueKey(base, keyExists);
    }, [nameEng, keyExists]);
    const derivedDescKey = useMemo(() => {
        const base = slugifyKey('reviewLevelDesc_', descEng.trim());
        return base === 'reviewLevelDesc_' ? '' : uniqueKey(base, keyExists);
    }, [descEng, keyExists]);
    const effectiveNameKey = nameKeyTouched ? nameKey : derivedNameKey;
    const effectiveDescKey = descKeyTouched ? descKey : derivedDescKey;

    const pending = createMutation.isPending || updateMutation.isPending;

    const handleSubmit = () => {
        if (isEdit && editing) {
            updateMutation.mutate({
                id: editing.id,
                data: {
                    name_key: effectiveNameKey.trim(),
                    description_key: effectiveDescKey.trim() || null,
                    sort_order: Number(sortOrder) || 0,
                    is_active: isActive,
                },
            });
        } else {
            createMutation.mutate({
                name_key: effectiveNameKey.trim(),
                description_key: effectiveDescKey.trim() || null,
                sort_order: Number(sortOrder) || 0,
                is_active: isActive,
                name_eng: nameEng.trim(),
                name_ukr: nameUkr.trim(),
                description_eng: descEng.trim() || undefined,
                description_ukr: descUkr.trim() || undefined,
            });
        }
    };

    const createValid = !isEdit && !!nameEng.trim() && !!nameUkr.trim() && !!effectiveNameKey.trim();
    const editValid = isEdit && !!effectiveNameKey.trim();
    const canSubmit = (createValid || editValid) && !pending;

    return (
        <>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    {!isEdit && (
                        <>
                            <TextField
                                label={getString('nameEng')}
                                value={nameEng}
                                onChange={(e) => setNameEng(e.target.value)}
                                fullWidth
                                required
                                inputProps={{ name: 'nameEng' }}
                            />
                            <TextField
                                label={getString('nameUkr')}
                                value={nameUkr}
                                onChange={(e) => setNameUkr(e.target.value)}
                                fullWidth
                                required
                                inputProps={{ name: 'nameUkr' }}
                            />
                        </>
                    )}
                    <TextField
                        label={getString('nameKeyCol')}
                        value={effectiveNameKey}
                        onChange={(e) => {
                            setNameKeyTouched(true);
                            setNameKey(e.target.value);
                        }}
                        fullWidth
                        required
                        helperText={isEdit ? undefined : getString('keyAutoFromTextHint')}
                    />

                    {!isEdit && (
                        <>
                            <TextField
                                label={getString('descriptionEng')}
                                value={descEng}
                                onChange={(e) => setDescEng(e.target.value)}
                                fullWidth
                                multiline
                            />
                            <TextField
                                label={getString('descriptionUkr')}
                                value={descUkr}
                                onChange={(e) => setDescUkr(e.target.value)}
                                fullWidth
                                multiline
                            />
                        </>
                    )}
                    <TextField
                        label={getString('descriptionKeyCol')}
                        value={effectiveDescKey}
                        onChange={(e) => {
                            setDescKeyTouched(true);
                            setDescKey(e.target.value);
                        }}
                        fullWidth
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
        </>
    );
}
