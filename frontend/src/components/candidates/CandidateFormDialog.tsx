import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import useString from '../../hooks/useString';
import { snakeToCamel } from '../../utils/helpers.ts';
import { CANDIDATE_SOURCE_QK } from '../../utils/queryKeys';
import {
    fetchCandidateSources,
    type Candidate,
    type CandidateCreate,
    type CandidateUpdate,
    type MutationResponse,
} from './candidateApi';

type CreateMutation = UseMutationResult<MutationResponse<Candidate>, Error, CandidateCreate>;
type UpdateMutation = UseMutationResult<
    MutationResponse<Candidate>,
    Error,
    { id: number; data: CandidateUpdate }
>;

interface Props {
    open: boolean;
    onClose: () => void;
    createMutation: CreateMutation;
    updateMutation: UpdateMutation;
    editing?: Candidate | null;
}

// Inner form mounts fresh each time the dialog opens, so useState initializers
// provide the reset / prefill — no setState-in-effect needed.
function CandidateForm({ onClose, createMutation, updateMutation, editing }: Omit<Props, 'open'>) {
    const getString = useString();
    const [firstName, setFirstName] = useState(editing?.first_name ?? '');
    const [lastName, setLastName] = useState(editing?.last_name ?? '');
    const [email, setEmail] = useState(editing?.email ?? '');
    const [sourceId, setSourceId] = useState<number | ''>(editing?.source_id ?? '');
    const [phones, setPhones] = useState<string[]>(
        editing && editing.phones.length ? editing.phones.map((p) => p.phone) : [''],
    );

    const { data: sources = [] } = useQuery({
        queryKey: CANDIDATE_SOURCE_QK,
        queryFn: fetchCandidateSources,
    });

    const sourceLabel = (key: string) => getString(snakeToCamel(key)) || key;

    const setPhoneAt = (i: number, value: string) =>
        setPhones((prev) => prev.map((p, idx) => (idx === i ? value : p)));
    const addPhone = () => setPhones((prev) => [...prev, '']);
    const removePhone = (i: number) => setPhones((prev) => prev.filter((_, idx) => idx !== i));

    const isPending = createMutation.isPending || updateMutation.isPending;
    const canSubmit = firstName.trim() !== '' && lastName.trim() !== '' && !isPending;

    const handleSubmit = () => {
        const cleanPhones = phones.map((p) => p.trim()).filter((p) => p !== '');
        const base = {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            email: email.trim() || null,
            source_id: sourceId === '' ? null : sourceId,
        };
        if (editing) {
            updateMutation.mutate({ id: editing.id, data: { ...base, phones: cleanPhones } });
        } else {
            createMutation.mutate({ ...base, phones: cleanPhones });
        }
    };

    return (
        <>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <Stack direction="row" spacing={2}>
                        <TextField
                            label={getString('firstName') || 'First name'}
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            fullWidth
                            required
                        />
                        <TextField
                            label={getString('lastName') || 'Last name'}
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            fullWidth
                            required
                        />
                    </Stack>
                    <TextField
                        label={getString('email') || 'Email'}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        fullWidth
                        type="email"
                    />
                    <TextField
                        select
                        variant="outlined"
                        label={getString('source') || 'Source'}
                        value={sourceId}
                        onChange={(e) => setSourceId(e.target.value === '' ? '' : Number(e.target.value))}
                        fullWidth
                    >
                        <MenuItem value="">
                            <em>{getString('noSource') || 'No source'}</em>
                        </MenuItem>
                        {sources.map((s) => (
                            <MenuItem key={s.id} value={s.id}>
                                {sourceLabel(s.key)}
                            </MenuItem>
                        ))}
                    </TextField>

                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            {getString('phones') || 'Phones'}
                        </Typography>
                        <Stack spacing={1}>
                            {phones.map((phone, i) => (
                                <Stack direction="row" spacing={1} alignItems="center" key={i}>
                                    <TextField
                                        value={phone}
                                        onChange={(e) => setPhoneAt(i, e.target.value)}
                                        placeholder="+380 XX XXX XX XX"
                                        type="tel"
                                        size="small"
                                        fullWidth
                                    />
                                    <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => removePhone(i)}
                                        disabled={phones.length === 1}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Stack>
                            ))}
                            <Box>
                                <Button size="small" startIcon={<AddIcon />} onClick={addPhone}>
                                    {getString('addPhone') || 'Add phone'}
                                </Button>
                            </Box>
                        </Stack>
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{getString('cancel') || 'Cancel'}</Button>
                <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit}>
                    {isPending
                        ? getString('saving') || 'Saving…'
                        : editing
                          ? getString('save') || 'Save'
                          : getString('create') || 'Create'}
                </Button>
            </DialogActions>
        </>
    );
}

export function CandidateFormDialog({ open, onClose, createMutation, updateMutation, editing }: Props) {
    const getString = useString();
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {editing
                    ? getString('editCandidate') || 'Edit candidate'
                    : getString('createCandidate') || 'New candidate'}
            </DialogTitle>
            {open && (
                <CandidateForm
                    onClose={onClose}
                    createMutation={createMutation}
                    updateMutation={updateMutation}
                    editing={editing}
                />
            )}
        </Dialog>
    );
}
