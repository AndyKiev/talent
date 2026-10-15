// src/components/admin/department_types/organigram/OrganigramPalette.tsx
//
// The organigram's side PANEL of chips — one generic component for both the
// department types and the jobs:
//   - colour: an item already in some link is "used" (tinted in the panel's
//     accent); an item in no link at all is dashed and muted — a 3-way toggle
//     lists all / used / unused;
//   - the number on a chip = how many cards of the CURRENT drawn tree carry
//     the item (a type drawn under several parents; a job linked to several
//     types);
//   - click = find next such card (scrolled to + outlined, like Ctrl+F →
//     next), Shift+click = previous; the chip then shows k/N;
//   - when `draggable`, a chip is a drag source — dropping it on a card links.
// A text filter and a sort (name / usage) sit on top. Collapsed by default,
// always open while draggable.
import { useMemo, useState } from 'react';
import {
    Box,
    Button,
    Chip,
    InputAdornment,
    MenuItem,
    Select,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
    alpha,
} from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import AllInclusiveIcon from '@mui/icons-material/AllInclusive';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import {
    TypePaletteSort,
    TypePaletteUsage,
    typePaletteSortLabel,
    typePaletteUsageLabel,
} from './typePaletteOptions';
import type { GetStringFn } from '../../../../types/getStringFn';

const USAGE_ICONS = [
    { value: TypePaletteUsage.ALL, Icon: AllInclusiveIcon },
    { value: TypePaletteUsage.USED, Icon: LinkIcon },
    { value: TypePaletteUsage.UNUSED, Icon: LinkOffIcon },
] as const;

export interface PaletteItem {
    id: number;
    name: string;
    isActive: boolean;
    /** In at least one link. */
    used: boolean;
}

export interface FindState {
    id: number;
    index: number;
}

interface Props {
    items: PaletteItem[];
    /** item id -> keys of the drawn cards carrying it, in tree order. */
    occurrences: Map<number, string[]>;
    usage: TypePaletteUsage;
    onUsageChange: (usage: TypePaletteUsage) => void;
    sort: TypePaletteSort;
    onSortChange: (sort: TypePaletteSort) => void;
    /** Panel accent: types blue (info), jobs green (success). */
    accent: 'info' | 'success';
    /** Already-resolved texts. */
    title: string;
    filterPlaceholder: string;
    emptyText: string;
    hint: string;
    usedHint: (count: number) => string;
    unusedHint: string;
    draggable: boolean;
    find: FindState | null;
    onFind: (id: number, step: 1 | -1) => void;
    onItemDragStart: (e: React.DragEvent, id: number) => void;
    onDragEnd: () => void;
    getString: GetStringFn;
}

export function OrganigramPalette({
    items,
    occurrences,
    usage,
    onUsageChange,
    sort,
    onSortChange,
    accent,
    title,
    filterPlaceholder,
    emptyText,
    hint,
    usedHint,
    unusedHint,
    draggable,
    find,
    onFind,
    onItemDragStart,
    onDragEnd,
    getString,
}: Props) {
    const [open, setOpen] = useState(false);
    const [filter, setFilter] = useState('');

    const shown = useMemo(() => {
        const q = filter.trim().toLowerCase();
        const count = (id: number) => occurrences.get(id)?.length ?? 0;
        return items
            .filter(
                (t) =>
                    (usage === TypePaletteUsage.ALL || t.used === (usage === TypePaletteUsage.USED)) &&
                    (!q || t.name.toLowerCase().includes(q)),
            )
            .sort((a, b) =>
                sort === TypePaletteSort.USAGE
                    ? count(b.id) - count(a.id) || a.name.localeCompare(b.name)
                    : a.name.localeCompare(b.name),
            );
    }, [items, occurrences, usage, filter, sort]);

    const expanded = open || draggable;

    return (
        <Box sx={{ mb: 1 }}>
            <Button
                size="small"
                color={accent}
                disabled={draggable}
                onClick={() => setOpen((o) => !o)}
                endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                sx={{ textTransform: 'none' }}
            >
                {title}
            </Button>
            {expanded && (
                <Box
                    sx={{
                        border: '1px solid',
                        borderColor: draggable ? `${accent}.main` : 'divider',
                        borderRadius: 1,
                        p: 1,
                        mt: 0.5,
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 1 }}>
                        <TextField
                            size="small"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            placeholder={filterPlaceholder}
                            sx={{ minWidth: 260, flex: '0 1 360px' }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <ToggleButtonGroup
                            size="small"
                            exclusive
                            color={accent}
                            value={usage}
                            onChange={(_, v: TypePaletteUsage | null) => v && onUsageChange(v)}
                        >
                            {USAGE_ICONS.map(({ value, Icon }) => (
                                <ToggleButton key={value} value={value} sx={{ py: 0.5 }}>
                                    <Tooltip title={typePaletteUsageLabel(value, getString)}>
                                        <Icon fontSize="small" />
                                    </Tooltip>
                                </ToggleButton>
                            ))}
                        </ToggleButtonGroup>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2">{getString('deptTypeOrgSort')}</Typography>
                            <Select
                                variant="outlined"
                                size="small"
                                value={sort}
                                onChange={(e) => onSortChange(e.target.value as TypePaletteSort)}
                            >
                                {Object.values(TypePaletteSort).map((v) => (
                                    <MenuItem key={v} value={v}>
                                        {typePaletteSortLabel(v, getString)}
                                    </MenuItem>
                                ))}
                            </Select>
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ flex: 1, minWidth: 200 }}>
                            {hint}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', maxHeight: 180, overflowY: 'auto' }}>
                        {shown.length === 0 && (
                            <Typography variant="body2" color="text.secondary">
                                {emptyText}
                            </Typography>
                        )}
                        {shown.map((t) => {
                            const n = occurrences.get(t.id)?.length ?? 0;
                            const active = find?.id === t.id;
                            return (
                                <Tooltip key={t.id} title={t.used ? usedHint(n) : unusedHint}>
                                    <Chip
                                        size="small"
                                        variant={active ? 'filled' : 'outlined'}
                                        color={active ? 'warning' : t.used ? accent : 'default'}
                                        label={
                                            <>
                                                {t.name}
                                                <Box
                                                    component="span"
                                                    sx={{ ml: 0.75, fontFamily: 'monospace', opacity: 0.8 }}
                                                >
                                                    {active && n > 0 ? `${find.index + 1}/${n}` : n}
                                                </Box>
                                            </>
                                        }
                                        onClick={n > 0 ? (e) => onFind(t.id, e.shiftKey ? -1 : 1) : undefined}
                                        draggable={draggable}
                                        onDragStart={draggable ? (e) => onItemDragStart(e, t.id) : undefined}
                                        onDragEnd={draggable ? onDragEnd : undefined}
                                        sx={{
                                            cursor: draggable ? 'grab' : n > 0 ? 'pointer' : 'default',
                                            // Used = tinted solid chip; unused = dashed, muted.
                                            ...(!active &&
                                                (t.used
                                                    ? {
                                                          bgcolor: (theme) =>
                                                              alpha(theme.palette[accent].main, 0.18),
                                                      }
                                                    : { borderStyle: 'dashed', color: 'text.secondary' })),
                                            ...(!t.isActive && { opacity: 0.5 }),
                                        }}
                                    />
                                </Tooltip>
                            );
                        })}
                    </Box>
                </Box>
            )}
        </Box>
    );
}
