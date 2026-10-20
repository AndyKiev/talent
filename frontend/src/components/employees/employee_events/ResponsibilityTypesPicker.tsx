// src/components/employees/employee_events/ResponsibilityTypesPicker.tsx
// RESPONSIBILITY_DEPTS_CHANGE value picker: responsibility category -> the
// department TYPES of the employee's main-department children in it.
// A sole category is picked automatically (dropdown disabled).
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Chip, FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material';
import {
    fetchResponsibilityListCategories,
    fetchResponsibilityTypeOptions,
    type DepartmentCategoryOption,
    type ResponsibilityTypeOption,
} from './employeeEventApi';
import type { GetStringFn } from '../../../types/getStringFn';
import cfl from '../../../utils/helpers.ts';

interface Props {
    employeeId: number;
    hasMainDepartment: boolean;
    value: number[];
    onChange: (typeIds: number[]) => void;
    getString: GetStringFn;
}

export function ResponsibilityTypesPicker({ employeeId, hasMainDepartment, value, onChange, getString }: Props) {
    const [categoryPick, setCategoryPick] = useState<number | ''>('');

    const { data: categories = [] } = useQuery<DepartmentCategoryOption[]>({
        queryKey: ['responsibility-list-categories'],
        queryFn: fetchResponsibilityListCategories,
        staleTime: 5 * 60 * 1000,
    });
    const singleCategoryId = categories.length === 1 ? categories[0].id : null;
    const categoryId: number | '' = categoryPick !== '' ? categoryPick : (singleCategoryId ?? '');

    const { data: typeOptions = [] } = useQuery<ResponsibilityTypeOption[]>({
        queryKey: ['responsibility-type-options', employeeId, categoryId],
        queryFn: () => fetchResponsibilityTypeOptions(employeeId, categoryId as number),
        enabled: hasMainDepartment && categoryId !== '',
        staleTime: 5 * 60 * 1000,
    });

    if (!hasMainDepartment) {
        return (
            <Typography variant="body2" color="text.secondary">
                {cfl(getString('responsibilityNeedsMainDept') ||
                    'Assign a main department first to choose responsibility departments')}
            </Typography>
        );
    }
    if (categories.length === 0) {
        return (
            <Typography variant="body2" color="text.secondary">
                {cfl(getString('noResponsibilityCategories') || 'No responsibility categories configured')}
            </Typography>
        );
    }

    const categoryLabel = cfl(getString('departmentCategory') || 'Department category');
    const typesLabel = cfl(getString('responsibilityDepts') || 'Responsibility departments');

    return (
        <>
            <FormControl fullWidth size="small">
                <InputLabel>{categoryLabel}</InputLabel>
                <Select
                    variant="outlined"
                    value={categoryId}
                    label={categoryLabel}
                    disabled={singleCategoryId != null}
                    onChange={(e) => {
                        setCategoryPick(e.target.value as number);
                        onChange([]);
                    }}
                >
                    {categories.map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                            {c.name}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            {categoryId !== '' && (
                <FormControl fullWidth size="small">
                    <InputLabel>{typesLabel}</InputLabel>
                    <Select
                        multiple
                        variant="outlined"
                        value={value}
                        label={typesLabel}
                        onChange={(e) =>
                            onChange(typeof e.target.value === 'string' ? [] : (e.target.value as number[]))
                        }
                        renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {(selected as number[]).map((id) => (
                                    <Chip
                                        key={id}
                                        size="small"
                                        label={typeOptions.find((o) => o.id === id)?.name ?? `#${id}`}
                                    />
                                ))}
                            </Box>
                        )}
                    >
                        {typeOptions.map((o) => (
                            <MenuItem key={o.id} value={o.id}>
                                {o.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            )}
        </>
    );
}
