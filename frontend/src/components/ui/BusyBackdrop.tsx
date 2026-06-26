import { Backdrop, CircularProgress, Typography } from '@mui/material';

/**
 * Full-viewport blocking overlay. MUI's Backdrop is `position: fixed; inset: 0`,
 * so a single instance rendered anywhere covers the whole window and intercepts
 * every click — used while a long server-side build runs so the user can't fire
 * other operations meanwhile.
 */
export default function BusyBackdrop({ open, label }: { open: boolean; label?: string }) {
    return (
        <Backdrop
            open={open}
            sx={{
                zIndex: (theme) => theme.zIndex.modal + 1,
                color: '#fff',
                flexDirection: 'column',
                gap: 2,
            }}
        >
            <CircularProgress color="inherit" />
            {label && <Typography sx={{ fontWeight: 600 }}>{label}</Typography>}
        </Backdrop>
    );
}
