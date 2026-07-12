// src/utils/dataGridSx.ts
import type { SxProps, Theme } from '@mui/material';

// Vertically center EVERY cell's content — plain text and custom renderCell
// alike — in both view and inline-edit modes. MUI DataGrid centers plain text
// by default but renders custom cell content inconsistently; forcing the cell
// to be a centering flex container fixes it uniformly. Spread this into a
// grid's `sx` (merge with any grid-specific rules) so all values line up.
export const centeredGridCellsSx: SxProps<Theme> = {
    '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center' },
    '& .MuiDataGrid-cell--editing': { display: 'flex', alignItems: 'center' },
};
