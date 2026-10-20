// src/components/employees/employee_events/MainDepartmentPicker.tsx
// MAIN_DEPT_CHANGE value picker: main category -> top instance -> exact
// department in the tree. A sole category is picked automatically.
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Collapse, FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material';
import { fetchDepartmentsByCategory, fetchMainDepartmentCategories } from './employeeEventApi';
import { DepartmentTreePicker } from '../DepartmentTreePicker';
import type { DepartmentNode } from '../../admin/departments/departmentApi';
import type { GetStringFn } from '../../../types/getStringFn';
import cfl from '../../../utils/helpers.ts';

interface Props {
    value: number | null;
    onChange: (departmentId: number | null) => void;
    /** The employee's current main department(s) — warned against. */
    currentMainDeptIds: number[];
    getString: GetStringFn;
}

export function MainDepartmentPicker({ value, onChange, currentMainDeptIds, getString }: Props) {
    const [categoryPick, setCategoryPick] = useState<number | ''>('');
    const [topDeptId, setTopDeptId] = useState<number | ''>('');

    const { data: categories = [] } = useQuery({
        queryKey: ['main-department-categories'],
        queryFn: fetchMainDepartmentCategories,
        staleTime: 10 * 60 * 1000,
    });
    const singleCategoryId = categories.length === 1 ? categories[0].id : null;
    const categoryId: number | '' = categoryPick !== '' ? categoryPick : (singleCategoryId ?? '');

    const { data: deptsByCategory = [] } = useQuery({
        queryKey: ['departments-by-category', categoryId],
        queryFn: () => fetchDepartmentsByCategory(categoryId as number),
        enabled: categoryId !== '',
        staleTime: 5 * 60 * 1000,
    });

    const categoryLabel = cfl(getString('departmentCategory') || 'Department category');
    const topLabel = cfl(getString('topDepartment') || 'Top department');

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
                        setTopDeptId('');
                        onChange(null);
                    }}
                >
                    {categories.map((cat) => (
                        <MenuItem key={cat.id} value={cat.id}>
                            {cat.name}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            <Collapse in={categoryId !== ''} unmountOnExit>
                <FormControl fullWidth size="small">
                    <InputLabel>{topLabel}</InputLabel>
                    <Select
                        variant="outlined"
                        value={topDeptId}
                        label={topLabel}
                        onChange={(e) => {
                            const id = Number(e.target.value);
                            setTopDeptId(id);
                            // Seed selection with the top instance; the tree can refine it.
                            onChange(id);
                        }}
                    >
                        {deptsByCategory.map((d) => (
                            <MenuItem key={d.id} value={d.id}>
                                {d.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Collapse>

            <Collapse in={topDeptId !== ''} unmountOnExit>
                <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        {cfl(getString('selectExactDepartmentHint') ||
                            'Select the exact department in the tree (or keep the top one)')}
                    </Typography>
                    <DepartmentTreePicker
                        rootId={topDeptId as number}
                        selectedId={value}
                        onSelect={(node: DepartmentNode) => onChange(node.id)}
                    />
                    {value != null && currentMainDeptIds.includes(value) && (
                        <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5 }}>
                            {getString('alreadyMainDepartment') ||
                                'This is already a main department for this employee.'}
                        </Typography>
                    )}
                </Box>
            </Collapse>
        </>
    );
}
