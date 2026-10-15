// src/components/admin/department_types/organigram/OrganigramDragOverlays.tsx
//
// The two fixed overlays shown while dragging in either editing mode:
//   - OrganigramUnlinkBay (bottom-left): drop here to remove the dragged
//     item's link;
//   - OrganigramDragHint (bottom-right): what the drop would do — never
//     obstructs the drag (pointer-events: none).
import { Box, Chip, Paper, Typography } from '@mui/material';
import LinkOffIcon from '@mui/icons-material/LinkOff';

export function OrganigramUnlinkBay({
    label,
    hovered,
    onHover,
    onDrop,
}: {
    label: string;
    hovered: boolean;
    onHover: (hovered: boolean) => void;
    onDrop: () => void;
}) {
    return (
        <Paper
            elevation={6}
            onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (!hovered) onHover(true);
            }}
            onDragLeave={() => onHover(false)}
            onDrop={(e) => {
                e.preventDefault();
                onDrop();
            }}
            sx={{
                position: 'fixed',
                bottom: 16,
                left: 16,
                zIndex: (theme) => theme.zIndex.snackbar,
                p: 1.5,
                maxWidth: 280,
                border: '2px dashed',
                borderColor: hovered ? 'warning.main' : 'divider',
                bgcolor: hovered ? 'action.hover' : 'background.paper',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
            }}
        >
            <LinkOffIcon fontSize="small" color={hovered ? 'warning' : 'action'} />
            <Typography variant="body2">{label}</Typography>
        </Paper>
    );
}

export function OrganigramDragHint({
    title,
    action,
    actionColor,
    text,
    muted,
}: {
    title: string;
    /** Resolved action label (move / add / unlink) or null while idle. */
    action: string | null;
    actionColor: 'info' | 'success' | 'warning';
    text: string;
    muted: boolean;
}) {
    return (
        <Paper
            elevation={6}
            sx={{
                position: 'fixed',
                bottom: 16,
                right: 16,
                zIndex: (theme) => theme.zIndex.snackbar,
                p: 1.5,
                maxWidth: 320,
                pointerEvents: 'none',
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>
                    {title}
                </Typography>
                {action && <Chip size="small" label={action} color={actionColor} />}
            </Box>
            <Typography variant="body2" color={muted ? 'text.secondary' : 'text.primary'}>
                {text}
            </Typography>
        </Paper>
    );
}
