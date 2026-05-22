// CopyButtonNew.tsx
import { IconButton } from '@mui/material';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import React from 'react';

interface CopyButtonProps {
    textToCopy: string;
    onCopy: (text: string, successMessage: string) => void;
    successMessage: string;
    title: string;
    disabled?: boolean;
    size?: 'small' | 'medium';
    sx?: object;
}

export default function CopyButton({
                                       textToCopy,
                                       onCopy,
                                       successMessage,
                                       title,
                                       disabled = false,
                                       size = 'small',
                                       sx = {}
                                   }: CopyButtonProps) {
    const handleClick = (event: React.MouseEvent) => {
        event.stopPropagation();
        onCopy(textToCopy, successMessage);
    };

    if (!textToCopy) return null;

    return (
        <IconButton
            size={size}
            sx={{
                padding: '2px',
                '& .MuiSvgIcon-root': { fontSize: '16px' },
                ...sx
            }}
            color="default"
            onClick={handleClick}
            title={title}
            disabled={disabled}
        >
            <FileCopyIcon />
        </IconButton>
    );
}