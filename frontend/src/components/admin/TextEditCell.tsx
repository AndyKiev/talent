import { useState } from 'react';
import { Box, IconButton, TextField } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";

interface TextEditCellProps {
    value: string;
    onSave: (value: string) => void;  // now receives the final value
    onCancel: () => void;
    isPending: boolean;
}

export function TextEditCell({ value: initialValue, onSave, onCancel, isPending }: TextEditCellProps) {
    const [value, setValue] = useState(initialValue);

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: '100%' }}>
            <TextField
                size="small"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') onSave(value);
                    else if (e.key === 'Escape') onCancel();
                }}
                onClick={(e) => e.stopPropagation()}
                disabled={isPending}
                autoFocus
                fullWidth
            />
            <IconButton size="small" color="success"
                        onClick={(e) => { e.stopPropagation(); onSave(value); }}
                        disabled={isPending}>
                <CheckIcon sx={{ fontSize: '16px' }} />
            </IconButton>
            <IconButton size="small" color="error"
                        onClick={(e) => { e.stopPropagation(); onCancel(); }}
                        disabled={isPending}>
                <CloseIcon sx={{ fontSize: '16px' }} />
            </IconButton>
        </Box>
    );
}