// src/components/planning/PlanValueCell.tsx
import { useRef, useState } from 'react';
import { Box, TextField, Typography } from '@mui/material';
import type { PlanScope } from './planningApi.ts';

interface Props {
    row: PlanScope;
    editable: boolean;
    isEditing: boolean;
    isPending: boolean;
    onActivate: (rowId: number) => void;
    onCommit: (row: PlanScope, value: string) => void;
    onCancel: () => void;
    hint: string;
}

/**
 * Inline plan-value editor.
 *
 * Edit affordance: double-click. Saves on blur or Enter; Esc cancels.
 *
 * The editing input is a separate component (`ValueInput`) that the parent
 * remounts via `key` whenever editing starts, so its initial state comes
 * straight from the row value — no setState-in-effect needed.
 */
export function PlanValueCell({
    row,
    editable,
    isEditing,
    isPending,
    onActivate,
    onCommit,
    onCancel,
    hint,
}: Props) {
    const display = row.value == null ? '' : String(row.value);

    if (isEditing) {
        return (
            <ValueInput
                key={`edit-${row.id}`}
                initial={display}
                isPending={isPending}
                onCommit={(val) => onCommit(row, val)}
                onCancel={onCancel}
                hint={hint}
            />
        );
    }

    return (
        <Box
            onDoubleClick={(e) => {
                if (!editable) return;
                e.stopPropagation();
                onActivate(row.id);
            }}
            sx={{
                width: '100%',
                cursor: editable ? 'pointer' : 'default',
                userSelect: 'none',
            }}
            title={editable ? hint : undefined}
        >
            <Typography variant="body2">{display || '—'}</Typography>
        </Box>
    );
}

interface ValueInputProps {
    initial: string;
    isPending: boolean;
    onCommit: (value: string) => void;
    onCancel: () => void;
    hint: string;
}

function isValid(v: string): boolean {
    const t = v.trim();
    if (t === '') return true; // empty clears the value
    const n = Number(t);
    return Number.isInteger(n) && n >= 0 && n <= 100;
}

function ValueInput({ initial, isPending, onCommit, onCancel, hint }: ValueInputProps) {
    const [draft, setDraft] = useState(initial);
    const committedRef = useRef(false);

    const commit = () => {
        if (committedRef.current) return;
        committedRef.current = true;
        if (!isValid(draft)) {
            onCancel();
            return;
        }
        onCommit(draft);
    };

    return (
        <TextField
            inputRef={(el: HTMLInputElement | null) => el?.select()}
            size="small"
            type="number"
            value={draft}
            disabled={isPending}
            error={!isValid(draft)}
            onChange={(e) => setDraft(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={commit}
            onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') {
                    e.preventDefault();
                    commit();
                } else if (e.key === 'Escape') {
                    committedRef.current = true;
                    onCancel();
                }
            }}
            slotProps={{ htmlInput: { min: 0, max: 100, step: 1, 'aria-label': hint } }}
            sx={{ width: 90 }}
            autoFocus
        />
    );
}
