import { useState } from 'react';
import {
    Box,
    Typography,
    Button,
    LinearProgress,
    Alert,
    Paper,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useTheme } from '../theme/ThemeContext';

const BASE_URL = 'http://127.0.0.1:8004';

type State = 'idle' | 'running' | 'done' | 'error';

export function TestProcessCard() {
    const { t } = useTheme();
    const [state, setState] = useState<State>('idle');
    const [error, setError] = useState('');

    const handleTrigger = async () => {
        setState('running');
        setError('');
        try {
            const res = await fetch(`${BASE_URL}/api/v1/notifications/trigger_process?user_code=UKR7101004`, {
                method: 'POST',
            });
            if (!res.ok) throw new Error(await res.text());
            setState('done');
            setTimeout(() => setState('idle'), 8000);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : String(e));
            setState('error');
        }
    };

    return (
        <Paper
            elevation={0}
            sx={{
                border: `1px solid ${t.borderLight}`,
                borderRadius: '12px',
                background: t.cardBg,
                p: 3,
                mt: 3,
            }}
        >
            <Typography fontWeight={700} fontSize={15} color={t.text} mb={0.5}>
                RabbitMQ Test
            </Typography>
            <Typography fontSize={13} color={t.textMuted} mb={2}>
                Triggers a ~7 s background process. When it finishes you'll receive a notification via RabbitMQ and an email to andrey.bakulin@gmail.com.
            </Typography>

            {state === 'running' && (
                <Box mb={2}>
                    <LinearProgress sx={{ borderRadius: 4, mb: 1 }} />
                    <Typography fontSize={12} color={t.textMuted}>
                        Process running… watch the 🔔 bell for the notification
                    </Typography>
                </Box>
            )}

            {state === 'done' && (
                <Alert
                    icon={<CheckCircleIcon fontSize="small" />}
                    severity="success"
                    sx={{ mb: 2, borderRadius: '8px', fontSize: 13 }}
                >
                    Process started successfully — notification will arrive in ~7 s
                </Alert>
            )}

            {state === 'error' && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: '8px', fontSize: 13 }}>
                    {error}
                </Alert>
            )}

            <Button
                variant="contained"
                startIcon={<PlayArrowIcon />}
                onClick={handleTrigger}
                disabled={state === 'running'}
                sx={{
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: 13,
                    background: t.accent,
                    '&:hover': { background: t.accent, opacity: 0.88 },
                    '&:disabled': { opacity: 0.5 },
                }}
            >
                {state === 'running' ? 'Running…' : 'Trigger heavy process'}
            </Button>
        </Paper>
    );
}
