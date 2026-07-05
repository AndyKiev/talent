// src/components/user_settings/UserSettingsPage.tsx
import { useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Chip,
    CircularProgress,
    IconButton,
    MenuItem,
    Paper,
    Select,
    Snackbar,
    Stack,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppShell from '../layout/AppShell';
import { useTheme } from '../theme/ThemeContext';
import useString from '../../hooks/useString';
import { USER_SETTINGS_EFFECTIVE_QK, EFFECTIVE_SETTINGS_QK } from '../../utils/queryKeys';
import type { SettingValue } from '../developer/settings/settingsApi';
import {
    fetchEffectiveUserSettings,
    setUserSetting,
    resetUserSetting,
    type EffectiveUserSetting,
} from './userSettingsApi';
import { fetchMyMenus } from '../layout/menuApi';
import { MENUS_MY_QK } from '../../utils/queryKeys';
import cfl from '../../utils/helpers.ts';
import type { GetStringFn } from '../../types/getStringFn';

// One option in a select-driven setting (value stored, label shown).
interface SettingOption { value: string; label: string; }

type Severity = 'success' | 'error';

// ── One setting row ───────────────────────────────────────────────────────────
interface RowProps {
    setting: EffectiveUserSetting;
    getString: GetStringFn;
    onSave: (key: string, value: SettingValue) => void;
    onReset: (key: string) => void;
    saving: boolean;
    options?: SettingOption[];
}

function UserSettingRow({ setting, getString, onSave, onReset, saving, options }: RowProps) {
    const { t } = useTheme();
    const isBoolean = setting.value_type_key === 'boolean';
    const isSelect = !!setting.options_source && setting.value_type_key === 'integer';
    const isInteger = !isSelect && setting.value_type_key === 'integer';
    const [draft, setDraft] = useState<SettingValue>(setting.effective_value);

    // Re-sync the local draft whenever the query refetches (e.g. after a save or
    // an admin lowering the global cap clamps this user's value).
    useEffect(() => {
        setDraft(setting.effective_value);
    }, [setting.effective_value]);

    const label = setting.label_key ? getString(setting.label_key) : setting.key;
    const description = setting.description_key ? getString(setting.description_key) : null;

    const handleBool = (checked: boolean) => {
        setDraft(checked);
        onSave(setting.key, checked);
    };

    const handleSave = () => {
        if (isInteger) {
            const n = Number(draft);
            if (!Number.isFinite(n)) return;
            onSave(setting.key, n);
            return;
        }
        onSave(setting.key, draft);
    };

    const dirty =
        !isBoolean && !isSelect &&
        JSON.stringify(draft) !== JSON.stringify(setting.effective_value);

    return (
        <Paper variant="outlined" sx={{ p: 2, borderColor: t.border, bgcolor: t.cardBg }}>
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={2} flexWrap="wrap">
                <Box sx={{ minWidth: 220, flex: 1 }}>
                    <Typography fontWeight={600} color={t.text}>{label}</Typography>
                    {description && (
                        <Typography variant="body2" color={t.textSecondary} mt={0.5}>{description}</Typography>
                    )}
                    {!setting.has_override ? (
                        <Chip
                            size="small"
                            variant="outlined"
                            sx={{ mt: 0.75 }}
                            label={getString('usingDefault', {
                                value:
                                    options?.find((o) => o.value === String(setting.global_value))
                                        ?.label ?? String(setting.global_value),
                            })}
                        />
                    ) : (
                        isInteger && (
                            <Typography variant="caption" color={t.textMuted} sx={{ display: 'block', mt: 0.75 }}>
                                {getString('settingRangeHint', {
                                    min: String(setting.min_value ?? 1),
                                    max: String(setting.max_value ?? setting.global_value),
                                })}
                            </Typography>
                        )
                    )}
                </Box>
                <Stack direction="row" alignItems="center" gap={1}>
                    {isSelect ? (
                        // Select-driven setting (e.g. default menu): pick one of
                        // the options AVAILABLE TO THIS USER; saved immediately.
                        <Select
                            size="small"
                            variant="outlined"
                            value={typeof draft === 'number' ? String(draft) : ''}
                            onChange={(e) => {
                                const v = e.target.value === '' ? null : Number(e.target.value);
                                setDraft(v);
                                if (v !== null) onSave(setting.key, v);
                            }}
                            renderValue={(selected) =>
                                options?.find((o) => o.value === String(selected))?.label ?? String(selected)
                            }
                            sx={{ minWidth: 220 }}
                            disabled={saving}
                        >
                            {(options ?? []).map((o) => (
                                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                            ))}
                        </Select>
                    ) : isBoolean ? (
                        <Switch
                            checked={draft === true}
                            onChange={(e) => handleBool(e.target.checked)}
                            disabled={saving}
                        />
                    ) : isInteger ? (
                        <TextField
                            size="small"
                            type="number"
                            variant="outlined"
                            value={draft === null || draft === undefined ? '' : String(draft)}
                            onChange={(e) => setDraft(e.target.value === '' ? null : Number(e.target.value))}
                            inputProps={{ min: setting.min_value ?? 1, max: setting.max_value ?? undefined }}
                            sx={{ width: 120 }}
                            disabled={saving}
                        />
                    ) : (
                        <TextField
                            size="small"
                            variant="outlined"
                            value={typeof draft === 'string' ? draft : JSON.stringify(draft ?? null)}
                            onChange={(e) => setDraft(e.target.value)}
                            sx={{ width: 220 }}
                            disabled={saving}
                        />
                    )}
                    {dirty && (
                        <Tooltip title={getString('save')}>
                            <span>
                                <IconButton color="primary" size="small" onClick={handleSave} disabled={saving}>
                                    <SaveIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                    )}
                    {setting.has_override && (
                        <Tooltip title={getString('resetToDefault')}>
                            <span>
                                <IconButton size="small" onClick={() => onReset(setting.key)} disabled={saving}>
                                    <RestartAltIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                    )}
                </Stack>
            </Stack>
        </Paper>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function UserSettingsPage() {
    const getString = useString();
    const qc = useQueryClient();
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as Severity });

    const notify = (message: string, severity: Severity = 'success') =>
        setSnackbar({ open: true, message, severity });

    const { data: settings = [], isLoading } = useQuery({
        queryKey: USER_SETTINGS_EFFECTIVE_QK,
        queryFn: fetchEffectiveUserSettings,
        staleTime: 60_000,
    });

    // Option sets for select-driven settings, keyed by options_source. The
    // default-menu options are the menus THIS USER can see — an override can
    // never point outside their access.
    const { data: myMenus = [] } = useQuery({
        queryKey: MENUS_MY_QK,
        queryFn: fetchMyMenus,
        staleTime: 5 * 60_000,
    });
    const optionsBySource: Record<string, SettingOption[]> = {
        menus: myMenus
            .filter((m) => m.parent_id === null)
            .map((m) => ({
                value: String(m.id),
                label: cfl(getString(m.label_key)) || m.key,
            })),
    };

    // Refresh both the page payload AND the per-user effective list every consumer
    // hook reads, so an override takes effect across the app immediately.
    const invalidate = () => {
        qc.invalidateQueries({ queryKey: USER_SETTINGS_EFFECTIVE_QK });
        qc.invalidateQueries({ queryKey: EFFECTIVE_SETTINGS_QK });
    };

    const saveMut = useMutation({
        mutationFn: setUserSetting,
        onSuccess: async (res) => { await invalidate(); notify(res.detail); },
        onError: (err: Error) => notify(err.message, 'error'),
    });
    const resetMut = useMutation({
        mutationFn: resetUserSetting,
        onSuccess: async () => { await invalidate(); notify(getString('userSettingDeleteSuccess')); },
        onError: (err: Error) => notify(err.message, 'error'),
    });

    const saving = saveMut.isPending || resetMut.isPending;

    return (
        <AppShell>
            <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 900, mx: 'auto' }}>
                <Typography variant="h6" fontWeight={700} mb={2}>{getString('mySettings')}</Typography>

                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                ) : settings.length === 0 ? (
                    <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                        {getString('noUserSettings')}
                    </Typography>
                ) : (
                    <Stack spacing={1.5}>
                        {settings.map((s) => (
                            <UserSettingRow
                                key={s.key}
                                setting={s}
                                getString={getString}
                                saving={saving}
                                onSave={(key, value) => saveMut.mutate({ key, value })}
                                onReset={(key) => resetMut.mutate(key)}
                                options={s.options_source ? optionsBySource[s.options_source] : undefined}
                            />
                        ))}
                    </Stack>
                )}

                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={4000}
                    onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                >
                    <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </Box>
        </AppShell>
    );
}
