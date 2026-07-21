import { useState } from 'react';
import {
    Box,
    Button,
    Divider,
    Drawer,
    IconButton,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import dayjs from 'dayjs';
import type { Mission, MissionComment } from './missionApi';
import { formatMissionDate } from './missionHelpers';
import type { GetStringFn } from '../../types/getStringFn';
import { useAuthStore } from '../../store/authStore';

interface Props {
    open: boolean;
    mission: Mission | null;
    /** The employee themselves (or admin/dev) — missions are read-only to them,
     *  but commenting is their write surface. */
    canAuthor: boolean;
    getString: GetStringFn;
    onClose: () => void;
    onAdd: (text: string) => void;
    onDelete: (commentId: number) => void;
}

/** Comments on one mission, newest first (the server orders them). */
export function MissionCommentsDrawer({
    open,
    mission,
    canAuthor,
    getString,
    onClose,
    onAdd,
    onDelete,
}: Props) {
    const [text, setText] = useState('');
    const currentUserId = useAuthStore((s) => s.user?.id);

    const comments: MissionComment[] = mission?.comments ?? [];

    const submit = () => {
        const value = text.trim();
        if (!value) return;
        onAdd(value);
        setText('');
    };

    return (
        <Drawer anchor="right" open={open} onClose={onClose}>
            <Box sx={{ width: { xs: '100vw', sm: 420 }, p: 2 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="subtitle1" fontWeight={600}>
                        {getString('missionComments')}
                    </Typography>
                    <IconButton size="small" onClick={onClose}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Stack>

                {mission && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {mission.text}
                    </Typography>
                )}

                <Divider sx={{ my: 2 }} />

                {comments.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                        {getString('noMissionComments')}
                    </Typography>
                ) : (
                    <Stack spacing={1.5}>
                        {comments.map((c) => (
                            <Box key={c.id}>
                                <Stack direction="row" alignItems="flex-start" spacing={1}>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            {c.author_name ?? ''} ·{' '}
                                            {formatMissionDate(dayjs(c.created_at).format('YYYY-MM-DD'))}
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                                        >
                                            {c.text}
                                        </Typography>
                                    </Box>
                                    {/* Deleting is the author's own right (admins pass the
                                        same check server-side). */}
                                    {c.author_employee_id === currentUserId && (
                                        <Tooltip title={getString('delete')}>
                                            <IconButton size="small" onClick={() => onDelete(c.id)}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                </Stack>
                            </Box>
                        ))}
                    </Stack>
                )}

                {canAuthor && (
                    <Box sx={{ mt: 3 }}>
                        <TextField
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder={getString('missionCommentPlaceholder')}
                            multiline
                            minRows={3}
                            fullWidth
                        />
                        <Button
                            variant="contained"
                            size="small"
                            onClick={submit}
                            disabled={!text.trim()}
                            sx={{ textTransform: 'none', mt: 1 }}
                        >
                            {getString('addMissionComment')}
                        </Button>
                    </Box>
                )}
            </Box>
        </Drawer>
    );
}
