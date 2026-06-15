// src/components/ui/EmployeeAutocomplete.tsx
import { useQuery } from '@tanstack/react-query';
import { Autocomplete, TextField } from '@mui/material';
import { fetchEmployees, type Employee } from '../employees/employeeApi';

interface Props {
    value: number | null;
    onChange: (employeeId: number | null) => void;
    label: string;
    error?: boolean;
    helperText?: string;
    disabled?: boolean;
    /** Hide these employee ids from the options (e.g. already-assigned ones). */
    excludeIds?: number[];
    /** Offer only active employees. */
    activeOnly?: boolean;
}

/** Pick an employee by code/name search. Returns the selected employee id. */
export function EmployeeAutocomplete({ value, onChange, label, error, helperText, disabled, excludeIds, activeOnly }: Props) {
    const { data: allEmployees = [], isLoading } = useQuery({
        queryKey: ['employees'],
        queryFn: fetchEmployees,
        staleTime: 2 * 60 * 1000,
    });

    const exclude = new Set(excludeIds ?? []);
    const employees = allEmployees.filter(
        (e) => !exclude.has(e.id) && (!activeOnly || e.is_active),
    );

    const selected = employees.find((e) => e.id === value) ?? null;

    return (
        <Autocomplete<Employee>
            options={employees}
            loading={isLoading}
            disabled={disabled}
            value={selected}
            onChange={(_, opt) => onChange(opt?.id ?? null)}
            getOptionLabel={(e) => `${e.code} — ${e.name}`}
            isOptionEqualToValue={(opt, val) => opt.id === val.id}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label={label}
                    variant="outlined"
                    error={error}
                    helperText={helperText}
                />
            )}
        />
    );
}
