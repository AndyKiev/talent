import { useMemo, useState } from 'react';
import {
    Box,
    Button,
    Chip,
    Drawer,
    FormControl,
    IconButton,
    InputLabel,
    ListSubheader,
    Menu,
    MenuItem,
    Select,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import type { GetStringFn } from '../../../types/getStringFn';
import { useTheme } from '../../theme/useTheme';
import { InlineEditField } from './InlineEditField';
import {
    FACT_KEY_IMPROVEMENT,
    type EmployeeFact,
    type EmployeeFactType,
} from '../employeeFactApi';
import { DragItemKind, type DraggedItem } from './evaluationHelpers';

interface Props {
    open: boolean;
    onClose: () => void;
    getString: GetStringFn;
    /** The employee's lines that are not attached to any competence. */
    facts: EmployeeFact[];
    /** The seeded kinds, in display order — the registration selector. */
    factTypes: EmployeeFactType[];
    /** False in presentation / closed-review mode: the drawer is read-only. */
    isEditable: boolean;
    onCreate: (typeId: number, text: string) => void;
    onEdit: (factId: number, text: string) => void;
    onChangeType: (factId: number, typeId: number) => void;
    onDelete: (fact: EmployeeFact) => void;
    setDraggedItem: (item: DraggedItem | null) => void;
    /** The competences this employee is evaluated on, in page order — the targets
     *  of the "file into" menu. */
    competences: { evalId: number; name: string; color: string }[];
    onFileInto: (factId: number, evalId: number) => void;
}

/** The kind's heading — the same wording as the two lists under a competence. */
const kindLabelKey = (key: string) =>
    key === FACT_KEY_IMPROVEMENT ? 'directionsForImprovement' : 'factsAndAchievements';

/**
 * The employee's pool of facts registered before a competence was chosen.
 *
 * This is the second half of the quick-registration flow: the button on the page
 * header drops a line in here without any competence, and the reader comes back
 * later to decide what it proves — dragging it onto a competence tab, which is
 * why the drawer is non-modal (the tabs behind it stay visible and are the drop
 * targets). Nothing in here reaches the TEMPO album or any presentation: only
 * lines attached to a competence are part of the review.
 *
 * ONE selector drives both halves: it filters the list to a kind AND is the kind
 * a newly registered line gets. Splitting them would leave "register as X while
 * looking at Y", and the per-option counters would have nothing to describe.
 */
export function UnlinkedFactsDrawer({
    open, onClose, getString, facts, factTypes, isEditable,
    onCreate, onEdit, onChangeType, onDelete, setDraggedItem,
    competences, onFileInto,
}: Props) {
    const { t } = useTheme();
    const [newText, setNewText] = useState('');
    // Empty = "not chosen yet" -> the first seeded kind (fact) wins, which is
    // the default the quick registration is meant to have.
    const [kindId, setKindId] = useState<number | ''>('');
    const [editingId, setEditingId] = useState<number | null>(null);
    // Anchor of the per-row "change the kind" menu, with the row it belongs to.
    const [kindMenu, setKindMenu] = useState<{ el: HTMLElement; factId: number } | null>(null);
    // Same, for the "file into…" menu — the CLICK path for attaching a line to a
    // competence. Dragging is the desktop gesture, but HTML5 drag never fires on
    // touch, and at full width this drawer covers the competence tabs anyway — so
    // without this menu a fact could be registered but never filed on a phone.
    const [fileMenu, setFileMenu] = useState<{ el: HTMLElement; factId: number } | null>(null);

    const countByType = useMemo(() => {
        const out: Record<number, number> = {};
        for (const f of facts) {
            out[f.employee_fact_type_id] = (out[f.employee_fact_type_id] ?? 0) + 1;
        }
        return out;
    }, [facts]);

    // Until the user picks a kind, land on the first one that actually HAS lines.
    // The header badge counts both kinds, so defaulting blindly to 'fact' would
    // show "3" on the badge and "no unfiled facts" in the drawer.
    const activeKindId = kindId === ''
        ? (factTypes.find(ft => (countByType[ft.id] ?? 0) > 0)?.id ?? factTypes[0]?.id)
        : kindId;

    const visible = useMemo(
        () => facts.filter(f => f.employee_fact_type_id === activeKindId),
        [facts, activeKindId],
    );

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            variant="persistent"
            PaperProps={{
                sx: {
                    // Wide enough to read a whole line without wrapping every few
                    // words, full-width on a phone.
                    width: { xs: '100%', sm: 420, md: 520 },
                    maxWidth: '100vw',
                    p: 2,
                    bgcolor: t.cardBg,
                },
            }}
        >
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography fontWeight={700} fontSize={15}>
                    {getString('unlinkedFacts')}
                </Typography>
                <IconButton size="small" onClick={onClose}>
                    <CloseIcon sx={{ fontSize: 18 }} />
                </IconButton>
            </Stack>
            <Typography fontSize={12} color={t.textMuted} mb={2}>
                {getString('unlinkedFactsHint')}
            </Typography>

            <FormControl size="small" fullWidth sx={{ mb: 1.5 }}>
                <InputLabel id="unfiled-fact-kind-label">{getString('factKind')}</InputLabel>
                <Select
                    variant="outlined"
                    labelId="unfiled-fact-kind-label"
                    label={getString('factKind')}
                    value={activeKindId ?? ''}
                    onChange={(e) => setKindId(Number(e.target.value))}
                    // Without this the menu locks body scroll, and the page jumps
                    // sideways by the scrollbar width every time it opens.
                    MenuProps={{ disableScrollLock: true }}
                >
                    {factTypes.map(ft => (
                        <MenuItem key={ft.id} value={ft.id}>
                            {`${getString(kindLabelKey(ft.key))} (${countByType[ft.id] ?? 0})`}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            {isEditable && (
                <Stack spacing={1} mb={2}>
                    <TextField
                        size="small"
                        placeholder={getString('typeFactPlaceholder')}
                        value={newText}
                        onChange={(e) => setNewText(e.target.value)}
                        multiline
                        minRows={2}
                        fullWidth
                    />
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<AddIcon />}
                        disabled={!newText.trim() || activeKindId == null}
                        onClick={() => {
                            if (activeKindId == null) return;
                            onCreate(activeKindId, newText);
                            setNewText('');
                        }}
                        sx={{ textTransform: 'none' }}
                    >
                        {getString('registerFact')}
                    </Button>
                </Stack>
            )}

            {visible.length === 0 ? (
                <Typography fontSize={13} color={t.textMuted}>
                    {getString('noUnlinkedFacts')}
                </Typography>
            ) : (
                <Stack spacing={0.5}>
                    {visible.map((fact, idx) => (
                        <Stack
                            key={fact.id}
                            direction="row"
                            alignItems="flex-start"
                            spacing={0.5}
                            draggable={isEditable}
                            onDragStart={(e) => {
                                e.dataTransfer.effectAllowed = 'move';
                                setDraggedItem({
                                    kind: fact.employee_fact_type_key === FACT_KEY_IMPROVEMENT
                                        ? DragItemKind.Improvement
                                        : DragItemKind.Fact,
                                    // null = from the pool: there is no source list.
                                    evalId: null,
                                    index: idx,
                                    factId: fact.id,
                                    text: fact.text,
                                });
                            }}
                            onDragEnd={() => setDraggedItem(null)}
                            sx={{
                                py: 0.5, px: 0.75, borderRadius: '6px',
                                border: `1px solid ${t.borderLight}`,
                                '&:hover': { bgcolor: t.borderLight },
                            }}
                        >
                            {editingId === fact.id ? (
                                <InlineEditField
                                    initialValue={fact.text}
                                    color={t.accent}
                                    getString={getString}
                                    onSave={(text) => { onEdit(fact.id, text); setEditingId(null); }}
                                    onCancel={() => setEditingId(null)}
                                />
                            ) : (
                                <>
                                    <Box sx={{ pt: '2px', cursor: isEditable ? 'grab' : 'default' }}>
                                        <DragIndicatorIcon sx={{ fontSize: 14, opacity: 0.6 }} />
                                    </Box>
                                    <Typography
                                        fontSize={13}
                                        sx={{ flex: 1, pt: '2px', wordBreak: 'break-word' }}
                                        onDoubleClick={() => { if (isEditable) setEditingId(fact.id); }}
                                    >
                                        {fact.text}
                                    </Typography>
                                    {/* The kind is visible per row, and clicking it is
                                        how a line registered under the wrong one is
                                        corrected without retyping it. */}
                                    <Tooltip title={getString(isEditable ? 'changeFactType' : kindLabelKey(fact.employee_fact_type_key))}>
                                        <Chip
                                            size="small"
                                            label={getString(kindLabelKey(fact.employee_fact_type_key))}
                                            onClick={isEditable
                                                ? (e) => setKindMenu({ el: e.currentTarget, factId: fact.id })
                                                : undefined}
                                            sx={{ height: 20, fontSize: 10, maxWidth: 160 }}
                                        />
                                    </Tooltip>
                                    {isEditable && competences.length > 0 && (
                                        <Tooltip title={getString('fileIntoCompetence')}>
                                            <IconButton
                                                size="small"
                                                onClick={(e) => setFileMenu({ el: e.currentTarget, factId: fact.id })}
                                                sx={{ p: 0.25 }}
                                            >
                                                <PlaylistAddIcon sx={{ fontSize: 16 }} />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    {isEditable && (
                                        <Tooltip title={getString('deleteFact')}>
                                            <IconButton
                                                size="small"
                                                onClick={() => onDelete(fact)}
                                                sx={{ p: 0.25 }}
                                            >
                                                <CloseIcon sx={{ fontSize: 14 }} />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                </>
                            )}
                        </Stack>
                    ))}
                </Stack>
            )}

            <Menu
                open={kindMenu != null}
                anchorEl={kindMenu?.el ?? null}
                onClose={() => setKindMenu(null)}
                disableScrollLock
            >
                {factTypes.map(ft => (
                    <MenuItem
                        key={ft.id}
                        onClick={() => {
                            if (kindMenu) onChangeType(kindMenu.factId, ft.id);
                            setKindMenu(null);
                        }}
                    >
                        {getString(kindLabelKey(ft.key))}
                    </MenuItem>
                ))}
            </Menu>

            <Menu
                open={fileMenu != null}
                anchorEl={fileMenu?.el ?? null}
                onClose={() => setFileMenu(null)}
                disableScrollLock
            >
                {/* Which of the competence's two lists the line lands in follows the
                    line's OWN kind, exactly as dropping it does — so the menu names
                    that list rather than leaving the user to guess. */}
                <ListSubheader sx={{ lineHeight: 1.6, py: 0.5, fontSize: 11 }}>
                    {getString(kindLabelKey(
                        facts.find(f => f.id === fileMenu?.factId)?.employee_fact_type_key ?? '',
                    ))}
                </ListSubheader>
                {competences.map(c => (
                    <MenuItem
                        key={c.evalId}
                        onClick={() => {
                            if (fileMenu) onFileInto(fileMenu.factId, c.evalId);
                            setFileMenu(null);
                        }}
                    >
                        <Box sx={{
                            width: 8, height: 8, borderRadius: '50%',
                            bgcolor: c.color, mr: 1, flexShrink: 0,
                        }} />
                        {c.name}
                    </MenuItem>
                ))}
            </Menu>
        </Drawer>
    );
}
