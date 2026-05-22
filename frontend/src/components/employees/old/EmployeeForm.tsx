import React, { useState, useEffect, type FC } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
    Box,
    Typography,
    Button,
    Paper,
    Tabs,
    Tab,
    TextField,
    MenuItem,
    FormControl,
    FormLabel,
    FormHelperText,
    Stack,
    Divider,
    LinearProgress,
    Alert,
    Chip,
    CircularProgress,
} from "@mui/material";
import { useTheme } from "../../theme/ThemeContext.tsx";
import { useEmployeeStore } from "../../../store/employeeStore.ts";
import { useQuery } from "@tanstack/react-query";
import {
    fetchActivePairs,
    type TalentStatusPeriodLinkWithLabel,
} from "../../admin/talent-status-period-links/talentStatusPeriodLinkApi.ts";

// ─── Constants ───────────────────────────────────────────────────────────────
const MOCK_ORG_UNITS = [
    "Central Office",
    "Warehouse North",
    "Pick-up Zone A",
    "Pick-up Zone B",
];
const MOCK_DEPARTMENTS: Record<string, string[]> = {
    "Central Office": ["IT", "Finance", "HR"],
    "Warehouse North": ["Logistics", "Sales"],
    "Pick-up Zone A": ["Sales", "Logistics"],
    "Pick-up Zone B": ["Sales"],
};
const MOCK_POSITIONS = [
    "Analyst",
    "Team Lead",
    "Specialist",
    "Coordinator",
    "Manager",
];
const MOCK_COMPANY_STATUSES = [
    "Active",
    "Military Service",
    "Maternity Leave",
    "Left Company",
];

// ─── Query key — shared with CRUD so no extra network request if already cached
export const ACTIVE_PAIRS_QK = ["talent_status_period_links", "active-pairs", true] as const;

// ─── Types ────────────────────────────────────────────────────────────────────
type TabId = 0 | 1 | 2; // 0=org, 1=talent, 2=contact

interface FormState {
    name: string;
    matricule: string;
    orgUnit: string;
    department: string;
    position: string;
    companyStatus: string;
    /** ID of the selected TalentStatusPeriodLink — single source of truth for talent */
    talentStatusPeriodLinkId: number | undefined;
    targetPosition: string;
    email: string;
}

interface ValidationErrors {
    [key: string]: string;
}

interface EmployeeFormProps {
    employeeId?: number | null;
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
interface FieldProps {
    label: string;
    required?: boolean;
    hint?: string;
    error?: string;
    children: React.ReactNode;
}

const Field: FC<FieldProps> = ({ label, required, hint, error, children }) => (
    <FormControl fullWidth error={!!error}>
        <FormLabel
            sx={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                mb: 0.75,
                color: "text.secondary",
                "&.Mui-focused": { color: "text.secondary" },
            }}
        >
            {label}
            {required && (
                <Box component="span" sx={{ color: "error.main", ml: 0.5 }}>
                    *
                </Box>
            )}
        </FormLabel>
        {children}
        {(hint || error) && (
            <FormHelperText sx={{ mx: 0, mt: 0.5 }}>
                {error || hint}
            </FormHelperText>
        )}
    </FormControl>
);

// ─── Section divider ──────────────────────────────────────────────────────────
const SectionHeader: FC<{ label: string }> = ({ label }) => (
    <Stack direction="row" alignItems="center" gap={1.5} my={0.5}>
        <Typography
            variant="caption"
            sx={{
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "text.disabled",
                whiteSpace: "nowrap",
            }}
        >
            {label}
        </Typography>
        <Divider sx={{ flex: 1 }} />
    </Stack>
);

// ─── Progress strip ───────────────────────────────────────────────────────────
const ProgressStrip: FC<{ completed: number; total: number; label: string }> = ({
                                                                                    completed,
                                                                                    total,
                                                                                    label,
                                                                                }) => {
    const pct = total > 0 ? (completed / total) * 100 : 0;
    const done = completed === total;
    return (
        <Box
            sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: "action.hover",
                display: "flex",
                alignItems: "center",
                gap: 1.5,
            }}
        >
            <LinearProgress
                variant="determinate"
                value={pct}
                sx={{
                    flex: 1,
                    height: 4,
                    borderRadius: 4,
                    bgcolor: "divider",
                    "& .MuiLinearProgress-bar": {
                        bgcolor: done ? "#3dba7e" : "primary.main",
                        borderRadius: 4,
                    },
                }}
            />
            <Typography
                variant="caption"
                fontWeight={600}
                noWrap
                color={done ? "#3dba7e" : "text.secondary"}
            >
                {label}
            </Typography>
        </Box>
    );
};

// ─── Component ────────────────────────────────────────────────────────────────
const EmployeeForm: FC<EmployeeFormProps> = ({ employeeId = null }) => {
    const { t } = useTheme();
    const navigate = useNavigate();
    const getEmployee = useEmployeeStore((state) => state.getEmployee);
    const addEmployee = useEmployeeStore((state) => state.addEmployee);
    const updateEmployee = useEmployeeStore((state) => state.updateEmployee);
    const [activeTab, setActiveTab] = useState<TabId>(0);
    const [showSuccess, setShowSuccess] = useState(false);
    const [errors, setErrors] = useState<ValidationErrors>({});

    const isNew = employeeId === null;

    const [form, setForm] = useState<FormState>({
        name: "",
        matricule: "",
        orgUnit: "",
        department: "",
        position: "",
        companyStatus: "Active",
        talentStatusPeriodLinkId: undefined,
        targetPosition: "",
        email: "",
    });

    // ── Fetch active talent pairs ─────────────────────────────────────────────
    const { data: talentPairs = [], isLoading: talentPairsLoading } = useQuery({
        queryKey: ACTIVE_PAIRS_QK,
        queryFn: () => fetchActivePairs(true),
        staleTime: 5 * 60 * 1000,
    });

    // ── Load existing employee ────────────────────────────────────────────────
    useEffect(() => {
        if (employeeId) {
            const emp = getEmployee(employeeId);
            if (emp) {
                setForm({
                    name: emp.name,
                    matricule: emp.matricule,
                    orgUnit: emp.orgUnit,
                    department: emp.department,
                    position: emp.position,
                    companyStatus: emp.companyStatus,
                    talentStatusPeriodLinkId: emp.talentStatusPeriodLinkId ?? undefined,
                    targetPosition: emp.targetPosition,
                    email: emp.email,
                });
            }
        }
    }, [employeeId, getEmployee]);

    const set =
        (field: keyof FormState) =>
            (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | string) => {
                const val = typeof e === "string" ? e : e.target.value;
                setForm((f) => ({ ...f, [field]: val }));
                if (errors[field]) {
                    setErrors((prev) => {
                        const next = { ...prev };
                        delete next[field];
                        return next;
                    });
                }
            };

    const availableDepts = form.orgUnit ? MOCK_DEPARTMENTS[form.orgUnit] ?? [] : [];

    const selectedPair: TalentStatusPeriodLinkWithLabel | null =
        talentPairs.find((p) => p.id === form.talentStatusPeriodLinkId) ?? null;

    // ── Completion ────────────────────────────────────────────────────────────
    const orgCompletion = (() => {
        const fields = [
            { value: form.name, editable: isNew },
            { value: form.matricule, editable: isNew },
            { value: form.orgUnit, editable: true },
            { value: form.department, editable: true },
            { value: form.position, editable: true },
        ];
        const editable = fields.filter((f) => f.editable);
        return {
            completed: editable.filter((f) => f.value).length,
            total: editable.length,
        };
    })();

    const talentCompletion = (() => {
        const vals = [form.talentStatusPeriodLinkId, form.targetPosition];
        return { completed: vals.filter(Boolean).length, total: 2 };
    })();

    const contactCompletion = { completed: form.email ? 1 : 0, total: 1 };

    // ── Validation ────────────────────────────────────────────────────────────
    const validateForm = (): boolean => {
        const e: ValidationErrors = {};
        if (isNew) {
            if (!form.name.trim()) e.name = "Name is required";
            if (!form.matricule.trim()) e.matricule = "Matricule is required";
        }
        if (!form.orgUnit) e.orgUnit = "Org unit is required";
        if (!form.department) e.department = "Department is required";
        if (!form.position) e.position = "Position is required";
        if (!form.talentStatusPeriodLinkId) e.talentStatusPeriodLinkId = "Talent assignment is required";
        if (!form.targetPosition) e.targetPosition = "Target position is required";

        setErrors(e);
        if (Object.keys(e).length > 0) {
            if (e.name || e.matricule || e.orgUnit || e.department || e.position) setActiveTab(0);
            else if (e.talentStatusPeriodLinkId || e.targetPosition) setActiveTab(1);
        }
        return Object.keys(e).length === 0;
    };

    const handleSave = () => {
        if (!validateForm()) return;

        // FIX 1: Added missing properties required by Omit<Employee, "id">
        const payload = {
            name: form.name,
            matricule: form.matricule,
            orgUnit: form.orgUnit,
            department: form.department,
            position: form.position,
            companyStatus: form.companyStatus,
            talentStatusPeriodLinkId: form.talentStatusPeriodLinkId as number,
            targetPosition: form.targetPosition,
            email: form.email,
            talentStatus: selectedPair?.talent_status?.key ?? "",
            talentStatusLabel: selectedPair?.label ?? "",
            talentPeriod: selectedPair?.talent_period?.description ?? "",
        };
        console.log("payload", payload);

        if (!isNew && employeeId) {
            updateEmployee(employeeId, payload);
        } else {
            addEmployee(payload);
        }
        setShowSuccess(true);
        setTimeout(() => {
            setShowSuccess(false);
            navigate({ to: "/employees" });
        }, 1400);
    };

    // ── Tab label ─────────────────────────────────────────────────────────────
    const TabLabel: FC<{ label: string; icon: string; completed: number; total: number }> = ({
                                                                                                 label,
                                                                                                 icon,
                                                                                                 completed,
                                                                                                 total,
                                                                                             }) => {
        const done = completed === total;
        const started = completed > 0 && !done;
        return (
            <Stack direction="row" alignItems="center" spacing={0.75}>
                <span>{icon}</span>
                <span>{label}</span>
                {started && (
                    <Box sx={{ width: 6, height: 6, borderRadius: "50%", background: "#f7a94a" }} />
                )}
                {done && (
                    <Chip
                        label="✓"
                        size="small"
                        sx={{
                            height: 16,
                            fontSize: 9,
                            fontWeight: 700,
                            bgcolor: "#3dba7e",
                            color: "#fff",
                            "& .MuiChip-label": { px: 0.75 },
                        }}
                    />
                )}
            </Stack>
        );
    };

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
            <Box sx={{ maxWidth: 700, mx: "auto" }}>
                {showSuccess && (
                    <Alert severity="success" sx={{ mb: 2.5, borderRadius: 2, fontWeight: 600 }}>
                        {isNew ? "Employee created successfully!" : "Changes saved successfully!"}
                    </Alert>
                )}

                {/* Header */}
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={3.5}>
                    <Box>
                        <Button
                            variant="text"
                            size="small"
                            onClick={() => navigate({ to: "/employees" })}
                            sx={{ color: t.textMuted, p: 0, mb: 0.75, fontSize: 13, fontWeight: 500, minWidth: 0 }}
                        >
                            ← Employee list
                        </Button>
                        <Typography variant="h5" fontWeight={700} letterSpacing="-0.02em" color={t.text}>
                            {isNew ? "Add employee" : "Edit employee"}
                        </Typography>
                        <Stack direction="row" gap={1} mt={0.75}>
                            <Chip
                                label={isNew ? "New record" : "Editing"}
                                size="small"
                                sx={{
                                    bgcolor: isNew ? `${t.accent}18` : "#f7a94a18",
                                    color: isNew ? t.accent : "#f7a94a",
                                    fontWeight: 700,
                                    fontSize: 11,
                                    height: 22,
                                }}
                            />
                        </Stack>
                    </Box>
                    <Button
                        variant="contained"
                        disableElevation
                        onClick={handleSave}
                        sx={{
                            background: `linear-gradient(135deg, ${t.accent}, #2d5eed)`,
                            borderRadius: "10px",
                            px: 3,
                            py: 1.25,
                            fontWeight: 600,
                            fontSize: 14,
                            boxShadow: "0 4px 14px rgba(74,124,247,0.2)",
                            "&:hover": { opacity: 0.9 },
                        }}
                    >
                        {isNew ? "Create employee" : "Save changes"}
                    </Button>
                </Stack>

                {/* Card */}
                <Paper
                    elevation={0}
                    sx={{
                        borderRadius: "16px",
                        overflow: "hidden",
                        background: t.cardBg,
                        boxShadow: `0 2px 24px ${t.text}08`,
                    }}
                >
                    <Box sx={{ background: t.cardBg2, borderBottom: `1.5px solid ${t.borderLight}` }}>
                        <Tabs
                            value={activeTab}
                            onChange={(_, v: TabId) => setActiveTab(v)}
                            textColor="primary"
                            indicatorColor="primary"
                            variant="fullWidth"
                        >
                            <Tab
                                value={0}
                                label={
                                    <TabLabel label="Organisation" icon="🏢" completed={orgCompletion.completed} total={orgCompletion.total} />
                                }
                            />
                            <Tab
                                value={1}
                                label={
                                    <TabLabel label="Talent" icon="⭐" completed={talentCompletion.completed} total={talentCompletion.total} />
                                }
                            />
                            <Tab
                                value={2}
                                label={
                                    <TabLabel label="Contact" icon="✉️" completed={contactCompletion.completed} total={contactCompletion.total} />
                                }
                            />
                        </Tabs>
                    </Box>

                    <Box p={{ xs: 3, sm: 4 }}>
                        {/* ── ORG TAB ── */}
                        {activeTab === 0 && (
                            <Stack spacing={2.5}>
                                <ProgressStrip
                                    completed={orgCompletion.completed}
                                    total={orgCompletion.total}
                                    label={`${orgCompletion.completed}/${orgCompletion.total} fields`}
                                />
                                <SectionHeader label="Identity" />
                                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                                    <Field label="Full name" required error={errors.name}>
                                        <TextField
                                            fullWidth
                                            size="small"
                                            value={form.name}
                                            onChange={set("name")}
                                            placeholder="e.g. Olena Kovalenko"
                                            disabled={!isNew}
                                            error={!!errors.name}
                                        />
                                    </Field>
                                    <Field label="Matricule" required hint="Unique company ID" error={errors.matricule}>
                                        <TextField
                                            fullWidth
                                            size="small"
                                            value={form.matricule}
                                            onChange={set("matricule")}
                                            placeholder="e.g. UA-00412"
                                            disabled={!isNew}
                                            error={!!errors.matricule}
                                            inputProps={{ style: { fontFamily: "'JetBrains Mono', monospace" } }}
                                        />
                                    </Field>
                                </Box>
                                <SectionHeader label="Placement" />
                                <Field label="Org unit" required hint="Administrative grouping" error={errors.orgUnit}>
                                    <TextField
                                        select
                                        fullWidth
                                        size="small"
                                        value={form.orgUnit}
                                        onChange={(e) =>
                                            setForm((f) => ({ ...f, orgUnit: e.target.value, department: "" }))
                                        }
                                        error={!!errors.orgUnit}
                                    >
                                        {MOCK_ORG_UNITS.map((o) => (
                                            <MenuItem key={o} value={o}>
                                                {o}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Field>
                                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                                    <Field label="Department" required error={errors.department}>
                                        <TextField
                                            select
                                            fullWidth
                                            size="small"
                                            value={form.department}
                                            onChange={set("department")}
                                            disabled={!form.orgUnit}
                                            error={!!errors.department}
                                        >
                                            {availableDepts.length === 0 ? (
                                                <MenuItem value="" disabled>Select org unit first</MenuItem>
                                            ) : (
                                                availableDepts.map((d) => (
                                                    <MenuItem key={d} value={d}>
                                                        {d}
                                                    </MenuItem>
                                                ))
                                            )}
                                        </TextField>
                                    </Field>
                                    <Field label="Current position" required hint="Must match allowed types" error={errors.position}>
                                        <TextField
                                            select
                                            fullWidth
                                            size="small"
                                            value={form.position}
                                            onChange={set("position")}
                                            disabled={!form.department}
                                            error={!!errors.position}
                                        >
                                            {MOCK_POSITIONS.map((p) => (
                                                <MenuItem key={p} value={p}>
                                                    {p}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                    </Field>
                                </Box>
                                <SectionHeader label="Status" />
                                <Field label="Company status" required>
                                    <TextField
                                        select
                                        fullWidth
                                        size="small"
                                        value={form.companyStatus}
                                        onChange={set("companyStatus")}
                                    >
                                        {MOCK_COMPANY_STATUSES.map((s) => (
                                            <MenuItem key={s} value={s}>
                                                {s}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Field>
                            </Stack>
                        )}

                        {/* ── TALENT TAB ── */}
                        {activeTab === 1 && (
                            <Stack spacing={2.5}>
                                <ProgressStrip
                                    completed={talentCompletion.completed}
                                    total={talentCompletion.total}
                                    label={`${talentCompletion.completed}/${talentCompletion.total} required`}
                                />
                                <SectionHeader label="Assessment" />

                                <Field
                                    label="Talent assignment"
                                    required
                                    hint={talentPairsLoading ? "Loading…" : "Status and review period combined"}
                                    error={errors.talentStatusPeriodLinkId}
                                >
                                    <TextField
                                        select
                                        fullWidth
                                        size="small"
                                        value={form.talentStatusPeriodLinkId ?? ""}
                                        onChange={(e) => {
                                            // FIX 2: Ensure return type matches `number | undefined`
                                            const val = e.target.value === "" || e.target.value === " " ? undefined : Number(e.target.value);
                                            setForm((f) => ({ ...f, talentStatusPeriodLinkId: val }));
                                            if (errors.talentStatusPeriodLinkId) {
                                                setErrors((p) => {
                                                    const n = { ...p };
                                                    delete n.talentStatusPeriodLinkId;
                                                    return n;
                                                });
                                            }
                                        }}
                                        error={!!errors.talentStatusPeriodLinkId}
                                        disabled={talentPairsLoading}
                                        slotProps={{
                                            select: {
                                                displayEmpty: true,
                                                renderValue: (val) => {
                                                    if (!val) return (
                                                        <Typography variant="body2" color="text.disabled">
                                                            Select talent assignment
                                                        </Typography>
                                                    );
                                                    const pair = talentPairs.find((p) => p.id === val);
                                                    return pair?.label ?? String(val);
                                                },
                                            },
                                        }}
                                    >
                                        {talentPairsLoading ? (
                                            <MenuItem disabled>
                                                <CircularProgress size={14} sx={{ mr: 1 }} /> Loading…
                                            </MenuItem>
                                        ) : talentPairs.length === 0 ? (
                                            <MenuItem disabled>No active assignments available</MenuItem>
                                        ) : (
                                            talentPairs.map((pair) => (
                                                <MenuItem key={pair.id} value={pair.id}>
                                                    {pair.label}
                                                </MenuItem>
                                            ))
                                        )}
                                    </TextField>
                                </Field>

                                {selectedPair && (
                                    <Box
                                        sx={{
                                            p: 1.5,
                                            borderRadius: 2,
                                            bgcolor: `${t.accent}08`,
                                            border: `1.5px solid ${t.accent}20`,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1.5,
                                        }}
                                    >
                                        <Chip
                                            label={selectedPair.talent_status?.key ?? "—"}
                                            size="small"
                                            sx={{ fontWeight: 700, bgcolor: `${t.accent}18`, color: t.accent }}
                                        />
                                        <Typography variant="body2" color="text.secondary">
                                            {selectedPair.talent_status?.name}
                                        </Typography>
                                        <Divider orientation="vertical" flexItem />
                                        <Typography variant="body2" color="text.secondary">
                                            {selectedPair.talent_period?.description ?? `${selectedPair.talent_period?.name} months`}
                                        </Typography>
                                    </Box>
                                )}

                                <SectionHeader label="Development" />
                                <Field label="Target position" required hint="Required for all talent assignments" error={errors.targetPosition}>
                                    <TextField
                                        select
                                        fullWidth
                                        size="small"
                                        value={form.targetPosition}
                                        onChange={set("targetPosition")}
                                        error={!!errors.targetPosition}
                                    >
                                        {MOCK_POSITIONS.map((p) => (
                                            <MenuItem key={p} value={p}>
                                                {p}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Field>

                                <Box
                                    sx={{
                                        p: 2,
                                        borderRadius: 2,
                                        background: `${t.accent}08`,
                                        border: `1.5px solid ${t.accent}20`,
                                        fontSize: 13,
                                        lineHeight: 1.5,
                                    }}
                                >
                                    <Typography variant="body2" fontWeight={700} color={t.textMid} mb={0.5}>
                                        📅 Monthly snapshot
                                    </Typography>
                                    <Typography variant="body2" color={t.textMuted}>
                                        Current talent data will be included in the next monthly snapshot on the 1st of the following month.
                                    </Typography>
                                </Box>
                            </Stack>
                        )}

                        {/* ── CONTACT TAB ── */}
                        {activeTab === 2 && (
                            <Stack spacing={2.5}>
                                <ProgressStrip
                                    completed={contactCompletion.completed}
                                    total={contactCompletion.total}
                                    label={`${contactCompletion.completed}/${contactCompletion.total} optional`}
                                />
                                <SectionHeader label="Email" />
                                <Field label="Corporate email" hint="Used for system notifications">
                                    <TextField
                                        fullWidth
                                        size="small"
                                        value={form.email}
                                        onChange={set("email")}
                                        placeholder="e.g. o.kovalenko@company.com"
                                        type="email"
                                    />
                                </Field>
                                <Box
                                    sx={{
                                        p: 2,
                                        borderRadius: 2,
                                        background: "#f7a94a08",
                                        border: "1.5px solid #f7a94a25",
                                        lineHeight: 1.5,
                                    }}
                                >
                                    <Typography variant="body2" fontWeight={700} color={t.textMid} mb={0.5}>
                                        📬 Optional field
                                    </Typography>
                                    <Typography variant="body2" color={t.textMuted}>
                                        Email is only required if this employee has system access (HRM / HSR role).
                                    </Typography>
                                </Box>
                            </Stack>
                        )}
                    </Box>
                </Paper>

                {/* Footer nav */}
                <Stack direction="row" justifyContent="space-between" mt={2} px={0.5}>
                    <Button
                        variant="outlined"
                        disabled={activeTab === 0}
                        onClick={() => setActiveTab((prev) => (prev - 1) as TabId)}
                        sx={{
                            borderColor: t.border,
                            color: activeTab === 0 ? t.textFaint : t.textMuted,
                            borderRadius: "9px",
                            px: 2.25,
                            fontWeight: 600,
                            fontSize: 13,
                        }}
                    >
                        ← Previous
                    </Button>
                    <Button
                        variant="outlined"
                        disabled={activeTab === 2}
                        onClick={() => setActiveTab((prev) => (prev + 1) as TabId)}
                        sx={{
                            borderColor: t.border,
                            color: activeTab === 2 ? t.textFaint : t.textMuted,
                            borderRadius: "9px",
                            px: 2.25,
                            fontWeight: 600,
                            fontSize: 13,
                        }}
                    >
                        Next →
                    </Button>
                </Stack>
            </Box>
        </Box>
    );
};

export default EmployeeForm;