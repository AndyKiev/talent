import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Badge,
    IconButton,
    Tooltip,
    Popover,
    Box,
    Typography,
    List,
    ListItem,
    ListItemText,
    Divider,
    CircularProgress,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { useTheme } from '../theme/ThemeContext';
import { useAuthStore } from '../../store/authStore';

interface Notification {
    id: string;
    user_code: string;
    message: string;
    is_read: boolean;
    created_at: string;
}

const BASE_URL = 'http://127.0.0.1:8004';

export function NotificationBell() {
    const { t } = useTheme();
    const { user } = useAuthStore();
    const userCode = user?.code ?? 'UKR7101004';

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
    const [marking, setMarking] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    // Prevent double-connect in React 18 StrictMode (effect fires twice in dev)
    const activeRef = useRef(false);

    const connect = useCallback(() => {
        if (!activeRef.current) return;

        const ws = new WebSocket(`ws://127.0.0.1:8004/api/v1/notifications/ws/${userCode}`);
        wsRef.current = ws;

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'init') {
                setNotifications(data.notifications ?? []);
            } else if (data.id) {
                // deduplicate by id in case of any duplicate delivery
                setNotifications(prev =>
                    prev.some(n => n.id === data.id) ? prev : [data, ...prev]
                );
            }
        };

        ws.onclose = () => {
            if (activeRef.current) {
                setTimeout(connect, 3000);
            }
        };

        ws.onerror = () => {
            ws.close();
        };
    }, [userCode]);

    useEffect(() => {
        activeRef.current = true;
        connect();
        return () => {
            activeRef.current = false;
            wsRef.current?.close();
        };
    }, [connect]);

    const unread = notifications.filter(n => !n.is_read).length;
    const open = Boolean(anchorEl);

    const handleMarkRead = async (id: string) => {
        await fetch(`${BASE_URL}/api/v1/notifications/${id}/read?user_code=${userCode}`, { method: 'PATCH' });
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    };

    const handleMarkAllRead = async () => {
        setMarking(true);
        await fetch(`${BASE_URL}/api/v1/notifications/read_all/all?user_code=${userCode}`, { method: 'PATCH' });
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setMarking(false);
    };

    const handleDeleteOne = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        await fetch(`${BASE_URL}/api/v1/notifications/${id}?user_code=${userCode}`, { method: 'DELETE' });
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const handleDeleteAll = async () => {
        await fetch(`${BASE_URL}/api/v1/notifications?user_code=${userCode}`, { method: 'DELETE' });
        setNotifications([]);
    };

    return (
        <>
            <Tooltip title="Notifications">
                <IconButton
                    size="small"
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    sx={{
                        color: t.textMuted,
                        '&:hover': { color: t.text, background: `${t.text}10` },
                        borderRadius: '8px',
                    }}
                >
                    <Badge badgeContent={unread} color="error" max={99}>
                        <NotificationsIcon fontSize="small" />
                    </Badge>
                </IconButton>
            </Tooltip>

            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                PaperProps={{
                    sx: {
                        width: 380,
                        maxHeight: 500,
                        background: t.cardBg,
                        border: `1px solid ${t.borderLight}`,
                        borderRadius: '12px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                        display: 'flex',
                        flexDirection: 'column',
                    },
                }}
            >
                {/* Header */}
                <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography fontWeight={700} fontSize={14} color={t.text} flex={1}>
                        Notifications {unread > 0 && `(${unread} unread)`}
                    </Typography>

                    {unread > 0 && (
                        <Tooltip title="Mark all read">
                            <IconButton
                                size="small"
                                onClick={handleMarkAllRead}
                                disabled={marking}
                                sx={{ color: t.accent, borderRadius: '6px' }}
                            >
                                {marking ? <CircularProgress size={14} /> : <DoneAllIcon fontSize="small" />}
                            </IconButton>
                        </Tooltip>
                    )}

                    {notifications.length > 0 && (
                        <Tooltip title="Delete all">
                            <IconButton
                                size="small"
                                onClick={handleDeleteAll}
                                sx={{ color: t.textMuted, '&:hover': { color: '#e53935' }, borderRadius: '6px' }}
                            >
                                <DeleteSweepIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
                <Divider sx={{ borderColor: t.borderLight }} />

                {/* List */}
                <Box sx={{ overflowY: 'auto', flex: 1 }}>
                    {notifications.length === 0 ? (
                        <Box sx={{ py: 4, textAlign: 'center' }}>
                            <Typography fontSize={13} color={t.textMuted}>No notifications</Typography>
                        </Box>
                    ) : (
                        <List disablePadding>
                            {notifications.map((n, idx) => (
                                <Box key={n.id}>
                                    <ListItem
                                        alignItems="flex-start"
                                        secondaryAction={
                                            <Tooltip title="Delete">
                                                <IconButton
                                                    edge="end"
                                                    size="small"
                                                    onClick={(e) => handleDeleteOne(e, n.id)}
                                                    sx={{
                                                        color: t.textMuted,
                                                        '&:hover': { color: '#e53935' },
                                                        borderRadius: '6px',
                                                    }}
                                                >
                                                    <DeleteIcon sx={{ fontSize: 15 }} />
                                                </IconButton>
                                            </Tooltip>
                                        }
                                        sx={{
                                            px: 2,
                                            py: 1.2,
                                            pr: 6,
                                            background: n.is_read ? 'transparent' : `${t.accent}0d`,
                                            cursor: n.is_read ? 'default' : 'pointer',
                                            '&:hover': { background: `${t.accent}14` },
                                            transition: 'background 0.15s',
                                        }}
                                        onClick={() => !n.is_read && handleMarkRead(n.id)}
                                    >
                                        <ListItemText
                                            primary={
                                                <Typography
                                                    fontSize={13}
                                                    fontWeight={n.is_read ? 400 : 600}
                                                    color={t.text}
                                                >
                                                    {n.message}
                                                </Typography>
                                            }
                                            secondary={
                                                <Typography fontSize={11} color={t.textMuted} mt={0.3}>
                                                    {new Date(n.created_at).toLocaleString()}
                                                    {!n.is_read && (
                                                        <Box
                                                            component="span"
                                                            sx={{
                                                                ml: 1,
                                                                display: 'inline-block',
                                                                width: 6,
                                                                height: 6,
                                                                borderRadius: '50%',
                                                                background: t.accent,
                                                                verticalAlign: 'middle',
                                                            }}
                                                        />
                                                    )}
                                                </Typography>
                                            }
                                        />
                                    </ListItem>
                                    {idx < notifications.length - 1 && (
                                        <Divider sx={{ borderColor: t.borderLight, mx: 2 }} />
                                    )}
                                </Box>
                            ))}
                        </List>
                    )}
                </Box>
            </Popover>
        </>
    );
}
