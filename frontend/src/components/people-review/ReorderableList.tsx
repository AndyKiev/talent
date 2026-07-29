// src/components/people-review/ReorderableList.tsx
//
// Generic drag-and-drop reorderable list, reused by the people-review session
// presentation queue (SessionEmployeesPage) and the admin reviewer roster
// (EmployeeAssignmentPanel). Uses native HTML5 drag-and-drop (no extra
// dependency), mirroring the fact/improvement reorder UX in DimensionPanel.tsx,
// plus up / down / to-top / to-bottom arrow controls.
//
// The parent owns the data: on any reorder this calls onReorder(orderedIds) with
// the full new top-to-bottom id order, which the parent persists (server assigns
// positions 10, 20, 30 …). Rows are expected to arrive already in their stored
// order; the displayed position number is (index + 1) * 10 to match the backend.
import { useState } from 'react';
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import KeyboardDoubleArrowUpIcon from '@mui/icons-material/KeyboardDoubleArrowUp';
import KeyboardDoubleArrowDownIcon from '@mui/icons-material/KeyboardDoubleArrowDown';
import type { GetStringFn } from '../../types/getStringFn';
import { useTheme } from '../theme/useTheme';

interface ReorderableListProps<T> {
    rows: T[];
    getRowId: (row: T) => number;
    renderRow: (row: T) => React.ReactNode;
    onReorder: (orderedIds: number[]) => void;
    getString: GetStringFn;
    /**
     * Label shown left of each row. Defaults to the backend queue position
     * ((index + 1) * 10); pass e.g. `(i) => String(i + 1)` for a plain ranking
     * that has no server-side position behind it.
     */
    positionLabel?: (index: number) => string;
}

/** Move the element at `from` to position `to`, returning a new array. */
function moveItem<T>(arr: T[], from: number, to: number): T[] {
    if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) {
        return arr;
    }
    const next = [...arr];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
}

export function ReorderableList<T>({
    rows, getRowId, renderRow, onReorder, getString,
    positionLabel = (index) => String((index + 1) * 10),
}: ReorderableListProps<T>) {
    const { t } = useTheme();

    // Optimistic local copy: reorders apply here instantly so the move is shown in
    // real time, while onReorder persists to the DB in the background. We re-sync
    // from `rows` only when the server's SET of ids changes (add/remove), so an
    // in-flight refetch that returns the pre-save order can't snap our move back.
    // Adjust-during-render — no effect needed.
    const [order, setOrder] = useState<T[]>(rows);
    const idsKey = rows.map(getRowId).slice().sort((a, b) => a - b).join(',');
    const [prevIdsKey, setPrevIdsKey] = useState(idsKey);
    if (prevIdsKey !== idsKey) {
        setPrevIdsKey(idsKey);
        setOrder(rows);
    }

    // Index of the row being dragged, and the row currently hovered as a drop
    // target (for the top-border drop indicator). Both reset on drag end.
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const move = (from: number, to: number) => {
        const next = moveItem(order, from, to);
        if (next === order) return;
        setOrder(next);               // instant visual update
        onReorder(next.map(getRowId)); // persist in background
    };

    return (
        <Stack spacing={0.5}>
            {order.map((row, idx) => {
                const isDragging = draggedIndex === idx;
                const isFirst = idx === 0;
                const isLast = idx === order.length - 1;
                return (
                    <Stack
                        key={getRowId(row)}
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        onDragOver={(e) => {
                            if (draggedIndex === null) return;
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            if (dragOverIndex !== idx) setDragOverIndex(idx);
                        }}
                        onDragLeave={() => { if (dragOverIndex === idx) setDragOverIndex(null); }}
                        onDrop={(e) => {
                            e.preventDefault();
                            const from = draggedIndex;
                            setDragOverIndex(null);
                            setDraggedIndex(null);
                            if (from === null || from === idx) return;
                            move(from, idx);
                        }}
                        sx={{
                            py: 1,
                            px: 1.25,
                            borderRadius: '8px',
                            border: `1px solid ${t.borderLight}`,
                            bgcolor: t.cardBg,
                            opacity: isDragging ? 0.4 : 1,
                            borderTop: dragOverIndex === idx
                                ? `2px solid ${t.accent}`
                                : `1px solid ${t.borderLight}`,
                            transition: 'background 0.15s',
                            '&:hover': { bgcolor: `${t.accent}08` },
                        }}
                    >
                        <Tooltip title={getString('dragToReorderQueue')}>
                            <Box
                                draggable
                                onDragStart={(e) => {
                                    e.dataTransfer.effectAllowed = 'move';
                                    e.dataTransfer.setData('text/plain', String(getRowId(row)));
                                    setDraggedIndex(idx);
                                }}
                                onDragEnd={() => { setDraggedIndex(null); setDragOverIndex(null); }}
                                sx={{
                                    display: 'flex', alignItems: 'center',
                                    cursor: 'grab', color: t.textMuted,
                                    '&:active': { cursor: 'grabbing' },
                                }}
                            >
                                <DragIndicatorIcon sx={{ fontSize: 18 }} />
                            </Box>
                        </Tooltip>

                        <Typography
                            fontSize={12}
                            fontWeight={700}
                            color={t.textMuted}
                            sx={{ minWidth: 28, textAlign: 'right' }}
                        >
                            {positionLabel(idx)}
                        </Typography>

                        <Box sx={{ flex: 1, minWidth: 0 }}>{renderRow(row)}</Box>

                        <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
                            <Tooltip title={getString('moveToTop')}>
                                <span>
                                    <IconButton size="small" disabled={isFirst} onClick={() => move(idx, 0)} sx={{ p: 0.5 }}>
                                        <KeyboardDoubleArrowUpIcon sx={{ fontSize: 18 }} />
                                    </IconButton>
                                </span>
                            </Tooltip>
                            <Tooltip title={getString('moveUp')}>
                                <span>
                                    <IconButton size="small" disabled={isFirst} onClick={() => move(idx, idx - 1)} sx={{ p: 0.5 }}>
                                        <ArrowUpwardIcon sx={{ fontSize: 18 }} />
                                    </IconButton>
                                </span>
                            </Tooltip>
                            <Tooltip title={getString('moveDown')}>
                                <span>
                                    <IconButton size="small" disabled={isLast} onClick={() => move(idx, idx + 1)} sx={{ p: 0.5 }}>
                                        <ArrowDownwardIcon sx={{ fontSize: 18 }} />
                                    </IconButton>
                                </span>
                            </Tooltip>
                            <Tooltip title={getString('moveToBottom')}>
                                <span>
                                    <IconButton size="small" disabled={isLast} onClick={() => move(idx, order.length - 1)} sx={{ p: 0.5 }}>
                                        <KeyboardDoubleArrowDownIcon sx={{ fontSize: 18 }} />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </Stack>
                    </Stack>
                );
            })}
        </Stack>
    );
}
