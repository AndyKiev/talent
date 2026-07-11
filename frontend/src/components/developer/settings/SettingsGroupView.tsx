// src/components/developer/settings/SettingsGroupView.tsx
//
// One settings GROUP, opened from a card on SettingsPage. Renders the settings
// mapped to `groupKey` exactly as the flat page used to (rows, nested child
// accordions, Add / Delete / Visibility / training-off dialogs) — only the set
// of rows is filtered by group. See settingsGroups.ts for the grouping map.
import { useEffect, useMemo, useState } from 'react';
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
    FormControl,
    FormControlLabel,
    IconButton,
    InputLabel,
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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import SettingsIcon from '@mui/icons-material/Settings';
import Autocomplete from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';
import { Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppShell from '../../layout/AppShell';
import { PageContainer } from '../../layout/PageContainer';
import { useTheme } from '../../theme/ThemeContext';
import useString from '../../../hooks/useString';
import cfl from '../../../utils/capitalizeFirstLetter';
import { APP_SETTINGS_QK, SETTING_VALUE_TYPES_QK, APP_SETTING_BY_KEY_QK, EFFECTIVE_SETTINGS_QK, JOB_CATEGORY_QK, MENUS_ALL_QK, MENUS_MY_QK } from '../../../utils/queryKeys';
import {
    fetchAppSettings,
    fetchSettingValueTypes,
    createAppSetting,
    updateAppSetting,
    deleteAppSetting,
    type AppSetting,
    type AppSettingUpdate,
    type SettingValue,
    type SettingValueType,
} from './settingsApi';
import { fetchJobCategories } from '../../admin/job_categories/jobCategoryApi';
import { fetchEmployeeStatuses } from '../../employees/employee_events/employeeEventApi';
import { fetchAllMenus } from '../../layout/menuApi';
import { snakeToCamel } from '../../../utils/helpers';
import type { GetStringFn } from '../../../types/getStringFn';
import type { MenuVisibilityMode } from '../../developer/security/menus/menuAdminApi';
import { deriveMode, modeToFlags, MODE_LABEL_KEY } from '../../developer/security/menus/menuVisibility';
import { fetchUserGroups, type UserGroup } from '../../admin/user_groups/userGroupApi';
import { groupForSetting, SETTINGS_GROUP_BY_KEY } from './settingsGroups';

type Severity = 'success' | 'error';

// Training-module master flag + its delete-on-disable child (both app-only).
// Turning the master OFF while the child is ON purges employee training
// assignments on the backend — the page warns with a modal before saving.
const TRAINING_MASTER_KEY = 'training_module_enabled';
const TRAINING_DELETE_CHILD_KEY = 'training_module_delete_data_on_disable';

// One option in a multi-select setting (value stored, label shown).
interface SettingOption { value: string; label: string; }

/** Local visibility summary (same logic as menuVisibility.describeVisibility). */
function settingVisibilityLabel(
    setting: AppSetting,
    groupNamesById: Map<number, string>,
    getString: GetStringFn,
): string {
    const mode = deriveMode(setting);
    if (mode === 'all_employees') return getString('menuVisAllEmployees') || 'All employees';
    if (mode === 'all_groups') return getString('menuVisEveryoneInGroup') || 'Everyone in a group';
    const names = setting.group_ids
        .map((id) => groupNamesById.get(id) ?? `#${id}`)
        .join(', ');
    return names || (getString('noGroups') || 'No groups');
}

// ── Type-aware value editor ─────────────────────────────────────────────────
interface ValueEditorProps {
    typeKey: string | null;
    value: SettingValue;
    onChange: (value: SettingValue) => void;
    getString: GetStringFn;
    optionsSource?: string | null;
    options?: SettingOption[];
}

function SettingValueEditor({ typeKey, value, onChange, getString, optionsSource, options }: ValueEditorProps) {
    // Single-select: an INTEGER value bound to a known option set (e.g. the
    // default menu — value is the picked row's id).
    if (optionsSource && typeKey === 'integer') {
        const current = value === null || value === undefined ? '' : String(value);
        return (
            <Select
                size="small"
                variant="outlined"
                value={current}
                onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
                renderValue={(selected) =>
                    options?.find((o) => o.value === String(selected))?.label ?? String(selected)
                }
                sx={{ minWidth: 240 }}
            >
                {(options ?? []).map((o) => (
                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
            </Select>
        );
    }
    // Multi-select (a JSON list bound to a known option set) takes precedence.
    if (optionsSource) {
        const list = Array.isArray(value) ? (value as string[]) : [];
        return (
            <Select
                multiple
                size="small"
                variant="outlined"
                value={list}
                onChange={(e) => {
                    const v = e.target.value;
                    onChange(typeof v === 'string' ? v.split(',') : (v as string[]));
                }}
                renderValue={(selected) =>
                    (selected as string[])
                        .map((val) => options?.find((o) => o.value === val)?.label ?? val)
                        .join(', ')
                }
                sx={{ minWidth: 280 }}
            >
                {(options ?? []).map((o) => (
                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
            </Select>
        );
    }
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
    onToggleOverridable: (id: number, value: boolean) => void;
    onDelete: (setting: AppSetting) => void;
    onVisibility: (setting: AppSetting) => void;
    saving: boolean;
    options?: SettingOption[];
    groupNamesById: Map<number, string>;
    /** Returns true when the save is taken over (e.g. a confirm modal) — the
        row then keeps its current state and does NOT save. */
    onInterceptBooleanSave?: (setting: AppSetting, value: boolean) => boolean;
}

function SettingRow({ setting, getString, onSave, onToggleOverridable, onDelete, onVisibility, saving, options, groupNamesById, onInterceptBooleanSave }: RowProps) {
    const { t } = useTheme();
    const [draft, setDraft] = useState<SettingValue>(setting.value);
    const isBoolean = setting.value_type_key === 'boolean';
    const isMultiSelect = !!setting.options_source;
    const isJson = !isMultiSelect && (setting.value_type_key === 'json' || setting.value_type_key === null);
    // A locked setting can never be user-overridable — hide the toggle entirely.
    const canOverride = setting.user_override_allowed !== false;

    const label = setting.label_key ? getString(setting.label_key) : setting.key;
    const description = setting.description_key ? getString(setting.description_key) : null;

    // For booleans the toggle saves immediately; other types use an explicit Save.
    const handleChange = (value: SettingValue) => {
        // Intercepted boolean toggle: the switch stays put until the page-level
        // confirm flow saves (the row remounts with the fresh value) or cancels.
        if (isBoolean && onInterceptBooleanSave?.(setting, value === true)) return;
        setDraft(value);
        if (isBoolean) onSave(setting.id, value);
    };

    const handleSaveClick = () => {
        if (isMultiSelect) {
            onSave(setting.id, draft); // draft is already the selected array
            return;
        }
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
                    <Typography variant="caption" color={t.textMuted} sx={{ display: 'block', mt: 0.5 }}>
                        {settingVisibilityLabel(setting, groupNamesById, getString)}
                    </Typography>
                    {canOverride && (
                        <FormControlLabel
                            sx={{ mt: 0.5, ml: 0 }}
                            control={
                                <Switch
                                    size="small"
                                    checked={setting.user_overridable === true}
                                    onChange={(e) => onToggleOverridable(setting.id, e.target.checked)}
                                    disabled={saving}
                                />
                            }
                            label={
                                <Typography variant="caption" color={t.textMuted}>
                                    {getString('settingUserOverridable')}
                                </Typography>
                            }
                        />
                    )}
                </Box>
                <Stack direction="row" alignItems="center" gap={1}>
                    <SettingValueEditor
                        typeKey={setting.value_type_key}
                        value={draft}
                        onChange={handleChange}
                        getString={getString}
                        optionsSource={setting.options_source}
                        options={options}
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
                    <Tooltip title={getString('settingVisibility') || 'Visibility'}>
                        <IconButton size="small" onClick={() => onVisibility(setting)} disabled={saving}>
                            <SettingsIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
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

// ── Setting visibility dialog ──────────────────────────────────────────────
interface VisDialogProps {
    open: boolean;
    setting: AppSetting | null;
    groups: UserGroup[];
    onClose: () => void;
    onSave: (id: number, data: AppSettingUpdate) => void;
    saving: boolean;
    getString: GetStringFn;
}

function SettingVisibilityDialog({ open, setting, groups, onClose, onSave, saving, getString }: VisDialogProps) {
    const [mode, setMode] = useState<MenuVisibilityMode>('all_groups');
    const [groupIds, setGroupIds] = useState<number[]>([]);
    const [userOverridable, setUserOverridable] = useState(false);

    useEffect(() => {
        if (!setting) return;
        setMode(deriveMode(setting));
        setGroupIds(setting.group_ids);
        setUserOverridable(setting.user_overridable);
    }, [setting]);

    const handleSave = () => {
        if (!setting) return;
        const flags = modeToFlags(mode);
        onSave(setting.id, {
            visible_to_all_groups: flags.visible_to_all_groups,
            visible_to_regular: flags.visible_to_regular,
            group_ids: mode === 'specific' ? groupIds : [],
            user_overridable: userOverridable,
        });
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{getString('settingVisibility') || 'Setting Visibility'}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <FormControl fullWidth>
                        <InputLabel>{getString('menuVisibility') || 'Visible to'}</InputLabel>
                        <Select
                            variant="outlined"
                            value={mode}
                            onChange={(e) => setMode(e.target.value as MenuVisibilityMode)}
                            label={getString('menuVisibility') || 'Visible to'}
                        >
                            {(['all_employees', 'all_groups', 'specific'] as MenuVisibilityMode[]).map(
                                (m) => (
                                    <MenuItem key={m} value={m}>
                                        {getString(MODE_LABEL_KEY[m]) || m}
                                    </MenuItem>
                                ),
                            )}
                        </Select>
                    </FormControl>

                    {mode === 'specific' && (
                        <Autocomplete
                            multiple
                            options={groups}
                            getOptionLabel={(g) => g.name}
                            value={groups.filter((g) => groupIds.includes(g.id))}
                            onChange={(_, selected) => setGroupIds(selected.map((g) => g.id))}
                            isOptionEqualToValue={(o, v) => o.id === v.id}
                            renderTags={(value, getTagProps) =>
                                value.map((g, index) => (
                                    <Chip
                                        size="small"
                                        label={g.name}
                                        {...getTagProps({ index })}
                                        key={g.id}
                                    />
                                ))
                            }
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label={getString('groups') || 'Groups'}
                                    placeholder={getString('selectGroups') || 'Select groups'}
                                    variant="outlined"
                                />
                            )}
                        />
                    )}

                    <FormControlLabel
                        control={
                            <Switch
                                checked={userOverridable}
                                onChange={(_, checked) => setUserOverridable(checked)}
                            />
                        }
                        label={
                            <Typography variant="caption" color="text.secondary">
                                {getString('settingUserOverridable')}
                            </Typography>
                        }
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={onClose} disabled={saving}>
                    {getString('cancel') || 'Cancel'}
                </Button>
                <Button variant="contained" onClick={handleSave} disabled={saving}>
                    {saving ? <CircularProgress size={18} /> : getString('save') || 'Save'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// ── Group view ──────────────────────────────────────────────────────────────
export function SettingsGroupView({ groupKey }: { groupKey: string }) {
    const getString = useString();
    const qc = useQueryClient();
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as Severity });
    const [addOpen, setAddOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<AppSetting | null>(null);
    const [visibilityTarget, setVisibilityTarget] = useState<AppSetting | null>(null);
    // Training master being switched OFF while delete-on-disable is ON —
    // held here until the developer confirms the data purge in the modal.
    const [trainingOffTarget, setTrainingOffTarget] = useState<AppSetting | null>(null);

    const group = SETTINGS_GROUP_BY_KEY[groupKey];
    const groupLabel = group ? cfl(getString(group.labelKey)) : cfl(getString('settings'));

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

    // Option sets for multi-select settings, keyed by AppSetting.options_source.
    const { data: jobCategories = [] } = useQuery({
        queryKey: JOB_CATEGORY_QK,
        queryFn: fetchJobCategories,
        staleTime: 5 * 60_000,
    });
    const { data: employeeStatuses = [] } = useQuery({
        queryKey: ['employee_statuses'],
        queryFn: fetchEmployeeStatuses,
        staleTime: 5 * 60_000,
    });
    const { data: allMenus = [] } = useQuery({
        queryKey: MENUS_ALL_QK,
        queryFn: fetchAllMenus,
        staleTime: 5 * 60_000,
    });
    const { data: userGroups = [] } = useQuery({
        queryKey: ['user_groups'],
        queryFn: fetchUserGroups,
        staleTime: 5 * 60_000,
    });
    const optionsBySource = useMemo<Record<string, SettingOption[]>>(() => ({
        job_categories: jobCategories.map((c) => ({
            value: c.key,
            label: cfl(getString(snakeToCamel(c.key))) || c.key,
        })),
        employee_statuses: employeeStatuses.map((s) => ({
            value: s.name,
            // Status names double as translation keys (see EmployeeCardLayout.tsx).
            label: cfl(getString(s.name)) || s.name,
        })),
        // Single-select (integer): the app-wide default landing menu.
        menus: allMenus.map((m) => ({
            value: String(m.id),
            label: cfl(getString(m.label_key)) || m.key,
        })),
    }), [jobCategories, employeeStatuses, allMenus, getString]);

    const groupNamesById = useMemo(
        () => new Map(userGroups.map((g) => [g.id, g.name])),
        [userGroups],
    );

    // Settings id -> setting, so a child can resolve its parent's group.
    const byId = useMemo(
        () => new Map(settings.map((s) => [s.id, s])),
        [settings],
    );

    // Multi-story grouping: top-level settings (parent_id null) that belong to
    // THIS card's group, plus the children hanging under each. A boolean parent
    // renders its children in an accordion that is DISABLED while the parent is
    // off — child values stay in the DB, their options are just deactivated.
    const topLevelSettings = useMemo(
        () => settings.filter(
            (s) => s.parent_id == null && groupForSetting(s, byId) === groupKey,
        ),
        [settings, byId, groupKey],
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
    // My-menus too: the training master shows/hides the 'training' menu item.
    const invalidate = () => {
        qc.invalidateQueries({ queryKey: APP_SETTINGS_QK });
        qc.invalidateQueries({ queryKey: APP_SETTING_BY_KEY_QK });
        qc.invalidateQueries({ queryKey: EFFECTIVE_SETTINGS_QK });
        qc.invalidateQueries({ queryKey: MENUS_MY_QK });
    };

    // Turning the training master OFF while its delete child is ON must pass
    // through the warning modal; every other boolean toggle saves directly.
    const interceptBooleanSave = (setting: AppSetting, value: boolean): boolean => {
        if (setting.key !== TRAINING_MASTER_KEY || value) return false;
        const child = settings.find((s) => s.key === TRAINING_DELETE_CHILD_KEY);
        if (child?.value !== true) return false;
        setTrainingOffTarget(setting);
        return true;
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

    const handleSaveVisibility = (id: number, data: AppSettingUpdate) => {
        updateMut.mutate({ id, data });
        setVisibilityTarget(null);
    };

    return (
        <AppShell>
            <PageContainer>
                <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
                    <Link to="/developer" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography variant="body2" color="text.secondary">{cfl(getString('devPanel'))}</Typography>
                    </Link>
                    <Link to="/developer/settings" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography variant="body2" color="text.secondary">{cfl(getString('settings'))}</Typography>
                    </Link>
                    <Typography variant="body2" color="text.primary" fontWeight={600}>
                        {groupLabel}
                    </Typography>
                </Breadcrumbs>

                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" fontWeight={700}>{groupLabel}</Typography>
                    <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
                        {getString('addSetting')}
                    </Button>
                </Stack>

                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                ) : topLevelSettings.length === 0 ? (
                    <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                        {getString('noSettings')}
                    </Typography>
                ) : (
                    <Stack spacing={1.5}>
                        {topLevelSettings.map((s) => {
                            const renderRow = (setting: AppSetting) => (
                                <SettingRow
                                    // Value in the key: a server-side value change (e.g. the
                                    // confirmed training-off save) remounts the row so its
                                    // local draft picks up the fresh value.
                                    key={`${setting.id}:${JSON.stringify(setting.value)}`}
                                    setting={setting}
                                    getString={getString}
                                    saving={updateMut.isPending}
                                    onSave={(id, value) => updateMut.mutate({ id, data: { value } })}
                                    onToggleOverridable={(id, user_overridable) => updateMut.mutate({ id, data: { user_overridable } })}
                                    onDelete={(target) => setDeleteTarget(target)}
                                    onVisibility={(target) => setVisibilityTarget(target)}
                                    options={setting.options_source ? optionsBySource[setting.options_source] : undefined}
                                    groupNamesById={groupNamesById}
                                    onInterceptBooleanSave={interceptBooleanSave}
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

                {/* Training master OFF + delete-on-disable ON: warn that employee
                    training assignments will be deleted (the training catalog —
                    types/categories — is kept) before saving the switch. */}
                <Dialog open={!!trainingOffTarget} onClose={() => !updateMut.isPending && setTrainingOffTarget(null)} maxWidth="sm" fullWidth>
                    <DialogTitle>{getString('trainingDisableWarningTitle')}</DialogTitle>
                    <DialogContent>
                        <Typography variant="body2">{getString('trainingDisableWarningText')}</Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setTrainingOffTarget(null)} disabled={updateMut.isPending}>
                            {getString('cancel')}
                        </Button>
                        <Button
                            variant="contained"
                            color="error"
                            disabled={updateMut.isPending}
                            onClick={() => {
                                if (trainingOffTarget) updateMut.mutate({ id: trainingOffTarget.id, data: { value: false } });
                                setTrainingOffTarget(null);
                            }}
                        >
                            {updateMut.isPending ? <CircularProgress size={18} /> : getString('trainingDisableConfirm')}
                        </Button>
                    </DialogActions>
                </Dialog>

                <SettingVisibilityDialog
                    open={!!visibilityTarget}
                    setting={visibilityTarget}
                    groups={userGroups}
                    getString={getString}
                    saving={updateMut.isPending}
                    onClose={() => setVisibilityTarget(null)}
                    onSave={handleSaveVisibility}
                />

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
            </PageContainer>
        </AppShell>
    );
}
