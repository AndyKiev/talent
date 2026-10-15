// src/components/admin/department_types/organigram/DepartmentTypePalette.tsx
//
// The organigram's TYPES PANEL: every (visible) department type as a chip.
//   - colour: a type already in some link is "used" (tinted); a type in no
//     link at all is dashed — a 3-way toggle lists all / used / unused;
//   - the number on a chip = how many times the type is DRAWN in the current
//     tree (a type may hang under several parents);
//   - click = find next place in the tree (scrolled to + outlined, like
//     Ctrl+F → next), Shift+click = previous; the chip then shows k/N;
//   - in drag mode a chip is a drag source — dropping it on a card links it.
// A text filter and a sort (name / usage) sit on top. Collapsed by default,
// always open in drag mode.
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
import type { DepartmentType } from '../departmentTypeApi';
import type { DeptTypeGraph } from './buildDeptTypeGraph';
import { startDrag, type DragSource } from './organigramDrag';
import {
    TypePaletteSort,
    TypePaletteUsage,
    typePaletteSortLabel,
    typePaletteUsageLabel,
} from './typePaletteOptions';
import { useDeptTypeOrganigramStore } from '../../../../store/deptTypeOrganigramStore';
import type { GetStringFn } from '../../../../types/getStringFn';

const USAGE_ICONS = [
    { value: TypePaletteUsage.ALL, Icon: AllInclusiveIcon },
    { value: TypePaletteUsage.USED, Icon: LinkIcon },
    { value: TypePaletteUsage.UNUSED, Icon: LinkOffIcon },
] as const;

export interface FindState {
    typeId: number;
    index: number;
}

interface Props {
    types: DepartmentType[];
    graph: DeptTypeGraph;
    /** type id -> keys of its cards in the drawn tree, in tree order. */
    occurrences: Map<number, string[]>;
    dragMode: boolean;
    find: FindState | null;
    onFind: (typeId: number, step: 1 | -1) => void;
    onDragStart: (src: DragSource) => void;
    onDragEnd: () => void;
    getString: GetStringFn;
}

export function DepartmentTypePalette({
    types,
    graph,
    occurrences,
    dragMode,
    find,
    onFind,
    onDragStart,
    onDragEnd,
    getString,
}: Props) {
    const usage = useDeptTypeOrganigramStore((s) => s.paletteUsage);
    const setUsage = useDeptTypeOrganigramStore((s) => s.setPaletteUsage);
    const sort = useDeptTypeOrganigramStore((s) => s.paletteSort);
    const setSort = useDeptTypeOrganigramStore((s) => s.setPaletteSort);
    const [open, setOpen] = useState(false);
    const [filter, setFilter] = useState('');

    const isUsed = (id: number) => graph.childLinks.has(id) || graph.parentLinks.has(id);
    const countOf = (id: number) => occurrences.get(id)?.length ?? 0;

    const shown = useMemo(() => {
        const q = filter.trim().toLowerCase();
        const count = (id: number) => occurrences.get(id)?.length ?? 0;
        const used = (id: number) => graph.childLinks.has(id) || graph.parentLinks.has(id);
        return types
            .filter(
                (t) =>
                    (usage === TypePaletteUsage.ALL || used(t.id) === (usage === TypePaletteUsage.USED)) &&
                    (!q || t.name.toLowerCase().includes(q)),
            )
            .sort((a, b) =>
                sort === TypePaletteSort.USAGE
                    ? count(b.id) - count(a.id) || a.name.localeCompare(b.name)
                    : a.name.localeCompare(b.name),
            );
    }, [types, graph, occurrences, usage, filter, sort]);

    const expanded = open || dragMode;

    return (
        <Box sx={{ mb: 1 }}>
            <Button
                size="small"
                disabled={dragMode}
                onClick={() => setOpen((o) => !o)}
                endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                sx={{ textTransform: 'none' }}
            >
                {getString('deptTypeOrgTypesPanel', { count: types.length })}
            </Button>
            {expanded && (
                <Box
                    sx={{
                        border: '1px solid',
                        borderColor: 'divider',
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
                            placeholder={getString('filterByDepartmentTypeName')}
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
                            value={usage}
                            onChange={(_, v: TypePaletteUsage | null) => v && setUsage(v)}
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
                                onChange={(e) => setSort(e.target.value as TypePaletteSort)}
                            >
                                {Object.values(TypePaletteSort).map((v) => (
                                    <MenuItem key={v} value={v}>
                                        {typePaletteSortLabel(v, getString)}
                                    </MenuItem>
                                ))}
                            </Select>
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ flex: 1, minWidth: 200 }}>
                            {getString(dragMode ? 'deptTypeOrgPalette' : 'deptTypeOrgFindHint')}
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            display: 'flex',
                            gap: 0.75,
                            flexWrap: 'wrap',
                            maxHeight: 180,
                            overflowY: 'auto',
                        }}
                    >
                        {shown.length === 0 && (
                            <Typography variant="body2" color="text.secondary">
                                {getString('noMatchingDepartmentTypes')}
                            </Typography>
                        )}
                        {shown.map((t) => {
                            const n = countOf(t.id);
                            const active = find?.typeId === t.id;
                            return (
                                <Tooltip
                                    key={t.id}
                                    title={getString(isUsed(t.id) ? 'deptTypeOrgUsedHint' : 'deptTypeOrgUnusedHint', {
                                        count: n,
                                    })}
                                >
                                    <Chip
                                        size="small"
                                        variant={active ? 'filled' : 'outlined'}
                                        color={active ? 'warning' : isUsed(t.id) ? 'primary' : 'default'}
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
                                        draggable={dragMode}
                                        onDragStart={
                                            dragMode
                                                ? (e) => startDrag(e, { type: t, link: null }, onDragStart)
                                                : undefined
                                        }
                                        onDragEnd={dragMode ? onDragEnd : undefined}
                                        sx={{
                                            cursor: dragMode ? 'grab' : n > 0 ? 'pointer' : 'default',
                                            // Used = tinted solid chip; unused = dashed, muted.
                                            ...(!active &&
                                                (isUsed(t.id)
                                                    ? {
                                                          bgcolor: (theme) =>
                                                              alpha(theme.palette.primary.main, 0.18),
                                                      }
                                                    : { borderStyle: 'dashed', color: 'text.secondary' })),
                                            ...(!t.is_active && { opacity: 0.5 }),
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
