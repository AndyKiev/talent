import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    FormControlLabel,
    IconButton,
    MenuItem,
    Popover,
    Select,
    Stack,
    Switch,
    Tooltip,
    Typography,
} from '@mui/material';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import {
    fetchOversightManagerOptions,
    fetchMyOversightManager,
    setMyOversightManager,
    clearMyOversightManager,
    type OversightManagerOption,
} from './peopleReviewApi';
import {
    OVERSIGHT_MANAGER_OPTIONS_QK,
    MY_OVERSIGHT_MANAGER_QK,
} from '../../utils/queryKeys';
import { useTheme } from '../theme/useTheme';
import type { GetStringFn } from '../../types/getStringFn';

interface Props {
    // Editable only on the user's OWN open/editable record; otherwise read-only.
    editable: boolean;
    getString: GetStringFn;
    onSuccess?: (message: string) => void;
    onError?: (message: string) => void;
}

/**
 * Self-service "pick my oversight manager" control — a compact chip + gear in the
 * header that opens a settings popover (not a top banner). Lists the EXISTING
 * oversight reviewers (holders the admin already designated); the user can pick one
 * (replacing any prior pick) or disconnect the current one. Shown on own record only.
 */
export function OversightManagerPicker({ editable, getString, onSuccess, onError }: Props) {
    const qc = useQueryClient();
    const { t } = useTheme();
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const [shortList, setShortList] = useState(false);

    const { data: current } = useQuery({
        queryKey: MY_OVERSIGHT_MANAGER_QK,
        queryFn: fetchMyOversightManager,
        staleTime: 30_000,
    });

    // The candidate list is only needed once the popover is opened in edit mode.
    // When shortList is true, we fetch only managers from the user's department scope.
    const { data: options = [] } = useQuery({
        queryKey: [...OVERSIGHT_MANAGER_OPTIONS_QK, { short: shortList }],
        queryFn: () => fetchOversightManagerOptions(shortList),
        staleTime: 60_000,
        enabled: editable && !!anchor,
    });

    const setMut = useMutation({
        mutationFn: setMyOversightManager,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: MY_OVERSIGHT_MANAGER_QK });
            onSuccess?.(res.detail);
        },
        onError: (err: Error) => onError?.(err.message),
    });

    const clearMut = useMutation({
        mutationFn: clearMyOversightManager,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: MY_OVERSIGHT_MANAGER_QK });
            onSuccess?.(res.detail);
        },
        onError: (err: Error) => onError?.(err.message),
    });

    const optionLabel = (o: OversightManagerOption) => {
        const name = o.holder_name || o.holder_code || `#${o.holder_employee_id}`;
        return o.role_name ? `${name} · ${o.role_name}` : name;
    };
    const currentName = current?.holder_name || current?.holder_code || null;
    const busy = setMut.isPending || clearMut.isPending;

    return (
        <Stack direction="row" alignItems="center" spacing={0.5}>
            {currentName && (
                <Chip
                    size="small"
                    icon={<SupervisorAccountIcon sx={{ fontSize: 14 }} />}
                    label={currentName}
                    variant="outlined"
                    sx={{ fontSize: 11, maxWidth: 180 }}
                />
            )}
            <Tooltip title={getString('oversightManager')}>
                <span>
                    <IconButton
                        size="small"
                        onClick={(e) => setAnchor(e.currentTarget)}
                        sx={{ border: `1px solid ${t.borderLight}`, borderRadius: '7px' }}
                    >
                        <SupervisorAccountIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                </span>
            </Tooltip>

            <Popover
                open={!!anchor}
                anchorEl={anchor}
                onClose={() => setAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Box sx={{ p: 2, minWidth: 300, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight={700} color={t.text}>
                        {getString('oversightManager')}
                    </Typography>

                    <FormControlLabel
                        control={
                            <Switch
                                size="small"
                                checked={shortList}
                                onChange={(_, checked) => setShortList(checked)}
                            />
                        }
                        label={
                            <Typography fontSize={12}>
                                {getString('oversightShortList') || 'Only my department'}
                            </Typography>
                        }
                        sx={{ m: 0 }}
                    />

                    {editable ? (
                        options.length > 0 ? (
                            <>
                                <Select
                                    variant="outlined"
                                    size="small"
                                    displayEmpty
                                    fullWidth
                                    value={current?.process_role_holder_id ?? ''}
                                    disabled={busy}
                                    onChange={(e) => {
                                        const v = Number(e.target.value);
                                        if (v) setMut.mutate(v);
                                    }}
                                    renderValue={(val) => {
                                        if (!val) return getString('selectOversightManager');
                                        const opt = options.find((o) => o.process_role_holder_id === val);
                                        return opt ? optionLabel(opt) : (currentName ?? getString('selectOversightManager'));
                                    }}
                                    sx={{ fontSize: 13 }}
                                >
                                    <MenuItem value="" disabled>
                                        {getString('selectOversightManager')}
                                    </MenuItem>
                                    {options.map((o) => (
                                        <MenuItem key={o.process_role_holder_id} value={o.process_role_holder_id}>
                                            {optionLabel(o)}
                                        </MenuItem>
                                    ))}
                                </Select>

                                {busy && (
                                    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ color: t.textMuted }}>
                                        <CircularProgress size={14} thickness={5} />
                                        <Typography fontSize={12}>{getString('saving')}</Typography>
                                    </Stack>
                                )}

                                {current && (
                                    <Button
                                        size="small"
                                        color="error"
                                        variant="outlined"
                                        startIcon={<LinkOffIcon />}
                                        disabled={busy}
                                        onClick={() => clearMut.mutate()}
                                        sx={{ textTransform: 'none', alignSelf: 'flex-start' }}
                                    >
                                        {getString('disconnectOversightManager')}
                                    </Button>
                                )}
                            </>
                        ) : (
                            <Typography fontSize={13} color={t.textMuted}>
                                {getString('noOversightManagersAvailable')}
                            </Typography>
                        )
                    ) : (
                        <Typography fontSize={13} color={currentName ? t.text : t.textMuted}>
                            {currentName ?? getString('oversightManagerNotSet')}
                        </Typography>
                    )}
                </Box>
            </Popover>
        </Stack>
    );
}
