import { useState, type Dispatch, type SetStateAction } from 'react';
import {
    Box,
    Chip,
    FormControl,
    IconButton,
    MenuItem,
    Select,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import CakeOutlinedIcon from '@mui/icons-material/CakeOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LanguageOutlinedIcon from '@mui/icons-material/LanguageOutlined';
import type { GetStringFn } from '../../../types/getStringFn';
import { useTheme } from '../../theme/useTheme';
import { formatDate } from '../../../utils/date';
import type { LanguageLevel, Sex, MaritalStatus } from '../peopleReviewApi';
import { FOREIGN_LANGUAGES } from './evaluationHelpers';
import { FactItem } from './FactItem';
import EducationBlock from '../education/EducationBlock';
import ChildrenBlock from '../children/ChildrenBlock';
import MaritalStatusBlock from '../personal-data/MaritalStatusBlock';

interface Props {
    employeeId: number | undefined;
    /** Whether the foreign-language selects are editable (review still open + not presenting). */
    isEditable: boolean;
    getString: GetStringFn;
    // Birth date / age
    birthDate: string | null | undefined;
    employeeAge: number | null;
    /** Whether the inline birth-date edit pencil is shown (true when an employee id is known). */
    showEdit: boolean;
    onEditBirth: () => void;
    // Sex / marital status (read off the personal-data record)
    sex: Sex | null;
    maritalStatus: MaritalStatus | null;
    // Foreign languages
    langLevels: LanguageLevel[];
    langSel: Record<string, number | null>;
    setLangSel: Dispatch<SetStateAction<Record<string, number | null>>>;
    // Snackbar callbacks (education / children)
    onSuccess: (message: string) => void;
    onError: (message: string) => void;
    // Refresh the header source (the RSE detail) after a sex/marital-status save.
    onSaved: () => Promise<void> | void;
}

/** Personal-info tab: birth date / age, education, and foreign-language levels. */
export function PersonalInfoPanel({
    employeeId, isEditable, getString,
    birthDate, employeeAge, showEdit, onEditBirth,
    sex, maritalStatus,
    langLevels, langSel, setLangSel,
    onSuccess, onError, onSaved,
}: Props) {
    const { t } = useTheme();
    // Which language is being edited inline; null when none. Mirrors the
    // current-level field on JobInfoPanel: a chip by default, the select on edit.
    const [editingLang, setEditingLang] = useState<string | null>(null);

    // Translate CEFR level label/hint by code, falling back to the DB value.
    const translatedOr = (key: string, fallback: string) => {
        const v = getString(key);
        return v && v !== key ? v : fallback;
    };
    const langLevelLabel = (code: string, fallback: string) => translatedOr(`langLevelLabel${code}`, fallback);
    const langLevelHint = (code: string, fallback: string) => translatedOr(`langLevelHint${code}`, fallback);

    return (
        // Explicit columns (one block per column, in order: personal · education ·
        // children · languages) so education always gets its OWN column (col 2),
        // separate from children — a balanced masonry can't guarantee that.
        <Box
            sx={{
                display: 'grid',
                gap: 3,
                alignItems: 'start',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
            }}
        >
            {/* Col 1 — Birth date + sex / marital status */}
            <Box sx={{ minWidth: 0 }}>
                <Stack spacing={1.5}>
                    <FactItem
                        icon={<CakeOutlinedIcon sx={{ fontSize: 18, color: t.textMuted }} />}
                        label={getString('birthDate')}
                        value={<>{formatDate(birthDate ?? null)}{employeeAge !== null && ` · ${getString('yearsOld', { age: employeeAge })}`}</>}
                        onEdit={showEdit ? onEditBirth : undefined}
                        editTitle={getString('editBirthDate')}
                    />
                    {employeeId && (
                        <MaritalStatusBlock
                            employeeId={employeeId}
                            sex={sex}
                            maritalStatus={maritalStatus}
                            isEditable={isEditable}
                            getString={getString}
                            onError={onError}
                            onSaved={onSaved}
                        />
                    )}
                </Stack>
            </Box>

            {/* Col 2 — Education (1:N), its own column, before children */}
            {employeeId && (
                <Box sx={{ minWidth: 0 }}>
                    <EducationBlock
                        employeeId={employeeId}
                        getString={getString}
                        isEditable={isEditable}
                        onSuccess={onSuccess}
                        onError={onError}
                    />
                </Box>
            )}

            {/* Col 3 — Children (1:N) — headline = count of kids aged ≤14 */}
            {employeeId && (
                <Box sx={{ minWidth: 0 }}>
                    <ChildrenBlock
                        employeeId={employeeId}
                        getString={getString}
                        isEditable={isEditable}
                        onSuccess={onSuccess}
                        onError={onError}
                    />
                </Box>
            )}

            {/* Col 4 — Foreign languages */}
            <Box sx={{ minWidth: 0 }}>
                <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1 }}>
                    <LanguageOutlinedIcon sx={{ fontSize: 17 }} />
                    <Typography variant="subtitle2" fontWeight={700}>
                        {getString('foreignLanguages')}
                    </Typography>
                    {/* Instruction shown as a hint (not a label) and only while editing. */}
                    {isEditable && (
                        <Tooltip title={getString('foreignLanguagesHint')} placement="top">
                            <InfoOutlinedIcon sx={{ fontSize: 15, color: t.textMuted, cursor: 'help' }} />
                        </Tooltip>
                    )}
                </Stack>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start' }}>
                    {FOREIGN_LANGUAGES.map(({ key, labelKey }) => {
                        const selId = langSel[key] ?? null;
                        const selected = langLevels.find(l => l.id === selId);
                        const chipLabel = selected
                            ? (langLevelLabel(selected.code, selected.label)
                                ? `${selected.code} · ${langLevelLabel(selected.code, selected.label)}`
                                : selected.code)
                            : '—';
                        return (
                            <Stack key={key} spacing={0.25} alignItems="flex-start">
                                <Typography variant="caption" color={t.textMuted} sx={{ lineHeight: 1.1 }}>
                                    {getString(labelKey)}
                                </Typography>
                                {editingLang === key ? (
                                    <FormControl size="small" sx={{ width: 190 }}>
                                        <Select
                                            variant="outlined"
                                            defaultOpen
                                            value={selId == null ? '' : String(selId)}
                                            disabled={!isEditable}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setLangSel(prev => ({ ...prev, [key]: v === '' ? null : Number(v) }));
                                                setEditingLang(null);
                                            }}
                                            onClose={() => setEditingLang(null)}
                                            sx={{
                                                height: 24,
                                                fontSize: 13,
                                                '& .MuiSelect-select': { py: 0, display: 'flex', alignItems: 'center' },
                                            }}
                                            renderValue={() => {
                                                if (!selected) return '';
                                                const label = langLevelLabel(selected.code, selected.label);
                                                return label ? `${selected.code} · ${label}` : selected.code;
                                            }}
                                        >
                                            <MenuItem value=""><em>—</em></MenuItem>
                                            {langLevels.map(l => {
                                                const label = langLevelLabel(l.code, l.label);
                                                const hint = langLevelHint(l.code, l.hint);
                                                return (
                                                    <MenuItem key={l.id} value={String(l.id)}>
                                                        <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                                                            <span>{l.code}{label ? ` · ${label}` : ''}</span>
                                                            {hint && (
                                                                <Tooltip title={hint} placement="right" arrow>
                                                                    <InfoOutlinedIcon
                                                                        fontSize="small"
                                                                        sx={{ ml: 'auto', color: t.textMuted, cursor: 'help' }}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    />
                                                                </Tooltip>
                                                            )}
                                                        </Stack>
                                                    </MenuItem>
                                                );
                                            })}
                                        </Select>
                                    </FormControl>
                                ) : (
                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                        <Chip
                                            size="small"
                                            label={chipLabel}
                                            sx={{ fontWeight: 700, fontSize: 12, bgcolor: `${t.accent}18`, color: t.accent }}
                                        />
                                        {isEditable && (
                                            <Tooltip title={getString('edit')} placement="top">
                                                <IconButton size="small" onClick={() => setEditingLang(key)} sx={{ p: 0.2 }}>
                                                    <EditOutlinedIcon sx={{ fontSize: 14 }} />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </Stack>
                                )}
                            </Stack>
                        );
                    })}
                </Box>
            </Box>
        </Box>
    );
}
