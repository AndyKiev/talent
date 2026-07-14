import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Avatar,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    Menu,
    MenuItem,
    Tooltip,
} from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import useString from '../../hooks/useString';
import { useEffectiveBooleanSetting } from '../../hooks/useAppSetting';
import {
    fetchEmployeePhotoBlob,
    uploadEmployeePhoto,
    deleteEmployeePhoto,
    PHOTO_ALLOWED_TYPES,
    PHOTO_MAX_BYTES,
    PHOTO_MAX_LABEL,
} from '../../api/employeePhotoApi';

// Which surface this avatar lives on — selects the per-surface child setting that
// gates its photo display. Each child is effective only when it AND the master
// `employee_photos_enabled` are on, so OFF here means: no circle, no read, no add.
export type EmployeePhotoScope = 'employeesMenu' | 'peopleReview' | 'reviewComments' | 'organigram';
const PHOTO_SCOPE_KEY: Record<EmployeePhotoScope, string> = {
    employeesMenu: 'employee_photos_employees_menu',
    peopleReview: 'employee_photos_people_review',
    reviewComments: 'employee_photos_review_comments',
    organigram: 'employee_photos_organigram',
};

/** Two-letter initials from a name ("Andrey Bakulin" -> "AB", single word -> first letter). */
function initialsOf(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
}

// Deterministic, pleasant circle colour derived from the name.
const AVATAR_COLORS = ['#5C6BC0', '#26A69A', '#7E57C2', '#EC407A', '#42A5F5', '#66BB6A', '#FF7043', '#AB47BC'];
function colorOf(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

interface Props {
    /** When set, the photo is fetched and (if editable) can be changed/removed. */
    employeeId?: number;
    name: string;
    /** Which surface this renders on — picks the per-surface photo-display flag. */
    scope: EmployeePhotoScope;
    /** Diameter in px (default 48). */
    size?: number;
    /** Show the change/remove affordances (gated by the caller, e.g. showEditing). */
    editable?: boolean;
    onError?: (message: string) => void;
    onSuccess?: (message: string) => void;
}

export default function EmployeeAvatar({
    employeeId,
    name,
    scope,
    size = 48,
    editable = false,
    onError,
    onSuccess,
}: Props) {
    const getString = useString();
    const qc = useQueryClient();
    const { enabled: photosEnabled } = useEffectiveBooleanSetting(PHOTO_SCOPE_KEY[scope]);
    const fileRef = useRef<HTMLInputElement>(null);
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [confirmRemove, setConfirmRemove] = useState(false);
    const [url, setUrl] = useState<string | null>(null);

    const { data: blob } = useQuery({
        queryKey: ['employee_photo', employeeId],
        queryFn: () => fetchEmployeePhotoBlob(employeeId!),
        enabled: !!employeeId && photosEnabled,
        staleTime: 60_000,
        retry: false,
    });

    // Manage the object URL lifecycle (revoke the previous one on change/unmount).
    useEffect(() => {
        if (!blob) {
            setUrl(null);
            return;
        }
        const u = URL.createObjectURL(blob);
        setUrl(u);
        return () => URL.revokeObjectURL(u);
    }, [blob]);

    const hasPhoto = !!url;

    const uploadMut = useMutation({
        mutationFn: (file: File) => uploadEmployeePhoto(employeeId!, file),
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: ['employee_photo', employeeId] });
            onSuccess?.(res.detail);
        },
        onError: (err: Error) => onError?.(err.message),
    });

    const deleteMut = useMutation({
        mutationFn: () => deleteEmployeePhoto(employeeId!),
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: ['employee_photo', employeeId] });
            setConfirmRemove(false);
            onSuccess?.(res.detail);
        },
        onError: (err: Error) => {
            setConfirmRemove(false);
            onError?.(err.message);
        },
    });

    const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // allow re-selecting the same file later
        if (!file) return;
        if (!PHOTO_ALLOWED_TYPES.includes(file.type)) {
            onError?.(getString('employeePhotoInvalidType'));
            return;
        }
        if (file.size > PHOTO_MAX_BYTES) {
            onError?.(getString('employeePhotoTooLarge', { max: PHOTO_MAX_LABEL }));
            return;
        }
        uploadMut.mutate(file);
    };

    const busy = uploadMut.isPending || deleteMut.isPending;

    // Feature OFF → render nothing anywhere (no circle placeholder, no read, no
    // add affordance). Placed after every hook so hook order stays stable.
    if (!photosEnabled) return null;

    const avatar = (
        <Avatar
            src={url ?? undefined}
            sx={{
                width: size,
                height: size,
                bgcolor: url ? undefined : colorOf(name),
                fontSize: size * 0.4,
                fontWeight: 700,
            }}
        >
            {!url && initialsOf(name)}
        </Avatar>
    );

    // Read-only (or no employee): just the avatar / initials.
    if (!editable || !employeeId) return avatar;

    return (
        <>
            <Box sx={{ position: 'relative', width: size, height: size }}>
                {avatar}
                {busy ? (
                    <CircularProgress
                        size={size * 0.5}
                        sx={{ position: 'absolute', top: size * 0.25, left: size * 0.25 }}
                    />
                ) : (
                    <Tooltip title={getString(hasPhoto ? 'changePhoto' : 'addPhoto')}>
                        <IconButton
                            size="small"
                            onClick={(e) => setMenuAnchor(e.currentTarget)}
                            sx={{
                                position: 'absolute',
                                bottom: -4,
                                right: -4,
                                p: 0.25,
                                bgcolor: 'background.paper',
                                border: '1px solid',
                                borderColor: 'divider',
                                '&:hover': { bgcolor: 'action.hover' },
                            }}
                        >
                            <PhotoCameraIcon sx={{ fontSize: size * 0.32 }} />
                        </IconButton>
                    </Tooltip>
                )}
            </Box>

            <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png"
                hidden
                onChange={handleFile}
            />

            <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
                <MenuItem
                    onClick={() => {
                        setMenuAnchor(null);
                        fileRef.current?.click();
                    }}
                >
                    {getString(hasPhoto ? 'changePhoto' : 'addPhoto')}
                </MenuItem>
                {hasPhoto && (
                    <MenuItem
                        onClick={() => {
                            setMenuAnchor(null);
                            setConfirmRemove(true);
                        }}
                    >
                        {getString('removePhoto')}
                    </MenuItem>
                )}
            </Menu>

            <Dialog open={confirmRemove} onClose={() => setConfirmRemove(false)} maxWidth="xs" fullWidth>
                <DialogTitle>{getString('confirmDelete')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{getString('confirmDeletePhotoMessage')}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmRemove(false)} disabled={deleteMut.isPending}>
                        {getString('cancel')}
                    </Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={() => deleteMut.mutate()}
                        disabled={deleteMut.isPending}
                    >
                        {getString('removePhoto')}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
