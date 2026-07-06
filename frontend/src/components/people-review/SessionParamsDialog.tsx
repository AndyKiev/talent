import { useQuery } from '@tanstack/react-query';
import {
    Alert,
    Box,
    Chip,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableRow,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { fetchSessionFrozenParams, type FrozenParamsSection } from './peopleReviewApi';
import useString from '../../hooks/useString';
import type { GetStringFn } from '../../types/getStringFn';

// Known frozen tables -> section title msg keys. An unknown (future) table
// still renders — with its raw table name as the title — so new frozen
// tables show up without touching this file.
const SECTION_TITLE_KEYS: Record<string, string> = {
    review_sessions: 'fpSectionSession',
    review_session_settings: 'fpSectionSettings',
    review_session_departments: 'fpSectionDepartments',
    review_session_criterions: 'fpSectionCriteria',
    review_session_levels: 'fpSectionLevels',
    review_session_level_requirements: 'fpSectionLevelRequirements',
};

function formatValue(value: unknown): string {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

/** One record rendered as a vertical param | value table. */
function RecordTable({ row, getString }: { row: Record<string, unknown>; getString: GetStringFn }) {
    return (
        <Table
            size="small"
            sx={{
                mb: 1.5,
                border: '1px solid',
                borderColor: 'divider',
                '& td': { py: 0.5, fontSize: 12.5 },
            }}
        >
            <TableBody>
                {Object.entries(row).map(([field, value]) => {
                    // Values that ARE translation keys (name_key, text_key, ...)
                    // are shown translated, with the raw key dimmed underneath.
                    const isMsgKey = field.endsWith('_key') && typeof value === 'string' && value !== '';
                    const translated = isMsgKey ? getString(value as string) : null;
                    return (
                        <TableRow key={field}>
                            <TableCell
                                sx={{
                                    width: 220,
                                    color: 'text.secondary',
                                    fontFamily: 'monospace',
                                    verticalAlign: 'top',
                                }}
                            >
                                {field}
                            </TableCell>
                            <TableCell>
                                {isMsgKey ? (
                                    <>
                                        <Typography fontSize={12.5}>{translated}</Typography>
                                        {translated !== value && (
                                            <Typography
                                                fontSize={11}
                                                color="text.disabled"
                                                fontFamily="monospace"
                                            >
                                                {String(value)}
                                            </Typography>
                                        )}
                                    </>
                                ) : (
                                    formatValue(value)
                                )}
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}

function Section({ section, getString }: { section: FrozenParamsSection; getString: GetStringFn }) {
    const titleKey = SECTION_TITLE_KEYS[section.table];
    const title = titleKey ? getString(titleKey) : section.table;
    return (
        <Box sx={{ mb: 2.5 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Typography fontSize={14} fontWeight={700}>
                    {title}
                </Typography>
                <Chip label={section.rows.length} size="small" variant="outlined" />
                <Typography fontSize={11} color="text.disabled" fontFamily="monospace">
                    {section.table}
                </Typography>
            </Stack>
            {section.rows.length === 0 ? (
                <Typography fontSize={12.5} color="text.secondary">
                    {getString('fpNoRows')}
                </Typography>
            ) : (
                section.rows.map((row, i) => (
                    <RecordTable key={i} row={row} getString={getString} />
                ))
            )}
        </Box>
    );
}

interface SessionParamsDialogProps {
    sessionId: number;
    sessionName: string;
    open: boolean;
    onClose: () => void;
}

/** Dev-only read-only view of everything frozen into a session at open time. */
export function SessionParamsDialog({ sessionId, sessionName, open, onClose }: SessionParamsDialogProps) {
    const getString = useString();

    const { data, isLoading, error } = useQuery({
        queryKey: ['review_session_frozen_params', sessionId],
        queryFn: () => fetchSessionFrozenParams(sessionId),
        enabled: open,
        staleTime: 60 * 1000,
    });

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ pr: 6 }}>
                <Typography component="span" fontWeight={700}>
                    {getString('sessionParams')}
                </Typography>
                <Typography component="span" color="text.secondary" sx={{ ml: 1 }}>
                    {sessionName}
                </Typography>
                <Typography fontSize={12} color="text.secondary">
                    {getString('sessionParamsFrozenHint')}
                </Typography>
                <IconButton
                    onClick={onClose}
                    size="small"
                    sx={{ position: 'absolute', right: 12, top: 12 }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                {isLoading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress size={28} />
                    </Box>
                )}
                {!isLoading && error && (
                    <Alert severity="error">{(error as Error).message}</Alert>
                )}
                {!isLoading && !error && data?.sections.map((section) => (
                    <Section key={section.table} section={section} getString={getString} />
                ))}
            </DialogContent>
        </Dialog>
    );
}
