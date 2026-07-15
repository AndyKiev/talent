// src/components/admin/jobs/useJobColumns.tsx
import React from 'react';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Box, Chip, IconButton, MenuItem, Select, Switch, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupsIcon from '@mui/icons-material/Groups';
import WorkspacesIcon from '@mui/icons-material/Workspaces';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import BadgeIcon from '@mui/icons-material/Badge';
import SchoolIcon from '@mui/icons-material/School';
import ChecklistIcon from '@mui/icons-material/Checklist';

import type { Job, ProcessRoleLinkInfo } from './jobApi';
import type { JobCategory } from '../job_categories/jobCategoryApi';
import type { GetStringFn } from '../../../types/getStringFn';
import { TextEditCell } from '../TextEditCell';
import { ReadonlyCell } from '../ReadonlyCell';
import { formatToUkrDate } from '../../../utils/dateFormatter';
import cfl, {snakeToCamel} from '../../../utils/helpers.ts';

export interface EditingState {
  rowId: number | null;
  field: string | null;
}

interface Params {
  getString: GetStringFn;
  editingState: EditingState;
  onEditFieldClick: (row: Job, field: string, e: React.MouseEvent) => void;
  onRequestSave: (row: Job, field: string, newValue: string) => void;
  onCancelEdit: () => void;
  updateIsPending: boolean;
  onToggleActive: (row: Job) => void;
  toggleIsPending: boolean;
  onGroupsClick: (row: Job) => void;       // user-groups dialog
  onJobGroupsClick: (row: Job) => void;    // job-groups dialog (new)
  onProcessRoleClick: (row: Job) => void;  // process-role dialog
  onTrainingTypesClick: (row: Job) => void;  // recommended-trainings dialog
  onRequirementsClick: (row: Job) => void;  // recruitment requirement-groups dialog
  onDeleteClick: (row: Job) => void;
  deleteIsPending: boolean;
  categories: JobCategory[];                       // options for the category select
  onSetCategory: (row: Job, jobCategoryId: number) => void;
  setCategoryIsPending: boolean;
  trainingModuleOn: boolean;  // training_module_enabled master switch
  recruitmentModuleOn: boolean;  // recruitment_module_enabled master switch
  editMode: boolean;          // OFF = read-only grid (no inline edits/toggles/delete)
}

export function useJobColumns({
                                getString,
                                editingState,
                                onEditFieldClick,
                                onRequestSave,
                                onCancelEdit,
                                updateIsPending,
                                onToggleActive,
                                toggleIsPending,
                                 onGroupsClick,
                                 onJobGroupsClick,
                                 onProcessRoleClick,
                                 onTrainingTypesClick,
                                 onRequirementsClick,
                                 onDeleteClick,
                                deleteIsPending,
                                 categories,
                                 onSetCategory,
                                 setCategoryIsPending,
                                 trainingModuleOn,
                                 recruitmentModuleOn,
                                 editMode,
                              }: Params): GridColDef[] {
  function textEditCol(
      field: keyof Job,
      headerKey: string,
      width: number,
      flex?: number,
      minWidth?: number,
  ): GridColDef {
    return {
      field: field as string,
      headerName: cfl(getString(headerKey)) || headerKey,
      width: flex ? undefined : width,
      flex,
      minWidth,
      renderCell: (params: GridRenderCellParams<Job>) => {
        const row = params.row;
        const isEditing =
            editMode && editingState.rowId === row.id && editingState.field === field;
        const value = String((row as unknown as Record<string, unknown>)[field] ?? '');
        return isEditing ? (
            <TextEditCell
                value={value}
                onSave={(val) => onRequestSave(row, field as string, val)}
                onCancel={onCancelEdit}
                isPending={updateIsPending}
            />
        ) : (
            <ReadonlyCell
                value={value}
                onEdit={editMode ? (e) => onEditFieldClick(row, field as string, e) : undefined}
                editTitle={`${getString('edit')} ${getString(snakeToCamel(field))}`}
                placeholder="—"
            />
        );
      },
    };
  }

  return [
    textEditCol('name', 'name', 200, 1.5, 260),

    textEditCol('short_name', 'shortName', 160),

    textEditCol('key', 'key', 160),

    textEditCol('description', 'description', 260, 1),

    // Existing: user-groups column
    {
      field: 'groups',
      headerName: cfl(getString('groups')) || 'Groups',
      width: 200,
      sortable: false,
      renderCell: (params: GridRenderCellParams<Job>) => {
        const row = params.row;
        const groups: string[] = row.groups ?? [];
        return (
            <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', py: 0.5, cursor: 'pointer' }}
                onClick={() => onGroupsClick(row)}
            >
              {groups.length === 0 ? (
                  <Chip
                      label={getString('noGroups') || 'No groups'}
                      size="small"
                      variant="outlined"
                      color="default"
                      icon={<GroupsIcon />}
                      onClick={() => onGroupsClick(row)}
                  />
              ) : (
                  groups.map((g) => (
                      <Chip key={g} label={g} size="small" variant="outlined" color="primary" />
                  ))
              )}
            </Box>
        );
      },
    },

    // New: job-groups column — sortable via custom comparator (joins array → string)
    {
      field: 'job_group_names',
      headerName: cfl(getString('jobGroups')) || 'Job Groups',
      width: 200,
      sortable: true,
      sortComparator: (v1: string[], v2: string[]) => {
        const a = (v1 ?? []).join(', ');
        const b = (v2 ?? []).join(', ');
        return a.localeCompare(b);
      },
      renderCell: (params: GridRenderCellParams<Job>) => {
        const row = params.row;
        const jobGroups: string[] = row.job_group_names ?? [];
        return (
            <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', py: 0.5, cursor: 'pointer' }}
                onClick={() => onJobGroupsClick(row)}
            >
              {jobGroups.length === 0 ? (
                  <Chip
                      label={getString('noJobGroups') || 'No job groups'}
                      size="small"
                      variant="outlined"
                      color="default"
                      icon={<WorkspacesIcon />}
                      onClick={() => onJobGroupsClick(row)}
                  />
              ) : (
                  jobGroups.map((g) => (
                      <Chip key={g} label={g} size="small" variant="outlined" color="secondary" />
                  ))
              )}
            </Box>
        );
      },
    },

    // New: process-role links column (short chip label, full name in tooltip)
    {
      field: 'process_role_links_info',
      headerName: cfl(getString('processRoles')) || 'Process Roles',
      width: 200,
      sortable: true,
      sortComparator: (v1: ProcessRoleLinkInfo[], v2: ProcessRoleLinkInfo[]) => {
        const a = (v1 ?? []).map((l) => l.short).join(', ');
        const b = (v2 ?? []).map((l) => l.short).join(', ');
        return a.localeCompare(b);
      },
      renderCell: (params: GridRenderCellParams<Job>) => {
        const row = params.row;
        const links: ProcessRoleLinkInfo[] = row.process_role_links_info ?? [];
        return (
            <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', py: 0.5, cursor: 'pointer' }}
                onClick={() => onProcessRoleClick(row)}
            >
              {links.length === 0 ? (
                  <Chip
                      label={getString('noProcessRoles') || 'No process roles'}
                      size="small"
                      variant="outlined"
                      color="default"
                      icon={<BadgeIcon />}
                      onClick={() => onProcessRoleClick(row)}
                  />
              ) : (
                  links.map((link) => {
                    const types = link.department_types ?? [];
                    const title = types.length > 0
                        ? `${link.full} → ${types.join(', ')}`
                        : `${link.full} — ${getString('noCoveredDepartmentTypes') || 'no covered department types'}`;
                    return (
                        <Tooltip key={link.full} title={title}>
                          <Chip
                              label={types.length > 0 ? `${link.short} (${types.length})` : link.short}
                              size="small"
                              variant="outlined"
                              color={types.length > 0 ? 'success' : 'warning'}
                          />
                        </Tooltip>
                    );
                  })
              )}
            </Box>
        );
      },
    },

    // New: recommended-trainings column (many-to-many, "by_job" link)
    // Only rendered when the training-module master switch is ON.
    ...(trainingModuleOn
      ? [
          {
            field: 'recommended_training_names' as const,
            headerName: cfl(getString('recommendedTrainings')) || 'Recommended Trainings',
            width: 240,
            sortable: true as const,
            sortComparator: (v1: string[], v2: string[]) => {
              const a = (v1 ?? []).join(', ');
              const b = (v2 ?? []).join(', ');
              return a.localeCompare(b);
            },
            renderCell: (params: GridRenderCellParams<Job>) => {
              const row = params.row;
              const names: string[] = row.recommended_training_names ?? [];
              return (
                  <Box
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', py: 0.5, cursor: 'pointer' }}
                      onClick={() => onTrainingTypesClick(row)}
                  >
                    {names.length === 0 ? (
                        <Chip
                            label={getString('noRecommendedTrainings') || 'No recommended trainings'}
                            size="small"
                            variant="outlined"
                            color="default"
                            icon={<SchoolIcon />}
                            onClick={() => onTrainingTypesClick(row)}
                        />
                    ) : (
                        names.map((n) => (
                            <Chip key={n} label={n} size="small" variant="outlined" color="secondary" />
                        ))
                    )}
                  </Box>
              );
            },
          } as GridColDef,
        ]
      : []),

    // New: department-types column (chip color reflects the link's is_active)
    {
      field: 'department_type_links',
      headerName: cfl(getString('departmentTypes')) || 'Department Types',
      width: 240,
      sortable: false,
      renderCell: (params: GridRenderCellParams<Job>) => {
        const row = params.row;
        const links = row.department_type_links ?? [];
        return (
            <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', py: 0.5 }}
            >
              {links.length === 0 ? (
                  <Chip
                      label={getString('noDepartmentTypes') || 'No department types'}
                      size="small"
                      variant="outlined"
                      color="default"
                      icon={<AccountTreeIcon />}
                  />
              ) : (
                  links.map((link, i) => (
                      <Chip
                          key={`${link.name}-${i}`}
                          label={link.name}
                          size="small"
                          variant={link.is_active ? 'filled' : 'outlined'}
                          color={link.is_active ? 'primary' : 'default'}
                      />
                  ))
              )}
            </Box>
        );
      },
    },

    // New: 1:1 job category — editable via a Select (manager/employee).
    // No "none" option: clearing per-row is intentionally not offered (mass
    // removal is a deliberate, confirm-gated action on the Job Categories tab).
    {
      field: 'job_category',
      headerName: cfl(getString('jobCategory')) || 'Category',
      width: 180,
      sortable: false,
      renderCell: (params: GridRenderCellParams<Job>) => {
        const row = params.row;
        // Only use the id as the Select value once its option is actually
        // loaded — otherwise MUI warns "out-of-range value" while categories
        // are still fetching (options momentarily empty).
        const hasOption =
            row.job_category_id != null &&
            categories.some((c) => c.id === row.job_category_id);
        return (
            <Select
                size="small"
                variant="outlined"
                value={hasOption ? String(row.job_category_id) : ''}
                displayEmpty
                disabled={setCategoryIsPending || !editMode}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) return;
                  onSetCategory(row, Number(val));
                }}
                renderValue={(val) => {
                  if (!val) {
                    return <em>{getString('noJobCategory') || '—'}</em>;
                  }
                  const cat = categories.find((c) => String(c.id) === val);
                  return cat ? (cfl(getString(snakeToCamel(cat.key))) || cat.key) : val;
                }}
                sx={{
                  minWidth: 150,
                  fontSize: '0.8125rem',
                  '& .MuiSelect-select': { py: 0.25, minHeight: 'unset' },
                }}
            >
              {categories.map((c) => (
                  <MenuItem key={c.id} value={String(c.id)}>
                    {cfl(getString(snakeToCamel(c.key))) || c.key}
                  </MenuItem>
              ))}
            </Select>
        );
      },
    },

    {
      field: 'is_active',
      headerName: cfl(getString('isActive')) || 'Active',
      width: 110,
      sortable: true,
      renderCell: (params: GridRenderCellParams<Job>) => {
        const row = params.row;
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <Switch
                  size="small"
                  checked={row.is_active}
                  onChange={() => onToggleActive(row)}
                  disabled={toggleIsPending || !editMode}
                  onClick={(e) => e.stopPropagation()}
              />
            </Box>
        );
      },
    },

    {
      field: 'created_at',
      headerName: cfl(getString('createdAt')) || 'Created',
      width: 160,
      renderCell: (params: GridRenderCellParams<Job>) =>
          formatToUkrDate(params.row.created_at),
    },

    {
      field: '_actions',
      headerName: '',
      width: recruitmentModuleOn ? 96 : 56,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params: GridRenderCellParams<Job>) => (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            {recruitmentModuleOn && (
                <Tooltip title={cfl(getString('jobRequirements')) || 'Job requirements'}>
                  <span>
                    <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRequirementsClick(params.row);
                        }}
                    >
                      <ChecklistIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
            )}
            <Tooltip title={getString('delete') || 'Delete'}>
            <span>
              <IconButton
                  size="small"
                  color="error"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteClick(params.row);
                  }}
                  disabled={deleteIsPending || !editMode}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </span>
            </Tooltip>
          </Box>
      ),
    },
  ];
}