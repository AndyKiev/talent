// src/components/admin/persons/usePersonColumns.tsx
import { useMemo } from 'react';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Box, Chip, IconButton, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import dayjs from 'dayjs';
import { type Person, sexLabelKey } from './personApi';
import type { GetStringFn } from '../../../types/getStringFn.ts';
import { DATE_FORMAT } from '../../../utils/eNums';
import cfl from '../../../utils/helpers.ts';

interface Props {
    getString: GetStringFn;
    onEditClick: (row: Person) => void;
    onDeleteClick: (row: Person) => void;
    deleteIsPending: boolean;
}

export function usePersonColumns({
    getString,
    onEditClick,
    onDeleteClick,
    deleteIsPending,
}: Props): GridColDef<Person>[] {
    return useMemo(
        () => [
            {
                field: 'last_name',
                headerName: cfl(getString('lastName') || 'Last name'),
                flex: 1,
                minWidth: 140,
            },
            {
                field: 'first_name',
                headerName: cfl(getString('firstName') || 'First name'),
                flex: 1,
                minWidth: 130,
            },
            {
                field: 'patronymic',
                headerName: cfl(getString('patronymic') || 'Patronymic'),
                flex: 1,
                minWidth: 130,
                valueGetter: (value: string | null) => value ?? '',
            },
            {
                field: 'sex',
                headerName: cfl(getString('sex') || 'Sex'),
                width: 100,
                valueGetter: (value: Person['sex']) =>
                    value ? getString(sexLabelKey(value)) || value : '',
            },
            {
                field: 'birth_date',
                headerName: cfl(getString('birthDate') || 'Birth date'),
                width: 120,
                valueGetter: (value: string | null) =>
                    value ? dayjs(value).format(DATE_FORMAT) : '',
            },
            {
                field: 'name_dedupe_no',
                headerName: '#',
                description: getString('nameDedupeNo') || 'Namesake number',
                width: 60,
                renderCell: (params: GridRenderCellParams<Person>) =>
                    params.row.name_dedupe_no > 0 ? (
                        <Chip size="small" label={params.row.name_dedupe_no} color="warning" />
                    ) : null,
            },
            {
                field: 'employees',
                headerName: cfl(getString('linkedEmployees') || 'Employees'),
                flex: 1.2,
                minWidth: 160,
                sortable: false,
                renderCell: (params: GridRenderCellParams<Person>) => (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {params.row.employees.map((e) => (
                            <Tooltip key={e.id} title={e.name}>
                                <Chip
                                    size="small"
                                    variant="outlined"
                                    label={e.code}
                                    sx={{ fontFamily: 'monospace' }}
                                />
                            </Tooltip>
                        ))}
                    </Box>
                ),
            },
            {
                field: 'actions',
                headerName: '',
                width: 100,
                sortable: false,
                filterable: false,
                renderCell: (params: GridRenderCellParams<Person>) => (
                    <Box>
                        <IconButton size="small" onClick={() => onEditClick(params.row)}>
                            <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                            size="small"
                            color="error"
                            disabled={deleteIsPending}
                            onClick={() => onDeleteClick(params.row)}
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Box>
                ),
            },
        ],
        [getString, onEditClick, onDeleteClick, deleteIsPending],
    );
}
