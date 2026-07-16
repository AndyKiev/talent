// src/components/pickers/DepartmentJobPicker.tsx
//
// Reusable department + job picker, mirroring the employee-registration flow:
//   1. Category   (fetchDepartmentCategories, is_main)
//   2. Top unit   (fetchDepartmentsByCategory → directorate / store instances)
//   3. Tree       (DepartmentTreePicker → drill to the EXACT department; the
//                  node carries its department_type_id)
//   4. Job        (fetchJobsByDepartmentType → jobs linked to the picked
//                  department's type)  — omit with requireJob={false}
//
// Controlled by { departmentId, jobId }; emits the picked leaf values (plus
// their display names) through onChange. Designed for CREATE flows (starts
// empty); it does not reverse-resolve the category/top chain from a preset
// departmentId.
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Box,
    Chip,
    CircularProgress,
    FormControl,
    FormHelperText,
    InputLabel,
    MenuItem,
    Select,
    Typography,
} from '@mui/material';
import ApartmentIcon from '@mui/icons-material/Apartment';
import type { GetStringFn } from '../../types/getStringFn';
import cfl from '../../utils/helpers.ts';
import { fetchDepartmentCategories } from '../admin/department_categories/departmentCategoryApi';
import { fetchDepartmentsByCategory } from '../employees/employee_events/employeeEventApi';
import { fetchJobsByDepartmentType } from '../employees/jobsByDepartmentTypeApi';
import { DepartmentTreePicker } from '../employees/DepartmentTreePicker';
import type { DepartmentNode } from '../admin/departments/departmentApi';

export interface DepartmentJobValue {
    departmentId: number | null;
    jobId: number | null;
    departmentName?: string;
    jobName?: string;
}

interface Props {
    value: { departmentId: number | null; jobId: number | null };
    onChange: (value: DepartmentJobValue) => void;
    getString: GetStringFn;
    /** Include the job step (default true). */
    requireJob?: boolean;
    disabled?: boolean;
}

export function DepartmentJobPicker({ value, onChange, getString, requireJob = true, disabled }: Props) {
    const [categoryId, setCategoryId] = useState<number | ''>('');
    const [topDeptId, setTopDeptId] = useState<number | ''>('');
    const [pickedTypeId, setPickedTypeId] = useState<number | null>(null);
    const [pickedName, setPickedName] = useState('');

    const { data: categories = [] } = useQuery({
        queryKey: ['department_categories', { is_main: true }],
        queryFn: () => fetchDepartmentCategories({ is_main: true }),
        staleTime: 5 * 60 * 1000,
    });
    const { data: departments = [], isLoading: deptsLoading } = useQuery({
        queryKey: ['departments_by_category', categoryId],
        queryFn: () => fetchDepartmentsByCategory(categoryId as number),
        enabled: categoryId !== '',
        staleTime: 2 * 60 * 1000,
    });
    const { data: jobs = [], isLoading: jobsLoading } = useQuery({
        queryKey: ['jobs_by_dept_type', pickedTypeId],
        queryFn: () => fetchJobsByDepartmentType(pickedTypeId as number),
        enabled: pickedTypeId != null,
        staleTime: 2 * 60 * 1000,
    });

    const handleCategory = (id: number) => {
        setCategoryId(id);
        setTopDeptId('');
        setPickedTypeId(null);
        setPickedName('');
        onChange({ departmentId: null, jobId: null });
    };

    const handleTopDept = (id: number) => {
        const opt = departments.find((d) => d.id === id);
        setTopDeptId(id);
        if (opt) {
            setPickedTypeId(opt.department_type_id);
            setPickedName(opt.name);
            onChange({ departmentId: opt.id, jobId: null, departmentName: opt.name });
        }
    };

    const handleTreeSelect = (node: DepartmentNode) => {
        setPickedTypeId(node.department_type_id);
        setPickedName(node.name);
        onChange({ departmentId: node.id, jobId: null, departmentName: node.name });
    };

    const handleJob = (jobId: number) => {
        const job = jobs.find((j) => j.id === jobId);
        onChange({
            departmentId: value.departmentId,
            jobId,
            departmentName: pickedName,
            jobName: job?.name,
        });
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* 1 — Category */}
            <FormControl fullWidth disabled={disabled}>
                <InputLabel required>{cfl(getString('departmentCategory') || 'Department category')}</InputLabel>
                <Select
                    variant="outlined"
                    value={categoryId}
                    label={cfl(getString('departmentCategory') || 'Department category')}
                    onChange={(e) => handleCategory(Number(e.target.value))}
                >
                    {categories.map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                            {c.name}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            {/* 2 — Top unit */}
            <FormControl fullWidth disabled={disabled || categoryId === '' || deptsLoading}>
                <InputLabel required>{cfl(getString('topDepartment') || 'Top department')}</InputLabel>
                <Select
                    variant="outlined"
                    value={topDeptId}
                    label={cfl(getString('topDepartment') || 'Top department')}
                    onChange={(e) => handleTopDept(Number(e.target.value))}
                    startAdornment={deptsLoading ? <CircularProgress size={16} sx={{ mr: 1 }} /> : undefined}
                >
                    {categoryId === '' && (
                        <MenuItem disabled value="">
                            <em>{getString('firstSelectCategory') || 'First select a category'}</em>
                        </MenuItem>
                    )}
                    {departments.map((d) => (
                        <MenuItem key={d.id} value={d.id}>
                            {d.name}
                        </MenuItem>
                    ))}
                </Select>
                {categoryId !== '' && !deptsLoading && departments.length === 0 && (
                    <FormHelperText>{getString('noDepartmentsInCategory') || 'No departments in this category'}</FormHelperText>
                )}
            </FormControl>

            {/* 3 — Tree drill-down */}
            {topDeptId !== '' && (
                <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        {getString('selectExactDepartmentHint') || 'Select the exact department in the tree (or keep the top one)'}
                    </Typography>
                    <DepartmentTreePicker
                        rootId={topDeptId as number}
                        selectedId={value.departmentId}
                        onSelect={handleTreeSelect}
                    />
                    {pickedName && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                            <ApartmentIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">
                                {pickedName}
                            </Typography>
                            {value.departmentId != null && (
                                <Chip size="small" label={`#${value.departmentId}`} sx={{ height: 20, fontSize: '0.7rem' }} />
                            )}
                        </Box>
                    )}
                </Box>
            )}

            {/* 4 — Job (from the picked department's type) */}
            {requireJob && (
                <FormControl fullWidth disabled={disabled || pickedTypeId == null || jobsLoading}>
                    <InputLabel required>{cfl(getString('job') || 'Job')}</InputLabel>
                    <Select
                        variant="outlined"
                        value={value.jobId ?? ''}
                        label={cfl(getString('job') || 'Job')}
                        onChange={(e) => handleJob(Number(e.target.value))}
                        startAdornment={jobsLoading ? <CircularProgress size={16} sx={{ mr: 1 }} /> : undefined}
                    >
                        {pickedTypeId == null && (
                            <MenuItem disabled value="">
                                <em>{getString('firstSelectDepartment') || 'First select a department'}</em>
                            </MenuItem>
                        )}
                        {jobs.map((j) => (
                            <MenuItem key={j.id} value={j.id}>
                                {j.name}
                            </MenuItem>
                        ))}
                    </Select>
                    {pickedTypeId != null && !jobsLoading && jobs.length === 0 && (
                        <FormHelperText error>
                            {getString('noJobsForDepartmentType') || 'No jobs linked to this department type.'}
                        </FormHelperText>
                    )}
                </FormControl>
            )}
        </Box>
    );
}
