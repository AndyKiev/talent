import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Alert,
    Box,
    Button,
    Grid,
    IconButton,
    Snackbar,
    Stack,
    Tab,
    Tabs,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import HistoryIcon from '@mui/icons-material/History';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import {
    fetchMissionDimensionOptions,
    fetchMissions,
    type Mission,
    type MissionKpi,
} from './missionApi';
import { useMissionColumns } from './useMissionColumns';
import { useMissionMutations } from './useMissionMutations';
import { useMissionPermissions } from './useMissionPermissions';
import { MissionCard } from './MissionCard';
import { MissionFormDialog } from './MissionFormDialog';
import { MissionDeleteDialog } from './MissionDeleteDialog';
import { MissionKpiPercentDialog } from './MissionKpiPercentDialog';
import { MissionCommentsDrawer } from './MissionCommentsDrawer';
import { MissionHistoryDialog } from './MissionHistoryDialog';
import { DevelopmentVisionCard } from './DevelopmentVisionCard';
import { EMPLOYEE_MISSIONS_QK, MISSION_DIMENSION_OPTIONS_QK } from '../../utils/queryKeys';
import { centeredGridCellsSx } from '../../utils/dataGridSx';
import { useDataGridLocale } from '../../hooks/useDataGridLocale';
import { useMissionsViewStore } from '../../store/missionsViewStore';
import { useIntegerSetting } from '../../hooks/useAppSetting';
import type { GetStringFn } from '../../types/getStringFn';
import type { SnackbarType } from '../../types/types';

interface Props {
    employeeId: number;
    getString: GetStringFn;
    /** 'compact' = embedded in the people-review analysis tab (no vision card by
     *  default, tighter grid); 'full' = the employee card tab. */
    density?: 'full' | 'compact';
    showVision?: boolean;
}

/**
 * THE shared development-plan panel. Rendered by BOTH the employee card
 * `missions` tab and the people-review 3rd analysis tab, so the two can never
 * drift apart — everything host-specific arrives as a prop.
 *
 * Permission flags come from useMissionPermissions and are UI affordance only;
 * the backend re-derives all of them.
 */
export function MissionsPanel({
    employeeId,
    getString,
    density = 'full',
    showVision = true,
}: Props) {
    const [snackbar, setSnackbar] = useState<SnackbarType>({
        open: false,
        message: '',
        severity: 'success',
    });
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Mission | null>(null);
    const [deleting, setDeleting] = useState<Mission | null>(null);
    const [percentKpi, setPercentKpi] = useState<MissionKpi | null>(null);
    const [commentsMission, setCommentsMission] = useState<Mission | null>(null);
    const [historyMissionId, setHistoryMissionId] = useState<number | null>(null);
    // Employee-level history — the ONLY place a DELETED mission stays visible,
    // since the per-mission dialog is opened from a row that no longer exists.
    const [allHistoryOpen, setAllHistoryOpen] = useState(false);
    // Sub-tabs keep the panel compact: the mission list (managed BY the oversight
    // manager) and the employee's own development view are two different
    // audiences, and stacking them made the card very tall.
    const [subTab, setSubTab] = useState<'plan' | 'vision'>('plan');

    const view = useMissionsViewStore((s) => s.view);
    const setView = useMissionsViewStore((s) => s.setView);
    const localeText = useDataGridLocale();

    const { value: maxMonths } = useIntegerSetting('mission_max_duration_months', 36);
    const { value: kpiMaxLength } = useIntegerSetting('idp_kpi_max_length', 126);
    const { value: maxKpis } = useIntegerSetting('mission_max_kpis', 2);
    // Desktop column count for the card view; narrow screens force one.
    const { value: cardsPerRow } = useIntegerSetting('mission_cards_per_row', 2);

    const perm = useMissionPermissions(employeeId);

    const { data: missions = [], isLoading } = useQuery({
        queryKey: EMPLOYEE_MISSIONS_QK(employeeId),
        queryFn: () => fetchMissions(employeeId),
    });

    // Competence options come from /review_dimensions BY ID — the review
    // Evaluation rows carry only a key, and the link table references the id.
    const { data: dimensionOptions = [] } = useQuery({
        queryKey: MISSION_DIMENSION_OPTIONS_QK,
        queryFn: fetchMissionDimensionOptions,
        staleTime: 30 * 60 * 1000,
    });

    const m = useMissionMutations({
        employeeId,
        setSnackbar,
        onMissionSaved: () => {
            setFormOpen(false);
            setEditing(null);
        },
        onMissionDeleted: () => setDeleting(null),
    });

    // The comments drawer and the KPI dialog hold a snapshot of the row they were
    // opened from; re-read it from the refreshed list so they show new data after
    // a mutation instead of the stale object.
    const liveCommentsMission = useMemo(
        () => missions.find((x) => x.id === commentsMission?.id) ?? commentsMission,
        [missions, commentsMission],
    );
    const livePercentKpi = useMemo(() => {
        if (!percentKpi) return null;
        for (const mission of missions) {
            const found = mission.kpis.find((k) => k.id === percentKpi.id);
            if (found) return found;
        }
        return percentKpi;
    }, [missions, percentKpi]);

    const columns = useMissionColumns({
        getString,
        canManage: perm.canManage,
        canViewHistory: perm.canViewHistory,
        onEdit: (mission) => {
            setEditing(mission);
            setFormOpen(true);
        },
        onDelete: setDeleting,
        onOpenComments: setCommentsMission,
        onOpenHistory: (mission) => setHistoryMissionId(mission.id),
    });

    /** Editing the competence is a separate endpoint from the mission PATCH, so
     *  the form's single Save fans out into up to two calls. */
    const applyDimension = (missionId: number, dimensionId: number | null, previous: number | null) => {
        if (dimensionId === previous) return;
        if (dimensionId === null) {
            m.clearDimensionMutation.mutate({ missionId });
        } else {
            m.setDimensionMutation.mutate({ missionId, dimensionId });
        }
    };

    const kpiHandlersFor = (mission: Mission) => ({
        onAddKpi: (text: string) => m.createKpiMutation.mutate({ missionId: mission.id, text }),
        onUpdateKpiText: (kpiId: number, text: string) =>
            m.updateKpiMutation.mutate({ kpiId, missionId: mission.id, body: { text } }),
        onDeleteKpi: (kpiId: number) => m.deleteKpiMutation.mutate({ kpiId, missionId: mission.id }),
        onSetKpiPercent: (kpi: MissionKpi) => setPercentKpi(kpi),
    });

    const showTabs = showVision;

    return (
        <Box>
            {showTabs && (
                <Tabs
                    value={subTab}
                    onChange={(_, v) => setSubTab(v as 'plan' | 'vision')}
                    sx={{ mb: 2, minHeight: 36 }}
                >
                    <Tab
                        value="plan"
                        label={getString('missionsSubtabPlan')}
                        sx={{ textTransform: 'none', minHeight: 36, py: 0 }}
                    />
                    <Tab
                        value="vision"
                        label={getString('missionsSubtabVision')}
                        sx={{ textTransform: 'none', minHeight: 36, py: 0 }}
                    />
                </Tabs>
            )}

            {showTabs && subTab === 'vision' && (
                <DevelopmentVisionCard
                    employeeId={employeeId}
                    canAuthor={perm.canAuthor}
                    getString={getString}
                    onSave={(text) => m.saveVisionMutation.mutate(text)}
                    isSaving={m.saveVisionMutation.isPending}
                />
            )}

            {/* The mission list. Rendered only on its own sub-tab so the
                employee's development view does not stack below it. */}
            {(!showTabs || subTab === 'plan') && (
                <>
                {/* An oversight manager who has not switched into their role looks
                    like they have lost their rights; say why instead. */}
                {perm.oversightModeOff && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        {getString('oversightRoleNotConfigured')}
                    </Alert>
                )}

                <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ mb: 1.5 }}
                >
                    <Typography variant="subtitle2" fontWeight={600}>
                        {getString('missions')}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                        {perm.canViewHistory && (
                            <Tooltip title={getString('missionHistoryAll')}>
                                <IconButton size="small" onClick={() => setAllHistoryOpen(true)}>
                                    <HistoryIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                        <ToggleButtonGroup
                            size="small"
                            exclusive
                            value={view}
                            onChange={(_, v) => v && setView(v)}
                        >
                            <ToggleButton value="grid">
                                <ViewListIcon fontSize="small" />
                            </ToggleButton>
                            <ToggleButton value="cards">
                                <ViewModuleIcon fontSize="small" />
                            </ToggleButton>
                        </ToggleButtonGroup>
                        {perm.canManage && (
                            <Tooltip title={getString('addMission')}>
                                <Button
                                    variant="contained"
                                    size="small"
                                    startIcon={<AddIcon />}
                                    onClick={() => {
                                        setEditing(null);
                                        setFormOpen(true);
                                    }}
                                    sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                                >
                                    {getString('addMission')}
                                </Button>
                            </Tooltip>
                        )}
                    </Stack>
                </Stack>

                {!isLoading && missions.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {getString('noMissionsYet')}
                    </Typography>
                )}

                {/* Both branches render the SAME array — every filter/sort applies
                    identically whichever view is on. */}
                {view === 'grid' ? (
                    <DataGrid
                        rows={missions}
                        columns={columns}
                        loading={isLoading}
                        localeText={localeText}
                        getRowHeight={() => 'auto'}
                        hideFooterSelectedRowCount
                        disableRowSelectionOnClick
                        initialState={{
                            sorting: { sortModel: [{ field: 'start_date', sort: 'desc' }] },
                        }}
                        sx={{
                            ...centeredGridCellsSx,
                            '& .MuiDataGrid-cell': { py: 1 },
                        }}
                        autoHeight
                        density={density === 'compact' ? 'compact' : 'standard'}
                    />
                ) : (
                    <Grid container spacing={2}>
                        {missions.map((mission) => (
                            <Grid
                                key={mission.id}
                                size={{
                                    xs: 12,
                                    sm: 12,
                                    // The setting is the DESKTOP count; MUI's
                                    // 12-col grid turns it into a width. Clamped
                                    // 1..4 so a silly value cannot produce
                                    // unreadable slivers.
                                    md: Math.floor(
                                        12 / Math.min(4, Math.max(1, cardsPerRow)),
                                    ),
                                }}
                            >
                                <MissionCard
                                    mission={mission}
                                    canManage={perm.canManage}
                                    canViewHistory={perm.canViewHistory}
                                    kpiMaxLength={kpiMaxLength}
                                    getString={getString}
                                    onEdit={() => {
                                        setEditing(mission);
                                        setFormOpen(true);
                                    }}
                                    onDelete={() => setDeleting(mission)}
                                    onOpenComments={() => setCommentsMission(mission)}
                                    onOpenHistory={() => setHistoryMissionId(mission.id)}
                                    canRevert={perm.canManage && mission.can_revert}
                                    onRevert={() => m.revertMissionMutation.mutate(mission.id)}
                                    {...kpiHandlersFor(mission)}
                                />
                            </Grid>
                        ))}
                    </Grid>
                )}
                </>
            )}

            <MissionFormDialog
                open={formOpen}
                onClose={() => {
                    setFormOpen(false);
                    setEditing(null);
                }}
                mission={editing}
                dimensionOptions={dimensionOptions}
                maxMonths={maxMonths}
                kpiMaxLength={kpiMaxLength}
                maxKpis={maxKpis}
                getString={getString}
                isSaving={
                    m.createMissionMutation.isPending || m.updateMissionMutation.isPending
                }
                onCreate={(values) =>
                    m.createMissionMutation.mutate({
                        text: values.text,
                        start_date: values.start_date,
                        duration_months: values.duration_months,
                        dimension_id: values.dimension_id,
                        kpis: values.kpis,
                    })
                }
                onUpdate={(values) => {
                    if (!editing) return;
                    applyDimension(editing.id, values.dimension_id, editing.dimension_id);
                    m.updateMissionMutation.mutate({
                        missionId: editing.id,
                        body: {
                            text: values.text,
                            start_date: values.start_date,
                            duration_months: values.duration_months,
                        },
                    });
                }}
            />

            <MissionDeleteDialog
                open={deleting !== null}
                mission={deleting}
                getString={getString}
                onClose={() => setDeleting(null)}
                onConfirm={() => deleting && m.deleteMissionMutation.mutate(deleting.id)}
                isDeleting={m.deleteMissionMutation.isPending}
            />

            {/* Rendered only while a KPI is selected, so the dialog mounts fresh
                and seeds its slider from that KPI (no state-sync effect). */}
            {livePercentKpi && (
                <MissionKpiPercentDialog
                    key={livePercentKpi.id}
                    kpi={livePercentKpi}
                    getString={getString}
                    onClose={() => setPercentKpi(null)}
                    isSaving={m.updateKpiMutation.isPending}
                    onSave={(percent) => {
                        m.updateKpiMutation.mutate({
                            kpiId: livePercentKpi.id,
                            missionId: livePercentKpi.mission_id,
                            body: { percent },
                        });
                        setPercentKpi(null);
                    }}
                />
            )}

            <MissionCommentsDrawer
                open={commentsMission !== null}
                mission={liveCommentsMission}
                canAuthor={perm.canAuthor}
                getString={getString}
                onClose={() => setCommentsMission(null)}
                onAdd={(text) =>
                    commentsMission &&
                    m.createCommentMutation.mutate({ missionId: commentsMission.id, text })
                }
                onDelete={(commentId) =>
                    commentsMission &&
                    m.deleteCommentMutation.mutate({ commentId, missionId: commentsMission.id })
                }
            />

            <MissionHistoryDialog
                open={historyMissionId !== null}
                missionId={historyMissionId}
                getString={getString}
                onClose={() => setHistoryMissionId(null)}
            />

            {/* Employee-wide trail: the only view that still shows missions
                somebody deleted. */}
            <MissionHistoryDialog
                open={allHistoryOpen}
                employeeId={employeeId}
                getString={getString}
                onClose={() => setAllHistoryOpen(false)}
            />

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
            >
                <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
