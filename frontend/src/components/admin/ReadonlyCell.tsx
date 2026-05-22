import {Box, IconButton, Tooltip, Typography} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import React from "react";

export interface ReadonlyCellProps {
    value: string;
    onEdit: (e: React.MouseEvent) => void;
    editTitle: string;
    placeholder?: string;
}
export function ReadonlyCell({ value, onEdit, editTitle, placeholder = '—' }: ReadonlyCellProps) {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                width: '100%',
                '&:hover .edit-icon': { opacity: 1 },
            }}
        >
            <Typography variant="body2" sx={{ flex: 1 }}>
                {value || placeholder}
            </Typography>
            <Tooltip title={editTitle}>
                <IconButton
                    size="small"
                    color="primary"
                    onClick={(e) => { e.stopPropagation(); onEdit(e); }}
                    className="edit-icon"
                    sx={{ padding: '2px', opacity: 0, transition: 'opacity 0.15s' }}
                >
                    <EditIcon sx={{ fontSize: '16px' }} />
                </IconButton>
            </Tooltip>
        </Box>
    );
}