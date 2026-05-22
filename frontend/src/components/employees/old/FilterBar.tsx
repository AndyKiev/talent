import { type FC } from "react";
import {
    Box,
    Paper,
    Typography,
    TextField,
    MenuItem,
    Stack,
    Button,
    InputAdornment,
} from "@mui/material";
import { useTheme } from "../../theme/ThemeContext.tsx";

interface FilterBarProps {
    orgUnitId: string;
    departmentId: string;
    search: string;
    orgUnits: string[];
    departments: string[];
    onOrgUnitChange: (val: string) => void;
    onDepartmentChange: (val: string) => void;
    onSearchChange: (val: string) => void;
    onClear: () => void;
}

const FilterBar: FC<FilterBarProps> = ({
                                           orgUnitId,
                                           departmentId,
                                           search,
                                           orgUnits,
                                           departments,
                                           onOrgUnitChange,
                                           onDepartmentChange,
                                           onSearchChange,
                                           onClear,
                                       }) => {
    const { t } = useTheme();
    const hasFilters = !!(orgUnitId || departmentId || search);

    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: "14px",
                p: "20px 24px",
                mb: 2,
                background: t.cardBg,
                boxShadow: `0 2px 12px ${t.text}06`,
            }}
        >
            <Stack
                direction="row"
                flexWrap="wrap"
                gap={2}
                alignItems="flex-end"
            >
                {/* Org unit */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.625, minWidth: 200 }}>
                    <Typography
                        variant="caption"
                        sx={{
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: t.headerText,
                        }}
                    >
                        Org unit
                    </Typography>
                    <TextField
                        select
                        size="small"
                        value={orgUnitId}
                        onChange={(e) => onOrgUnitChange(e.target.value)}
                        sx={{ minWidth: 200 }}
                        SelectProps={{ displayEmpty: true }}
                    >
                        <MenuItem value="">
                            <em style={{ color: t.textMuted, fontStyle: "normal" }}>All org units</em>
                        </MenuItem>
                        {orgUnits.map((o) => (
                            <MenuItem key={o} value={o}>
                                {o}
                            </MenuItem>
                        ))}
                    </TextField>
                </Box>

                {/* Department */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.625, minWidth: 200 }}>
                    <Typography
                        variant="caption"
                        sx={{
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: t.headerText,
                        }}
                    >
                        Department
                    </Typography>
                    <TextField
                        select
                        size="small"
                        value={departmentId}
                        onChange={(e) => onDepartmentChange(e.target.value)}
                        disabled={!orgUnitId}
                        sx={{ minWidth: 200 }}
                        SelectProps={{ displayEmpty: true }}
                    >
                        <MenuItem value="">
                            <em style={{ color: t.textMuted, fontStyle: "normal" }}>
                                {orgUnitId ? "All departments" : "Select org unit first"}
                            </em>
                        </MenuItem>
                        {departments.map((d) => (
                            <MenuItem key={d} value={d}>
                                {d}
                            </MenuItem>
                        ))}
                    </TextField>
                </Box>

                {/* Search */}
                <Box sx={{ flex: 1, minWidth: 200 }}>
                    <TextField
                        fullWidth
                        size="small"
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Search by name or matricule…"
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <span style={{ fontSize: 15 }}>🔍</span>
                                </InputAdornment>
                            ),
                        }}
                    />
                </Box>

                {/* Clear */}
                {hasFilters && (
                    <Button
                        variant="outlined"
                        onClick={onClear}
                        sx={{
                            borderColor: t.border,
                            color: t.textMuted,
                            borderRadius: "9px",
                            px: 2,
                            py: "8.5px",
                            fontSize: 13,
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                            alignSelf: "flex-end",
                        }}
                    >
                        Clear ×
                    </Button>
                )}
            </Stack>
        </Paper>
    );
};

export default FilterBar;