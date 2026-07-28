// src/components/admin/planning_setup/plan_category_default/usePlanCategoryDefaultColumns.tsx
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';

import type { PlanCategoryDefault } from '../planningSetupApi.ts';
import cfl from '../../../../utils/helpers.ts';
import type { GetStringFn } from '../../../../types/getStringFn.ts';
import { formatToUkrDate } from '../../../../utils/dateFormatter.ts';
import { deleteActionCol } from '../../../../utils/columnBuilders';

interface Params {
    getString: GetStringFn;
    onDeleteClick: (row: PlanCategoryDefault) => void;
    deleteIsPending: boolean;
}

export function usePlanCategoryDefaultColumns({
    getString,
    onDeleteClick,
    deleteIsPending,
}: Params): GridColDef[] {
    return [
        {
            field: 'department_category',
            headerName: cfl(getString('departmentCategory')) || 'Department Category',
            flex: 1,
            minWidth: 220,
            sortable: false,
            renderCell: (params: GridRenderCellParams<PlanCategoryDefault>) =>
                params.row.department_category?.name ?? `#${params.row.department_category_id}`,
        },
        {
            field: 'created_at',
            headerName: cfl(getString('createdAt')) || 'Created',
            width: 150,
            renderCell: (params: GridRenderCellParams<PlanCategoryDefault>) =>
                formatToUkrDate(params.row.created_at),
        },
        deleteActionCol<PlanCategoryDefault>({ getString, onDeleteClick, deleteIsPending }),
    ];
}
