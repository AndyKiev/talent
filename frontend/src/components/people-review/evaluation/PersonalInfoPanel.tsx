import { type Dispatch, type SetStateAction } from 'react';
import {
    Box,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import CakeOutlinedIcon from '@mui/icons-material/CakeOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LanguageOutlinedIcon from '@mui/icons-material/LanguageOutlined';
import type { GetStringFn } from '../../../types/getStringFn';
import { useTheme } from '../../theme/ThemeContext';
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
}

/** Personal-info tab: birth date / age, education, and foreign-language levels. */
export function PersonalInfoPanel({
    employeeId, isEditable, getString,
    birthDate, employeeAge, showEdit, onEditBirth,
    sex, maritalStatus,
    langLevels, langSel, setLangSel,
    onSuccess, onError,
}: Props) {
    const { t } = useTheme();

    // Translate CEFR level label/hint by code, falling back to the DB value.
    const translatedOr = (key: string, fallback: string) => {
        const v = getString(key);
        return v && v !== key ? v : fallback;
    };
    const langLevelLabel = (code: string, fallback: string) => translatedOr(`langLevelLabel${code}`, fallback);
    const langLevelHint = (code: string, fallback: string) => translatedOr(`langLevelHint${code}`, fallback);

    return (
        // Balanced multi-column (masonry) layout so the blocks spread across the
        // tab width; each block stays whole (break-inside: avoid).
        <Box sx={{ columnGap: 3, columnCount: { xs: 1, sm: 2, lg: 3 } }}>
            {/* Birth date + sex / marital status */}
            <Box sx={{ breakInside: 'avoid', mb: 2.5 }}>
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
                        />
                    )}
                </Stack>
            </Box>

            {/* Children (1:N) — headline = count of kids aged ≤14 */}
            {employeeId && (
                <Box sx={{ breakInside: 'avoid', mb: 2.5 }}>
                    <ChildrenBlock
                        employeeId={employeeId}
                        getString={getString}
                        isEditable={isEditable}
                        onSuccess={onSuccess}
                        onError={onError}
                    />
                </Box>
            )}

            {/* Education (1:N) */}
            {employeeId && (
                <Box sx={{ breakInside: 'avoid', mb: 2.5 }}>
                    <EducationBlock
                        employeeId={employeeId}
                        getString={getString}
                        isEditable={isEditable}
                        onSuccess={onSuccess}
                        onError={onError}
                    />
                </Box>
            )}

            {/* Foreign languages */}
            <Box sx={{ breakInside: 'avoid', mb: 2.5 }}>
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
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                    {FOREIGN_LANGUAGES.map(({ key, labelKey }) => {
                        const selId = langSel[key] ?? null;
                        const selected = langLevels.find(l => l.id === selId);
                        return (
                            <FormControl key={key} size="small" sx={{ width: 190 }}>
                                <InputLabel id={`lang-${key}-label`}>{getString(labelKey)}</InputLabel>
                                <Select
                                    variant="outlined"
                                    labelId={`lang-${key}-label`}
                                    label={getString(labelKey)}
                                    value={selId == null ? '' : String(selId)}
                                    disabled={!isEditable}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        setLangSel(prev => ({ ...prev, [key]: v === '' ? null : Number(v) }));
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
                        );
                    })}
                </Box>
            </Box>
        </Box>
    );
}
