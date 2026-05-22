import { useState, useMemo, useCallback, type FC } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
    Box,
    Typography,
    Button,
    Paper,
    Chip,
    Stack,
} from "@mui/material";
import { AgGridReact } from "ag-grid-react";
import type {
    ColDef,
    GridReadyEvent,
    RowClickedEvent,
    ICellRendererParams,
    CellStyle,
} from "ag-grid-community";
import {
    AllCommunityModule,
    ModuleRegistry,
    themeQuartz,
    colorSchemeDark  // Import this for dark mode
} from "ag-grid-community";
import { useTheme } from "../../theme/ThemeContext.tsx";
import { useEmployeeStore, type Employee } from "../../../store/employeeStore.ts";

import FilterBar from "./FilterBar.tsx";
import { PeopleAltRounded } from "@mui/icons-material";


// ─── AG Grid v33+ uses the theme object API — no CSS imports needed ───────────
ModuleRegistry.registerModules([AllCommunityModule]);

// Build theme instances once, outside the component (stable references)
const agLightTheme = themeQuartz;
const agDarkTheme = themeQuartz.withPart(colorSchemeDark);  // Use the proper dark color scheme
// ─── Constants ───────────────────────────────────────────────────────────────

const TALENT_STATUS_META: Record<string, { label: string; color: string }> = {
    PO: { label: "Potential",        color: "#4a7cf7" },
    PA: { label: "Confirmed Talent", color: "#3dba7e" },
    NA: { label: "Not Assessed",     color: "#8a96a8" },
};

const ORG_UNITS = [
    "Central Office",
    "Warehouse North",
    "Pick-up Zone A",
    "Pick-up Zone B",
];

const DEPARTMENTS: Record<string, string[]> = {
    "Central Office":  ["IT", "Finance", "HR"],
    "Warehouse North": ["Logistics", "Sales"],
    "Pick-up Zone A":  ["Sales", "Logistics"],
    "Pick-up Zone B":  ["Sales"],
};

// ─── Cell Renderers ──────────────────────────────────────────────────────────

const NameCellRenderer: FC<ICellRendererParams<Employee>> = ({ data }) => {
    if (!data) return null;
    const hue = (data.id * 47) % 360;
    return (
        <Stack direction="row" alignItems="center" spacing={1.25} height="100%">
            <Box
                sx={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    flexShrink: 0,
                    background: `hsl(${hue}, 50%, 30%)`,
                    color: `hsl(${hue}, 70%, 80%)`,
                }}
            >
                {data.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
            </Box>
            <Typography variant="body2" fontWeight={600} noWrap>
                {data.name}
            </Typography>
        </Stack>
    );
};

const MatriculeCellRenderer: FC<ICellRendererParams<Employee>> = ({ data, context }) => {
    if (!data) return null;
    return (
        <Stack direction="row" alignItems="center" height="100%">
            <Box
                component="span"
                sx={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 13,
                    borderRadius: "6px",
                    px: 1,
                    py: 0.25,
                    background: context?.t?.pillBg,
                    color: context?.t?.textMid,
                    border: `1px solid ${context?.t?.borderLight}`,
                }}
            >
                {data.matricule}
            </Box>
        </Stack>
    );
};

const TalentBadgeCellRenderer: FC<ICellRendererParams<Employee>> = ({ data }) => {
    if (!data) return null;
    const meta = TALENT_STATUS_META[data.talentStatus] ?? {
        label: data.talentStatus,
        color: "#8a96a8",
    };
    return (
        <Stack direction="row" alignItems="center" height="100%">
            <Chip
                label={meta.label}
                size="small"
                icon={
                    <Box
                        component="span"
                        sx={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: meta.color,
                            ml: "8px !important",
                            mr: "-4px !important",
                            flexShrink: 0,
                        }}
                    />
                }
                sx={{
                    background: `${meta.color}18`,
                    color: meta.color,
                    fontWeight: 700,
                    fontSize: 11,
                    letterSpacing: "0.05em",
                    height: 24,
                    border: "none",
                    "& .MuiChip-label": { px: 1.25 },
                }}
            />
        </Stack>
    );
};

const ArrowCellRenderer: FC<ICellRendererParams<Employee>> = () => (
    <Stack direction="row" alignItems="center" justifyContent="flex-end" height="100%" pr={1}>
        <Typography sx={{ fontSize: 16, color: "text.disabled", transition: "color 0.12s" }}>
            →
        </Typography>
    </Stack>
);

// ─── Component ───────────────────────────────────────────────────────────────

const EmployeeList: FC = () => {
    const { t, mode } = useTheme();
    const navigate = useNavigate();
    const employees = useEmployeeStore((state) => state.employees);

    const [orgUnitId,    setOrgUnitId]    = useState("");
    const [departmentId, setDepartmentId] = useState("");
    const [search,       setSearch]       = useState("");

    const availableDepts = useMemo<string[]>(() => {
        if (!orgUnitId) return [];
        return DEPARTMENTS[orgUnitId] ?? [];
    }, [orgUnitId]);

    const rowData = useMemo<Employee[]>(() => {
        let rows = employees;
        if (orgUnitId)    rows = rows.filter((e) => e.orgUnit    === orgUnitId);
        if (departmentId) rows = rows.filter((e) => e.department === departmentId);
        if (search.trim()) {
            const q = search.toLowerCase();
            rows = rows.filter(
                (e) =>
                    e.name.toLowerCase().includes(q) ||
                    e.matricule.toLowerCase().includes(q)
            );
        }
        return rows;
    }, [employees, orgUnitId, departmentId, search]);

    const columnDefs = useMemo<ColDef<Employee>[]>(
        () => [
            {
                field: "name",
                headerName: "Name",
                flex: 2,
                minWidth: 200,
                cellRenderer: NameCellRenderer,
                sortable: true,
            },
            {
                field: "matricule",
                headerName: "Matricule",
                flex: 1,
                minWidth: 140,
                cellRenderer: MatriculeCellRenderer,
                sortable: true,
            },
            {
                field: "position",
                headerName: "Position",
                flex: 1.5,
                minWidth: 160,
                sortable: true,
                cellStyle: { color: t.textMid, display: "flex", alignItems: "center" } as CellStyle,
            },
            {
                field: "talentStatus",
                headerName: "Status",
                flex: 1.2,
                minWidth: 160,
                cellRenderer: TalentBadgeCellRenderer,
                sortable: true,
            },
            {
                field: "id",
                headerName: "",
                width: 56,
                sortable: false,
                cellRenderer: ArrowCellRenderer,
                cellStyle: { padding: 0, display: "flex", alignItems: "center" } as CellStyle,
            },
        ],
        [t]
    );

    const defaultColDef = useMemo<ColDef>(
        () => ({
            resizable: false,
            suppressMovable: true,
            cellStyle: { display: "flex", alignItems: "center" } as CellStyle,
        }),
        []
    );

    const onRowClicked = useCallback(
       async (e: RowClickedEvent<Employee>) => {
            if (!e.data) return;
            await navigate({ to: "/employees/$employeeId/edit", params: { employeeId: String(e.data.id) } });
        },
        [navigate]
    );

    const onGridReady = useCallback((_params: GridReadyEvent) => {}, []);

    const contextLabel = useMemo(() => {
        if (orgUnitId && departmentId) return `${orgUnitId} · ${departmentId}`;
        if (orgUnitId) return orgUnitId;
        return null;
    }, [orgUnitId, departmentId]);

    // ── AG Grid v33+ theme object API ─────────────────────────────────────────
    // Using the theme prop (not className) is the only way dark mode works
    // reliably in v33+. The CSS variable overrides below are still respected.
    const agTheme = mode === "dark" ? agDarkTheme : agLightTheme;

    return (
        <Box
            sx={{
                minHeight: "100vh",
                background: t.bg,
                py: 5,
                px: 2.5,
                transition: "background 0.3s",
            }}
        >
            {/*<Box sx={{ maxWidth: 960, mx: "auto" }}>*/}
            <Box sx={{ maxWidth: 1260, mx: "auto" }}>
                {/* Header */}
                <Stack
                    direction="row"
                    alignItems="flex-start"
                    justifyContent="space-between"
                    flexWrap="wrap"
                    gap={2}
                    mb={3.5}
                >
                    <Box>
                        {/*<Typography*/}
                        {/*    variant="h5"*/}
                        {/*    fontWeight={700}*/}
                        {/*    letterSpacing="-0.02em"*/}
                        {/*    color={t.text}*/}
                        {/*>*/}
                        {/*    Employees11*/}
                        {/*</Typography>*/}

                        <Stack direction="row" alignItems="center" spacing={1.5} mb={4}>
                            <PeopleAltRounded sx={{ color: t.accent, fontSize: 28 }} />
                            <Box>
                                <Typography variant="h5" fontWeight={700} letterSpacing="-0.02em" color={t.text}>
                                    Employees
                                </Typography>
                            </Box>
                        </Stack>


                        <Typography variant="body2" color={t.textMuted} mt={0.5}>
                            {contextLabel ? (
                                <>
                                    Showing results for{" "}
                                    <Box component="strong" sx={{ color: t.accent }}>
                                        {contextLabel}
                                    </Box>
                                </>
                            ) : (
                                "All employees"
                            )}
                        </Typography>
                    </Box>

                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Button
                            variant="contained"
                            disableElevation
                            onClick={() => navigate({ to: "/employees/new" })}
                            sx={{
                                background: `linear-gradient(135deg, ${t.accent}, #2d5eed)`,
                                borderRadius: "10px",
                                px: 2.5,
                                py: 1.25,
                                fontSize: 13,
                                fontWeight: 600,
                                boxShadow: "0 4px 14px rgba(74,124,247,0.2)",
                                "&:hover": { opacity: 0.9 },
                            }}
                        >
                            + Add employee
                        </Button>
                    </Stack>
                </Stack>

                {/* Filter bar */}
                <FilterBar
                    orgUnitId={orgUnitId}
                    departmentId={departmentId}
                    search={search}
                    orgUnits={ORG_UNITS}
                    departments={availableDepts}
                    onOrgUnitChange={(v) => { setOrgUnitId(v); setDepartmentId(""); }}
                    onDepartmentChange={setDepartmentId}
                    onSearchChange={setSearch}
                    onClear={() => { setOrgUnitId(""); setDepartmentId(""); setSearch(""); }}
                />

                {/* Grid card */}
                <Paper
                    elevation={0}
                    sx={{
                        borderRadius: "14px",
                        overflow: "hidden",
                        boxShadow: `0 2px 24px ${t.text}08`,
                        background: t.cardBg,
                    }}
                >
                    {/* Row count info bar */}
                    <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        px={2.5}
                        py={1.5}
                        sx={{ borderBottom: `1px solid ${t.borderLight}` }}
                    >
                        <Typography variant="caption" fontWeight={600} color={t.textMuted}>
                            {rowData.length} employee{rowData.length !== 1 ? "s" : ""} found
                        </Typography>
                        <Typography variant="caption" color={t.textFaint} fontWeight={600}>
                            Click a row to edit
                        </Typography>
                    </Stack>

                    {/* AG Grid — theme prop replaces className in v33+ */}
                    <Box
                        sx={{
                            width: "100%",
                            // CSS variable overrides still work with the theme prop API
                            "--ag-background-color":          t.cardBg,
                            "--ag-odd-row-background-color":  t.rowAlt,
                            "--ag-header-background-color":   t.headerBg,
                            "--ag-border-color":              t.borderLight,
                            "--ag-row-hover-color":           t.rowHover,
                            "--ag-foreground-color":          t.text,
                            "--ag-header-foreground-color":   t.headerText,
                            "--ag-font-family":               "'DM Sans', 'Segoe UI', sans-serif",
                            "--ag-font-size":                 "14px",
                            "--ag-row-height":                "52px",
                            "--ag-header-height":             "44px",
                            "--ag-cell-horizontal-padding":   "16px",
                            "--ag-border-radius":             "0px",
                            "--ag-wrapper-border-radius":     "0px",
                            "--ag-row-border-color":          t.borderLight,
                            "--ag-selected-row-background-color": `${t.accent}18`,
                            "& .ag-root-wrapper": { border: "none" },
                            "& .ag-header-cell-text": {
                                fontSize: "11px",
                                fontWeight: 700,
                                letterSpacing: "0.08em",
                                textTransform: "uppercase",
                            },
                            "& .ag-row": { cursor: "pointer", transition: "background 0.12s" },
                            "& .ag-cell:focus": { outline: "none !important", border: "none !important" },
                        }}
                    >
                        <AgGridReact<Employee>
                            theme={agTheme}
                            rowData={rowData}
                            columnDefs={columnDefs}
                            defaultColDef={defaultColDef}
                            onRowClicked={onRowClicked}
                            onGridReady={onGridReady}
                            context={{ t }}
                            domLayout="autoHeight"
                            suppressCellFocus
                            animateRows
                        />
                    </Box>

                    {/* Empty state */}
                    {rowData.length === 0 && (
                        <Box py={8} textAlign="center">
                            <Typography fontSize={32} mb={1.25}>
                                🔍
                            </Typography>
                            <Typography variant="body2" color={t.textFaint}>
                                {orgUnitId
                                    ? "No employees match the current filters."
                                    : "No employees found."}
                            </Typography>
                        </Box>
                    )}
                </Paper>
            </Box>
        </Box>
    );
};

export default EmployeeList;