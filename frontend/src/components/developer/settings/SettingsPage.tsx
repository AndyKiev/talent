// src/components/developer/settings/SettingsPage.tsx
import { useMemo, useState } from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Breadcrumbs,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    MenuItem,
    Paper,
    Snackbar,
    Stack,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import { Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppShell from '../../layout/AppShell';
import { useTheme } from '../../theme/ThemeContext';
import useString from '../../../hooks/useString';
import cfl from '../../../utils/capitalizeFirstLetter';
import { APP_SETTINGS_QK, SETTING_VALUE_TYPES_QK, APP_SETTING_BY_KEY_QK } from '../../../utils/queryKeys';
import {
    fetchAppSettings,
    fetchSettingValueTypes,
    createAppSetting,
    updateAppSetting,
    deleteAppSetting,
    type AppSetting,
    type SettingValue,
    type SettingValueType,
} from './settingsApi';
import type { GetStringFn } from '../../../types/getStringFn';

type Severity = 'success' | 'error';

// ── Type-aware value editor ─────────────────────────────────────────────────
interface ValueEditorProps {
    typeKey: string | null;
    value: SettingValue;
    onChange: (value: SettingValue) => void;
    getString: GetStringFn;
}

function SettingValueEditor({ typeKey, value, onChange, getString }: ValueEditorProps) {
    if (typeKey === 'boolean') {
        return <Switch checked={value === true} onChange={(e) => onChange(e.target.checked)} />;
    }
    if (typeKey === 'integer') {
        return (
            <TextField
                size="small"
                type="number"
                variant="outlined"
                value={value === null || value === undefined ? '' : String(value)}
                onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
                sx={{ width: 160 }}
            />
        );
    }
    if (typeKey === 'date') {
        return (
            <TextField
                size="small"
                type="date"
                variant="outlined"
                value={typeof value === 'string' ? value : ''}
                onChange={(e) => onChange(e.target.value || null)}
                sx={{ width: 200 }}
            />
        );
    }
    // json (or anything else) — edited as raw JSON text.
    return (
        <TextField
            size="small"
            multiline
            minRows={2}
            variant="outlined"
            value={typeof value === 'string' ? value : JSON.stringify(value ?? null, null, 2)}
            onChange={(e) => onChange(e.target.value)}
            label={getString('settingJsonValue')}
            sx={{ width: 360, fontFamily: 'monospace' }}
        />
    );
}

// ── One setting row ─────────────────────────────────────────────────────────
interface RowProps {
    setting: AppSetting;
    getString: GetStringFn;
    onSave: (id: number, value: SettingValue) => void;
    onDelete: (setting: AppSetting) => void;
    saving: boolean;
}

function SettingRow({ setting, getString, onSave, onDelete, saving }: RowProps) {
    const { t } = useTheme();
    const [draft, setDraft] = useState<SettingValue>(setting.value);
    const isBoolean = setting.value_type_key === 'boolean';
    const isJson = setting.value_type_key === 'json' || setting.value_type_key === null;

    const label = setting.label_key ? getString(setting.label_key) : setting.key;
    const description = setting.description_key ? getString(setting.description_key) : null;

    // For booleans the toggle saves immediately; other types use an explicit Save.
    const handleChange = (value: SettingValue) => {
        setDraft(value);
        if (isBoolean) onSave(setting.id, value);
    };

    const handleSaveClick = () => {
        if (isJson) {
            try {
                onSave(setting.id, JSON.parse(String(draft)));
            } catch {
                onSave(setting.id, draft); // backend validates; surfaces the error
            }
            return;
        }
        onSave(setting.id, draft);
    };

    const dirty = !isBoolean && JSON.stringify(draft) !== JSON.stringify(setting.value);

    return (
        <Paper variant="outlined" sx={{ p: 2, borderColor: t.border, bgcolor: t.cardBg }}>
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={2} flexWrap="wrap">
                <Box sx={{ minWidth: 220, flex: 1 }}>
                    <Typography fontWeight={600} color={t.text}>{label}</Typography>
                    <Typography variant="caption" color={t.textMuted}>{setting.key}</Typography>
                    {description && (
                        <Typography variant="body2" color={t.textSecondary} mt={0.5}>{description}</Typography>
                    )}
                </Box>
                <Stack direction="row" alignItems="center" gap={1}>
                    <SettingValueEditor
                        typeKey={setting.value_type_key}
                        value={draft}
                        onChange={handleChange}
                        getString={getString}
                    />
                    {dirty && (
                        <Tooltip title={getString('save')}>
                            <span>
                                <IconButton color="primary" size="small" onClick={handleSaveClick} disabled={saving}>
                                    <SaveIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                    )}
                    <Tooltip title={getString('delete')}>
                        <IconButton color="error" size="small" onClick={() => onDelete(setting)} disabled={saving}>
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Stack>
        </Paper>
    );
}

// ── Add-setting dialog ──────────────────────────────────────────────────────
interface AddDialogProps {
    open: boolean;
    valueTypes: SettingValueType[];
    getString: GetStringFn;
    onClose: () => void;
    onCreate: (body: { key: string; value_type_id: number; label_key: string | null; description_key: string | null; value: SettingValue }) => void;
    saving: boolean;
}

function AddSettingDialog({ open, valueTypes, getString, onClose, onCreate, saving }: AddDialogProps) {
    const [key, setKey] = useState('');
    const [valueTypeId, setValueTypeId] = useState<number | ''>('');
    const [labelKey, setLabelKey] = useState('');
    const [descriptionKey, setDescriptionKey] = useState('');

    const reset = () => { setKey(''); setValueTypeId(''); setLabelKey(''); setDescriptionKey(''); };
    const handleClose = () => { reset(); onClose(); };

    const typeKey = valueTypes.find((v) => v.id === valueTypeId)?.key ?? null;
    const defaultValue: SettingValue =
        typeKey === 'boolean' ? false : typeKey === 'integer' ? 0 : typeKey === 'json' ? {} : null;

    const handleCreate = () => {
        if (!key.trim() || valueTypeId === '') return;
        onCreate({
            key: key.trim(),
            value_type_id: valueTypeId,
            label_key: labelKey.trim() || null,
            description_key: descriptionKey.trim() || null,
            value: defaultValue,
        });
        reset();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>{getString('addSetting')}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField
                        label={getString('settingKey')} variant="outlined" fullWidth
                        value={key} onChange={(e) => setKey(e.target.value)}
                    />
                    <TextField
                        select label={getString('settingValueType')} variant="outlined" fullWidth
                        value={valueTypeId === '' ? '' : String(valueTypeId)}
                        onChange={(e) => setValueTypeId(Number(e.target.value))}
                    >
                        {valueTypes.map((vt) => (
                            <MenuItem key={vt.id} value={String(vt.id)}>{vt.name}</MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        label={getString('settingLabelKey')} variant="outlined" fullWidth
                        value={labelKey} onChange={(e) => setLabelKey(e.target.value)}
                    />
                    <TextField
                        label={getString('settingDescriptionKey')} variant="outlined" fullWidth
                        value={descriptionKey} onChange={(e) => setDescriptionKey(e.target.value)}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={saving}>{getString('cancel')}</Button>
                <Button
                    variant="contained" onClick={handleCreate}
                    disabled={saving || !key.trim() || valueTypeId === ''}
                >
                    {saving ? <CircularProgress size={18} /> : getString('add')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// ── Page ────────────────────────────────────────────────────────────────────
export function SettingsPage() {
    const getString = useString();
    const qc = useQueryClient();
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as Severity });
    const [addOpen, setAddOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<AppSetting | null>(null);

    const notify = (message: string, severity: Severity = 'success') =>
        setSnackbar({ open: true, message, severity });

    const { data: settings = [], isLoading } = useQuery({
        queryKey: APP_SETTINGS_QK,
        queryFn: fetchAppSettings,
        staleTime: 60_000,
    });
    const { data: valueTypes = [] } = useQuery({
        queryKey: SETTING_VALUE_TYPES_QK,
        queryFn: fetchSettingValueTypes,
        staleTime: 5 * 60_000,
    });

    // Multi-story grouping: top-level settings (parent_id null) plus the children
    // hanging under each. A boolean parent renders its children in an accordion
    // that is DISABLED while the parent is off — child values stay in the DB,
    // their options are just deactivated.
    const topLevelSettings = useMemo(
        () => settings.filter((s) => s.parent_id == null),
        [settings],
    );
    const childrenByParent = useMemo(() => {
        const map = new Map<number, AppSetting[]>();
        for (const s of settings) {
            if (s.parent_id != null) {
                const arr = map.get(s.parent_id) ?? [];
                arr.push(s);
                map.set(s.parent_id, arr);
            }
        }
        return map;
    }, [settings]);

    // Refresh both the settings list AND every per-key consumer (useBooleanSetting
    // etc.), so toggling a flag here updates gated UI (e.g. avatars) immediately.
    const invalidate = () => {
        qc.invalidateQueries({ queryKey: APP_SETTINGS_QK });
        qc.invalidateQueries({ queryKey: APP_SETTING_BY_KEY_QK });
    };

    const updateMut = useMutation({
        mutationFn: updateAppSetting,
        onSuccess: async (res) => { await invalidate(); notify(res.detail); },
        onError: (err: Error) => notify(err.message, 'error'),
    });
    const createMut = useMutation({
        mutationFn: createAppSetting,
        onSuccess: async (res) => { await invalidate(); notify(res.detail); setAddOpen(false); },
        onError: (err: Error) => notify(err.message, 'error'),
    });
    const deleteMut = useMutation({
        mutationFn: deleteAppSetting,
        onSuccess: async () => { await invalidate(); notify(getString('deleteSuccess')); setDeleteTarget(null); },
        onError: (err: Error) => { notify(err.message, 'error'); setDeleteTarget(null); },
    });

    return (
        <AppShell>
            <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1100, mx: 'auto' }}>
                <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
                    <Link to="/developer" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography variant="body2" color="text.secondary">{cfl(getString('devPanel'))}</Typography>
                    </Link>
                    <Typography variant="body2" color="text.primary" fontWeight={600}>
                        {cfl(getString('settings'))}
                    </Typography>
                </Breadcrumbs>

                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" fontWeight={700}>{getString('settings')}</Typography>
                    <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
                        {getString('addSetting')}
                    </Button>
                </Stack>

                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                ) : settings.length === 0 ? (
                    <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                        {getString('noSettings')}
                    </Typography>
                ) : (
                    <Stack spacing={1.5}>
                        {topLevelSettings.map((s) => {
                            const renderRow = (setting: AppSetting) => (
                                <SettingRow
                                    key={setting.id}
                                    setting={setting}
                                    getString={getString}
                                    saving={updateMut.isPending}
                                    onSave={(id, value) => updateMut.mutate({ id, data: { value } })}
                                    onDelete={(target) => setDeleteTarget(target)}
                                />
                            );
                            const kids = childrenByParent.get(s.id) ?? [];
                            if (kids.length === 0) return renderRow(s);
                            // Parent boolean off → accordion disabled (options deactivated,
                            // values preserved in the DB).
                            const parentOn = s.value === true;
                            return (
                                <Box key={s.id}>
                                    {renderRow(s)}
                                    <Accordion
                                        disableGutters
                                        defaultExpanded
                                        disabled={!parentOn}
                                        sx={{
                                            mt: 1,
                                            ml: 3,
                                            bgcolor: 'transparent',
                                            boxShadow: 'none',
                                            '&:before': { display: 'none' },
                                        }}
                                    >
                                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                            <Typography variant="body2" color="text.secondary">
                                                {getString('subSettings')} ({kids.length})
                                                {!parentOn ? ` — ${getString('subSettingsDisabledHint')}` : ''}
                                            </Typography>
                                        </AccordionSummary>
                                        <AccordionDetails>
                                            <Stack spacing={1.5}>{kids.map(renderRow)}</Stack>
                                        </AccordionDetails>
                                    </Accordion>
                                </Box>
                            );
                        })}
                    </Stack>
                )}

                <AddSettingDialog
                    open={addOpen}
                    valueTypes={valueTypes}
                    getString={getString}
                    onClose={() => setAddOpen(false)}
                    onCreate={(body) => createMut.mutate({ ...body, is_active: true })}
                    saving={createMut.isPending}
                />

                <Dialog open={!!deleteTarget} onClose={() => !deleteMut.isPending && setDeleteTarget(null)} maxWidth="xs" fullWidth>
                    <DialogTitle>{getString('confirmDeleteSetting')}</DialogTitle>
                    <DialogContent>
                        <Typography variant="body2" fontWeight={600}>{deleteTarget?.key}</Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setDeleteTarget(null)} disabled={deleteMut.isPending}>{getString('cancel')}</Button>
                        <Button variant="contained" color="error" onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)} disabled={deleteMut.isPending}>
                            {deleteMut.isPending ? <CircularProgress size={18} /> : getString('delete')}
                        </Button>
                    </DialogActions>
                </Dialog>

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
